/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { prisma } from "@/lib/prisma"
import * as cryptoHelper from "@/lib/crypto"
import { executeSendOutreachEmail } from "@/lib/ai/graph/tools/email-tools"

const mockGetToken = vi.fn()
const mockGenerateAuthUrl = vi.fn()
const mockSetCredentials = vi.fn()
const mockRefreshAccessToken = vi.fn()
const mockMessagesSend = vi.fn()
const mockUserInfoGet = vi.fn()

vi.mock("googleapis", () => {
  class MockOAuth2 {
    generateAuthUrl = mockGenerateAuthUrl
    getToken = mockGetToken
    setCredentials = mockSetCredentials
    refreshAccessToken = mockRefreshAccessToken
  }

  return {
    google: {
      auth: {
        OAuth2: MockOAuth2,
      },
      oauth2: vi.fn().mockImplementation(() => ({
        userinfo: {
          get: mockUserInfoGet,
        },
      })),
      gmail: vi.fn().mockImplementation(() => ({
        users: {
          messages: {
            send: mockMessagesSend,
          },
        },
      })),
    },
  }
})

vi.mock("@/lib/prisma", () => ({
  prisma: {
    connectedAccount: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
  withDbRetry: vi.fn((fn) => fn()),
}))

const mockRedisGet = vi.fn()
const mockRedisSet = vi.fn()
const mockRedisDel = vi.fn()
vi.mock("@/lib/redis", () => ({
  getCachedJson: (...args: any[]) => mockRedisGet(...args),
  setCachedJson: (...args: any[]) => mockRedisSet(...args),
  invalidateCache: (...args: any[]) => mockRedisDel(...args),
}))

import {
  generateGoogleAuthUrl,
  exchangeGoogleAuthCode,
  getAuthenticatedGmailClient,
  sendGmailMessage,
  getConnectedGoogleAccount,
  disconnectGoogleAccount,
} from "@/lib/gmail"

describe("Google OAuth & Gmail Integration Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("OAuth URL & Code Exchange", () => {
    it("generates consent URL with offline access and required scopes", () => {
      mockGenerateAuthUrl.mockReturnValueOnce("https://accounts.google.com/o/oauth2/v2/auth?scope=...")
      const url = generateGoogleAuthUrl("state-123")

      expect(mockGenerateAuthUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          access_type: "offline",
          prompt: "consent",
          state: "state-123",
          scope: expect.arrayContaining([
            "https://www.googleapis.com/auth/gmail.send",
            "https://www.googleapis.com/auth/gmail.readonly",
          ]),
        })
      )
      expect(url).toContain("https://accounts.google.com")
    })

    it("exchanges code, encrypts tokens, and upserts connected account in DB", async () => {
      mockGetToken.mockResolvedValueOnce({
        tokens: {
          access_token: "mock-access-token",
          refresh_token: "mock-refresh-token",
          expiry_date: Date.now() + 3600 * 1000,
        },
      })

      mockUserInfoGet.mockResolvedValueOnce({
        data: { email: "applicant@gmail.com" },
      })

      vi.mocked(prisma.connectedAccount.findUnique).mockResolvedValueOnce(null)
      vi.mocked(prisma.connectedAccount.upsert).mockResolvedValueOnce({} as any)

      const result = await exchangeGoogleAuthCode("auth-code-xyz", "user-456")

      expect(result.email).toBe("applicant@gmail.com")
      expect(prisma.connectedAccount.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "user-456" },
          create: expect.objectContaining({
            userId: "user-456",
            provider: "google",
            email: "applicant@gmail.com",
            accessToken: expect.any(String),
            refreshToken: expect.any(String),
          }),
        })
      )
      expect(mockRedisDel).toHaveBeenCalledWith("account:connected:user-456")
    })
  })

  describe("Token Auto-Refresh & Gmail Client Retrieval", () => {
    it("retrieves authenticated client and refreshes token when close to expiry", async () => {
      const encryptedAccess = cryptoHelper.encryptToken("old-access-token")
      const encryptedRefresh = cryptoHelper.encryptToken("valid-refresh-token")

      // Account expires in 2 minutes (< 5 min threshold)
      vi.mocked(prisma.connectedAccount.findUnique).mockResolvedValueOnce({
        id: "conn-1",
        userId: "user-456",
        provider: "google",
        email: "applicant@gmail.com",
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        expiresAt: new Date(Date.now() + 2 * 60 * 1000),
      } as any)

      mockRefreshAccessToken.mockResolvedValueOnce({
        credentials: {
          access_token: "refreshed-access-token",
          expiry_date: Date.now() + 3600 * 1000,
        },
      })

      const clientData = await getAuthenticatedGmailClient("user-456")

      expect(clientData).toBeDefined()
      expect(clientData?.email).toBe("applicant@gmail.com")
      expect(mockRefreshAccessToken).toHaveBeenCalled()
      expect(prisma.connectedAccount.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "user-456" },
          data: expect.objectContaining({
            accessToken: expect.any(String),
          }),
        })
      )
    })
  })

  describe("Direct Personal Email Sending", () => {
    it("formats MIME RFC 2822 payload and dispatches via Gmail messages.send", async () => {
      const encryptedAccess = cryptoHelper.encryptToken("valid-access")
      const encryptedRefresh = cryptoHelper.encryptToken("valid-refresh")

      vi.mocked(prisma.connectedAccount.findUnique).mockResolvedValueOnce({
        id: "conn-1",
        userId: "user-456",
        provider: "google",
        email: "applicant@gmail.com",
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      } as any)

      mockMessagesSend.mockResolvedValueOnce({
        data: {
          id: "gmail-msg-999",
          threadId: "gmail-thread-888",
        },
      })

      const sendResult = await sendGmailMessage("user-456", {
        to: "recruiter@stripe.com",
        subject: "Application for Staff Engineer",
        html: "<p>Hello, please find my application attached.</p>",
      })

      expect(sendResult.success).toBe(true)
      expect(sendResult.messageId).toBe("gmail-msg-999")
      expect(sendResult.threadId).toBe("gmail-thread-888")
      expect(sendResult.from).toBe("applicant@gmail.com")
      expect(mockMessagesSend).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "me",
          requestBody: expect.objectContaining({
            raw: expect.any(String),
          }),
        })
      )
    })
  })

  describe("Integration with AI Email Tools", () => {
    it("routes through user's connected Gmail when account exists", async () => {
      mockRedisGet.mockResolvedValueOnce({
        email: "personal@gmail.com",
        provider: "google",
        expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      })

      const encryptedAccess = cryptoHelper.encryptToken("valid-access")
      const encryptedRefresh = cryptoHelper.encryptToken("valid-refresh")

      vi.mocked(prisma.connectedAccount.findUnique).mockResolvedValueOnce({
        id: "conn-1",
        userId: "user-456",
        provider: "google",
        email: "personal@gmail.com",
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      } as any)

      mockMessagesSend.mockResolvedValueOnce({
        data: { id: "gmail-msg-101", threadId: "gmail-thread-101" },
      })

      const toolResult = await executeSendOutreachEmail("user-456", {
        toEmail: "hiring@anthropic.com",
        subject: "Research Engineer Introduction",
        bodyText: "I am writing to express my interest in the Research Engineer role.",
      })

      expect(toolResult.success).toBe(true)
      expect(toolResult.provider).toBe("gmail")
      expect(toolResult.senderEmail).toBe("personal@gmail.com")
      expect(toolResult.message).toContain("sent directly from your Gmail")
    })

    it("falls back to transactional email when no Google account is connected", async () => {
      mockRedisGet.mockResolvedValueOnce(null)
      vi.mocked(prisma.connectedAccount.findUnique).mockResolvedValueOnce(null)

      const toolResult = await executeSendOutreachEmail("user-unconnected", {
        toEmail: "recruiter@openai.com",
        subject: "Software Engineer Application",
        bodyText: "Hi, I would love to connect about the engineering opening.",
      })

      expect(toolResult.success).toBe(true)
      expect(toolResult.provider).toBe("resend")
      expect(toolResult.message).toContain("successfully sent to recruiter@openai.com")
    })
  })

  describe("Account Disconnect", () => {
    it("deletes connected account and invalidates cache", async () => {
      vi.mocked(prisma.connectedAccount.deleteMany).mockResolvedValueOnce({ count: 1 } as any)

      const result = await disconnectGoogleAccount("user-456")

      expect(result.success).toBe(true)
      expect(prisma.connectedAccount.deleteMany).toHaveBeenCalledWith({
        where: { userId: "user-456", provider: "google" },
      })
      expect(mockRedisDel).toHaveBeenCalledWith("account:connected:user-456")
    })
  })
})
