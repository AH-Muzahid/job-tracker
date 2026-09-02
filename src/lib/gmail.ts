/* eslint-disable @typescript-eslint/no-explicit-any */
import { google } from "googleapis"
import { prisma, withDbRetry } from "@/lib/prisma"
import { encryptToken, decryptToken } from "@/lib/crypto"
import { getCachedJson, setCachedJson, invalidateCache } from "@/lib/redis"

export const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
]

/**
 * Returns an OAuth2 client configured with application credentials.
 */
export function getGoogleOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const redirectUri = `${appUrl.replace(/\/$/, "")}/api/auth/callback/google`

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

/**
 * Generates the Google OAuth 2.0 authorization URL for offline consent.
 */
export function generateGoogleAuthUrl(stateNonce: string): string {
  const oauth2Client = getGoogleOAuthClient()
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GMAIL_SCOPES,
    state: stateNonce,
  })
}

/**
 * Exchanges the authorization code for access & refresh tokens,
 * fetches user profile email, encrypts secrets, and saves to database.
 */
export async function exchangeGoogleAuthCode(code: string, userId: string) {
  const oauth2Client = getGoogleOAuthClient()
  const { tokens } = await oauth2Client.getToken(code)

  if (!tokens.access_token) {
    throw new Error("Failed to obtain Google access token")
  }

  oauth2Client.setCredentials(tokens)

  // Fetch the user's primary email from Google
  const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client })
  const userInfo = await oauth2.userinfo.get()
  const email = userInfo.data.email

  if (!email) {
    throw new Error("Could not retrieve email address from Google profile")
  }

  const encryptedAccessToken = encryptToken(tokens.access_token)
  const encryptedRefreshToken = tokens.refresh_token ? encryptToken(tokens.refresh_token) : undefined
  const expiresAt = new Date(tokens.expiry_date || Date.now() + 3600 * 1000)

  // Check if account already exists to preserve refresh token if Google didn't return a new one
  const existing = await withDbRetry(() =>
    prisma.connectedAccount.findUnique({
      where: { userId },
    })
  )

  const finalRefreshToken = encryptedRefreshToken || existing?.refreshToken

  if (!finalRefreshToken) {
    throw new Error("No refresh token available. Please revoke permissions and reconnect with full consent.")
  }

  await withDbRetry(() =>
    prisma.connectedAccount.upsert({
      where: { userId },
      create: {
        userId,
        provider: "google",
        email,
        accessToken: encryptedAccessToken,
        refreshToken: finalRefreshToken,
        expiresAt,
      },
      update: {
        provider: "google",
        email,
        accessToken: encryptedAccessToken,
        refreshToken: finalRefreshToken,
        expiresAt,
        updatedAt: new Date(),
      },
    })
  )

  // Clear Redis cache
  await invalidateCache(`account:connected:${userId}`)

  return { email }
}

/**
 * Retrieves an authenticated and auto-refreshed Gmail client for the given user.
 */
export async function getAuthenticatedGmailClient(userId: string) {
  const account = await withDbRetry(() =>
    prisma.connectedAccount.findUnique({
      where: { userId },
    })
  )

  if (!account || account.provider !== "google") {
    return null
  }

  const oauth2Client = getGoogleOAuthClient()
  const decryptedAccessToken = decryptToken(account.accessToken)
  const decryptedRefreshToken = decryptToken(account.refreshToken)

  oauth2Client.setCredentials({
    access_token: decryptedAccessToken,
    refresh_token: decryptedRefreshToken,
    expiry_date: account.expiresAt.getTime(),
  })

  // If token is expired or within 5 minutes of expiring, refresh it
  const isExpiringSoon = account.expiresAt.getTime() - Date.now() < 5 * 60 * 1000

  if (isExpiringSoon && decryptedRefreshToken) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken()
      if (credentials.access_token) {
        const newEncryptedAccess = encryptToken(credentials.access_token)
        const newExpiresAt = new Date(credentials.expiry_date || Date.now() + 3600 * 1000)

        await withDbRetry(() =>
          prisma.connectedAccount.update({
            where: { userId },
            data: {
              accessToken: newEncryptedAccess,
              expiresAt: newExpiresAt,
              updatedAt: new Date(),
            },
          })
        )

        oauth2Client.setCredentials(credentials)
      }
    } catch (refreshErr) {
      console.warn(`[Gmail Token Refresh Warning for User ${userId}]:`, refreshErr)
    }
  }

  const gmail = google.gmail({ version: "v1", auth: oauth2Client })
  return { gmail, email: account.email }
}

