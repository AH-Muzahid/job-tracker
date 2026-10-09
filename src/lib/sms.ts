/**
 * Universal SMS Dispatcher & Formatter for CareerTrack
 * Supports MiMSMS (Bangladesh Local Gateway API V2) and Twilio with safe simulation fallback.
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
  provider?: "mimsms" | "twilio" | "simulation"
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
 * Normalizes phone numbers to standard E.164 format.
 * Strips whitespace, dashes, and parentheses. Ensures leading '+'.
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return ""
  const cleaned = phone.replace(/[^\d+]/g, "").trim()
  if (cleaned.startsWith("+")) {
    return cleaned
  }
  return `+${cleaned}`
}

/**
 * Normalizes Bangladeshi mobile numbers into the standard 13-digit format (8801XXXXXXXXX)
 * expected by Bangladeshi telecom SMS gateways like MiMSMS.
 */
export function formatBdPhoneNumber(phone: string): string {
  if (!phone) return ""
  const digits = phone.replace(/\D/g, "").trim()
  if (digits.startsWith("880") && digits.length === 13) {
    return digits
  }
  if (digits.startsWith("01") && digits.length === 11) {
    return `88${digits}`
  }
  if (digits.startsWith("1") && digits.length === 10) {
    return `880${digits}`
  }
  return digits
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
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://career-track-nine.vercel.app",
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
 * Universal SMS sender:
 * 1. Dispatches via MiMSMS API V2 if MIM_SMS_API_KEY is configured.
 * 2. Dispatches via Twilio if TWILIO_ACCOUNT_SID & TWILIO_AUTH_TOKEN are configured.
 * 3. Falls back to safe simulation mode for local development or testing.
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

  // 1. Check for MiMSMS (Bangladesh Local Gateway API V2)
  const mimApiKey = process.env.MIM_SMS_API_KEY
  const mimUserName = process.env.MIM_SMS_USER_NAME
  const mimSenderName = from || process.env.MIM_SMS_SENDER_NAME || process.env.MIM_SMS_SENDER_ID

  if (mimApiKey && mimUserName && mimSenderName) {
    try {
      const bdPhone = formatBdPhoneNumber(to)
      const payload = {
        apiKey: mimApiKey,
        userName: mimUserName,
        senderName: mimSenderName,
        transactionType: process.env.MIM_SMS_TRANSACTION_TYPE || "T", // "T" for Transactional/Alerts
        mobileNumber: bdPhone,
        message: body,
      }

      const response = await fetch("https://api.mimsms.com/api/V2/SMS", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok || (data?.statusCode && data.statusCode !== "200" && data.statusCode !== 200)) {
        const errorMsg = data?.message || data?.status || `MiMSMS error with HTTP ${response.status}`
        console.error("[MiMSMS Dispatch Error]", errorMsg)
        return {
          success: false,
          error: errorMsg,
          provider: "mimsms",
        }
      }

      return {
        success: true,
        id: data?.trxnId || data?.messageId || `mim_${Date.now()}`,
        simulated: false,
        provider: "mimsms",
      }
    } catch (mimErr: unknown) {
      const errorMsg = mimErr instanceof Error ? mimErr.message : "Failed to dispatch via MiMSMS"
      console.error("[MiMSMS Exception]", mimErr)
      return {
        success: false,
        error: errorMsg,
        provider: "mimsms",
      }
    }
  }

  // 2. Check for Twilio
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const senderNumber = from || process.env.TWILIO_PHONE_NUMBER

  if (accountSid && authToken && senderNumber) {
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
        console.error("[Twilio Dispatch Error]", errorMsg)
        return {
          success: false,
          error: errorMsg,
          provider: "twilio",
        }
      }

      return {
        success: true,
        id: data?.sid,
        simulated: false,
        provider: "twilio",
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to send SMS via Twilio"
      console.error("[Twilio Exception]", err)
      return {
        success: false,
        error: errorMsg,
        provider: "twilio",
      }
    }
  }

  // 3. Safe Simulation fallback when no external provider is configured
  console.info(`[SMS Simulation] To: ${normalizedTo} | Body: ${body}`)
  return {
    success: true,
    simulated: true,
    id: `sim_sms_${Date.now()}`,
    provider: "simulation",
  }
}
