/**
 * Universal SMS Dispatcher & Formatter for CareerTrack
 * Supports Twilio REST dispatch with safe simulation fallback when credentials are not configured.
 */

export interface SendSmsOptions {
  to: string
  body: string
  from?: string
}

export interface SendSmsResult {
  success: boolean
  id?: string
  simulated?: boolean
  error?: string
}

export interface FormatJobMatchSmsOptions {
  candidateName?: string
  topMatch: {
    title: string
    company: string
    matchScore: number
  }
  totalMatchesCount?: number
  appUrl?: string
}

/**
 * Normalizes phone numbers to standard E.164-compatible format.
 * Strips whitespace, dashes, and parentheses. Ensures leading '+'.
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return ""
  const cleaned = phone.replace(/[^\d+]/g, "").trim()
  if (cleaned.startsWith("+")) {
    return cleaned
  }
  // If no country code provided and 10 or 11 digits, assume + or keep clean
  return `+${cleaned}`
}

/**
 * Truncates text cleanly within character limit to prevent multi-segment SMS billing.
 * Standard GSM-7 SMS single segment limit is 160 characters.
 */
export function truncateSmsBody(text: string, maxLen = 160): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen - 3) + "..."
}

/**
 * Formats a high-density, crisp SMS alert for top job matches.
 * Strictly guarantees <= 160 characters to fit in 1 standard SMS segment.
 */
export function formatJobMatchSms({
  topMatch,
  totalMatchesCount = 1,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://careertrack.ai",
}: FormatJobMatchSmsOptions): string {
  const matchPct = Math.round(topMatch.matchScore)
  const discoveryUrl = `${appUrl.replace(/\/$/, "")}/discovery`

  let msg = ""
  if (totalMatchesCount > 1) {
    msg = `CareerTrack: ${totalMatchesCount} new job matches! Top: ${matchPct}% ${topMatch.title} at ${topMatch.company}. View: ${discoveryUrl}`
  } else {
    msg = `CareerTrack: New ${matchPct}% match! ${topMatch.title} at ${topMatch.company}. View: ${discoveryUrl}`
  }

  return truncateSmsBody(msg, 160)
}

/**
 * Universal SMS sender supporting Twilio REST API with safe simulation fallback.
 */
export async function sendSms({
  to,
  body,
  from,
}: SendSmsOptions): Promise<SendSmsResult> {
  const normalizedTo = normalizePhoneNumber(to)
  if (!normalizedTo || normalizedTo.length < 8) {
    return {
      success: false,
      error: "Invalid recipient phone number",
    }
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const senderNumber = from || process.env.TWILIO_PHONE_NUMBER

  // Safe simulation fallback when unconfigured in local or staging
  if (!accountSid || !authToken || !senderNumber) {
    console.info(`[SMS Simulation] To: ${normalizedTo} | Body: ${body}`)
    return {
      success: true,
      simulated: true,
      id: `sim_sms_${Date.now()}`,
    }
  }

  try {
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
    const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString("base64")

    const params = new URLSearchParams()
    params.append("To", normalizedTo)
    params.append("From", senderNumber)
    params.append("Body", body)

    const response = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      const errorMsg = data?.message || `Twilio dispatch failed with HTTP ${response.status}`
      console.error("[SMS Dispatch Error]", errorMsg)
      return {
        success: false,
        error: errorMsg,
      }
    }

    return {
      success: true,
      id: data?.sid,
      simulated: false,
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to send SMS"
    console.error("[SMS Dispatch Exception]", err)
    return {
      success: false,
      error: errorMsg,
    }
  }
}
