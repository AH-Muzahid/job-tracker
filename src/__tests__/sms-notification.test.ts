import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  normalizePhoneNumber,
  formatBdPhoneNumber,
  truncateSmsBody,
  formatJobMatchSms,
  sendSms,
} from "@/lib/sms"

describe("SMS Notification Utility (src/lib/sms.ts)", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    delete process.env.BULKSMSBD_API_KEY
    delete process.env.BULKSMSBD_SENDER_ID
    delete process.env.BULKSMS_API_KEY
    delete process.env.BULKSMS_SENDER_ID
    delete process.env.TWILIO_ACCOUNT_SID
    delete process.env.TWILIO_AUTH_TOKEN
    delete process.env.TWILIO_PHONE_NUMBER
    delete process.env.MIM_SMS_API_KEY
    delete process.env.MIM_SMS_USER_NAME
    delete process.env.MIM_SMS_SENDER_NAME
    delete process.env.MIM_SMS_SENDER_ID
  })

  describe("normalizePhoneNumber", () => {
    it("handles numbers with spaces, dashes, and parentheses", () => {
      expect(normalizePhoneNumber("+1 (555) 234-5678")).toBe("+15552345678")
      expect(normalizePhoneNumber("+880 1711-223344")).toBe("+8801711223344")
    })

    it("adds leading '+' if missing", () => {
      expect(normalizePhoneNumber("8801711223344")).toBe("+8801711223344")
      expect(normalizePhoneNumber("15552345678")).toBe("+15552345678")
    })

    it("returns empty string on empty input", () => {
      expect(normalizePhoneNumber("")).toBe("")
    })
  })

  describe("formatBdPhoneNumber", () => {
    it("normalizes Bangladeshi 11-digit numbers to standard 13-digit format", () => {
      expect(formatBdPhoneNumber("01711223344")).toBe("8801711223344")
      expect(formatBdPhoneNumber("+880 1711-223344")).toBe("8801711223344")
      expect(formatBdPhoneNumber("8801711223344")).toBe("8801711223344")
    })

    it("handles 10-digit without leading 0", () => {
      expect(formatBdPhoneNumber("1711223344")).toBe("8801711223344")
    })

    it("returns empty string for empty input", () => {
      expect(formatBdPhoneNumber("")).toBe("")
    })
  })

  describe("truncateSmsBody", () => {
    it("does not truncate if under max length", () => {
      const short = "Hello from CareerTrack"
      expect(truncateSmsBody(short, 160)).toBe(short)
    })

    it("truncates with ellipsis when exceeding limit", () => {
      const longText = "a".repeat(200)
      const truncated = truncateSmsBody(longText, 160)
      expect(truncated.length).toBe(160)
      expect(truncated.endsWith("...")).toBe(true)
    })
  })

  describe("formatJobMatchSms", () => {
    it("formats message for single job match within 160 chars", () => {
      const msg = formatJobMatchSms({
        topMatch: {
          title: "Senior Fullstack Engineer",
          company: "Linear",
          matchScore: 94.2,
        },
        totalMatchesCount: 1,
        appUrl: "https://careertrack.ai",
      })

      expect(msg).toContain("CareerTrack: New 94% match!")
      expect(msg).toContain("Senior Fullstack Engineer at Linear")
      expect(msg).toContain("https://careertrack.ai/discovery")
      expect(msg.length).toBeLessThanOrEqual(160)
    })

    it("formats message for multiple job matches within 160 chars", () => {
      const msg = formatJobMatchSms({
        topMatch: {
          title: "Staff Software Engineer, Platform Infrastructure",
          company: "Acme Super Systems Corporation",
          matchScore: 89,
        },
        totalMatchesCount: 4,
        appUrl: "https://careertrack.ai",
      })

      expect(msg).toContain("CareerTrack: 4 new job matches!")
      expect(msg).toContain("89%")
      expect(msg.length).toBeLessThanOrEqual(160)
    })

    it("falls back to career-track-nine.vercel.app when appUrl is omitted", () => {
      const msg = formatJobMatchSms({
        topMatch: {
          title: "Fullstack Developer",
          company: "TechCorp",
          matchScore: 92,
        },
      })

      expect(msg).toContain("https://career-track-nine.vercel.app/discovery")
    })
  })

  describe("sendSms (Universal Sender with BulkSMSBD, MiMSMS, and Twilio)", () => {
    it("returns simulated success when no provider is configured in dev/test", async () => {
      const result = await sendSms({
        to: "+8801711223344",
        body: "CareerTrack test notification",
      })

      expect(result.success).toBe(true)
      expect(result.simulated).toBe(true)
      expect(result.provider).toBe("simulation")
      expect(result.id).toMatch(/^sim_sms_/)
    })

    it("fails early with descriptive error when phone number is invalid", async () => {
      const result = await sendSms({
        to: "123", // too short
        body: "CareerTrack test notification",
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe("Invalid recipient phone number")
    })

    it("dispatches HTTP request to BulkSMSBD when BULKSMSBD credentials are provided", async () => {
      process.env.BULKSMSBD_API_KEY = "bulk_api_key_test_123"
      process.env.BULKSMSBD_SENDER_ID = "8809617000000"

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          response_code: 202,
          success_message: "SMS Submitted Successfully",
          message_id: 887766,
        }),
      })
      vi.stubGlobal("fetch", fetchMock)

      const result = await sendSms({
        to: "01711223344",
        body: "CareerTrack: 1 new job match found!",
      })

      expect(fetchMock).toHaveBeenCalledOnce()
      const [url, options] = fetchMock.mock.calls[0]
      expect(url).toContain("bulksmsbd.net/api/smsapi")
      expect(options.method).toBe("POST")
      const params = new URLSearchParams(options.body)
      expect(params.get("api_key")).toBe("bulk_api_key_test_123")
      expect(params.get("senderid")).toBe("8809617000000")
      expect(params.get("number")).toBe("8801711223344")
      expect(params.get("type")).toBe("text")
      expect(params.get("message")).toBe("CareerTrack: 1 new job match found!")
      expect(result.success).toBe(true)
      expect(result.provider).toBe("bulksmsbd")
      expect(result.id).toBe("887766")
    })

    it("handles BulkSMSBD errors gracefully", async () => {
      process.env.BULKSMSBD_API_KEY = "bulk_api_key_test_123"

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          response_code: 1007,
          error_message: "Balance insufficient",
        }),
      })
      vi.stubGlobal("fetch", fetchMock)

      const result = await sendSms({
        to: "01711223344",
        body: "CareerTrack test",
      })

      expect(result.success).toBe(false)
      expect(result.provider).toBe("bulksmsbd")
      expect(result.error).toBe("Balance insufficient")
    })

    it("dispatches HTTP request to MiMSMS API V2 when MIM_SMS credentials are provided", async () => {
      process.env.MIM_SMS_API_KEY = "mim_test_key_123"
      process.env.MIM_SMS_USER_NAME = "developer@careertrack.ai"
      process.env.MIM_SMS_SENDER_NAME = "CareerTrack"

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ statusCode: "200", status: "Success", trxnId: "MIM_TX_98765" }),
      })
      vi.stubGlobal("fetch", fetchMock)

      const result = await sendSms({
        to: "01711223344",
        body: "CareerTrack: 1 new job match found!",
      })

      expect(fetchMock).toHaveBeenCalledOnce()
      const [url, options] = fetchMock.mock.calls[0]
      expect(url).toBe("https://api.mimsms.com/api/V2/SMS")
      expect(options.method).toBe("POST")
      const parsedBody = JSON.parse(options.body)
      expect(parsedBody.apiKey).toBe("mim_test_key_123")
      expect(parsedBody.userName).toBe("developer@careertrack.ai")
      expect(parsedBody.senderName).toBe("CareerTrack")
      expect(parsedBody.mobileNumber).toBe("8801711223344")
      expect(parsedBody.transactionType).toBe("T")
      expect(result.success).toBe(true)
      expect(result.provider).toBe("mimsms")
      expect(result.id).toBe("MIM_TX_98765")
    })

    it("dispatches HTTP request to Twilio API when Twilio credentials are provided", async () => {
      process.env.TWILIO_ACCOUNT_SID = "ACmock123"
      process.env.TWILIO_AUTH_TOKEN = "mockauth456"
      process.env.TWILIO_PHONE_NUMBER = "+15550001111"

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ sid: "SM_test_sid_789" }),
      })
      vi.stubGlobal("fetch", fetchMock)

      const result = await sendSms({
        to: "+15559876543",
        body: "CareerTrack Twilio live test",
      })

      expect(fetchMock).toHaveBeenCalledOnce()
      const [url, options] = fetchMock.mock.calls[0]
      expect(url).toBe("https://api.twilio.com/2010-04-01/Accounts/ACmock123/Messages.json")
      expect(options.method).toBe("POST")
      expect(result.success).toBe(true)
      expect(result.provider).toBe("twilio")
      expect(result.id).toBe("SM_test_sid_789")
      expect(result.simulated).toBe(false)
    })
  })
})