/**
 * Encodes a MIME RFC 2822 email payload in URL-safe Base64 format.
 */
function createMimeMessage({
  to,
  from,
  subject,
  html,
  inReplyTo,
  references,
}: {
  to: string
  from: string
  subject: string
  html: string
  inReplyTo?: string
  references?: string
}): string {
  const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString("base64")}?=`
  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${utf8Subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=utf-8",
    "Content-Transfer-Encoding: 7bit",
  ]

  if (inReplyTo) headers.push(`In-Reply-To: ${inReplyTo}`)
  if (references) headers.push(`References: ${references}`)

  const message = `${headers.join("\r\n")}\r\n\r\n${html}`

  return Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

/**
 * Dispatches an email directly from the user's personal Gmail account.
 * Appears in their personal Sent folder and handles true sender identity.
 */
export async function sendGmailMessage(
  userId: string,
  options: {
    to: string
    subject: string
    html: string
    threadId?: string
    inReplyTo?: string
    references?: string
  }
): Promise<{ success: boolean; messageId?: string; threadId?: string; from?: string; error?: string }> {
  try {
    const authData = await getAuthenticatedGmailClient(userId)
    if (!authData) {
      return { success: false, error: "Google account not connected" }
    }

    const { gmail, email } = authData
    const raw = createMimeMessage({
      to: options.to,
      from: email,
      subject: options.subject,
      html: options.html,
      inReplyTo: options.inReplyTo,
      references: options.references,
    })

    const res = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw,
        threadId: options.threadId,
      },
    })

    return {
      success: true,
      messageId: res.data.id || undefined,
      threadId: res.data.threadId || undefined,
      from: email,
    }
  } catch (err: any) {
    const errorMsg = err?.message || "Failed to send message via Gmail API"
    console.error(`[Gmail Dispatch Exception for User ${userId}]:`, err)
    return { success: false, error: errorMsg }
  }
}

/**
 * Checks connection status of user's Google Account.
 */
export async function getConnectedGoogleAccount(userId: string): Promise<{
  connected: boolean
  email?: string
  provider?: string
  expiresAt?: Date
}> {
  if (!userId) return { connected: false }

  const cacheKey = `account:connected:${userId}`
  const cached = await getCachedJson<{ email: string; provider: string; expiresAt: string }>(cacheKey)

  if (cached) {
    return {
      connected: true,
      email: cached.email,
      provider: cached.provider,
      expiresAt: new Date(cached.expiresAt),
    }
  }

  const account = await withDbRetry(() =>
    prisma.connectedAccount.findUnique({
      where: { userId },
      select: { email: true, provider: true, expiresAt: true },
    })
  )

  if (!account) {
    return { connected: false }
  }

  void setCachedJson(
    cacheKey,
    {
      email: account.email,
      provider: account.provider,
      expiresAt: account.expiresAt.toISOString(),
    },
    3600
  )

  return {
    connected: true,
    email: account.email,
    provider: account.provider,
    expiresAt: account.expiresAt,
  }
}

/**
 * Disconnects the user's Google Account and removes cached credentials.
 */
export async function disconnectGoogleAccount(userId: string): Promise<{ success: boolean }> {
  if (!userId) return { success: false }

  await withDbRetry(() =>
    prisma.connectedAccount.deleteMany({
      where: { userId, provider: "google" },
    })
  )

  await invalidateCache(`account:connected:${userId}`)
  return { success: true }
}
