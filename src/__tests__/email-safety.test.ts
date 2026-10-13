import { afterEach, describe, expect, it, vi } from "vitest"
import { emailHtmlToText, formatDailyOpportunityDigestHtml, formatInterviewReminderHtml, formatOutreachEmailHtml, resolveBriefingContent, safeEmailUrl, sendEmail } from "@/lib/email"
import { PLANNING_ERROR_FALLBACK } from "@/lib/ai/graph/constants"

const provider = vi.hoisted(() => ({ send: vi.fn() }))
vi.mock("resend", () => ({ Resend: class { emails = provider } }))
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks() })

describe("email delivery safety", () => {
  it("does not claim delivery in unconfigured production", async () => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("RESEND_API_KEY", "")
    expect(await sendEmail({ to: "user@example.com", subject: "Briefing", html: "<p>Hello</p>" })).toMatchObject({ success: false })
  })
  it.each(["bad address", "user@example.com\r\nBcc: other@example.com"])("rejects invalid recipient %s", async (to) => {
    expect(await sendEmail({ to, subject: "Briefing", html: "<p>Hello</p>" })).toMatchObject({ success: false })
    expect(provider.send).not.toHaveBeenCalled()
  })
  it("passes stable idempotency keys and readable plain text to Resend", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key")
    provider.send.mockResolvedValue({ data: { id: "message-1" }, error: null })
    expect(await sendEmail({ to: "user@example.com", subject: "Briefing", html: '<p>Hello</p><p><a href="https://example.com">Review</a></p>', idempotencyKey: "daily/1" })).toMatchObject({ success: true, id: "message-1" })
    expect(provider.send).toHaveBeenCalledWith(expect.objectContaining({ text: expect.stringContaining("Review (https://example.com)") }), { idempotencyKey: "daily/1" })
  })
  it.each([{ data: null, error: { message: "Rejected" } }, { data: null, error: null }])("does not claim success without provider acceptance", async (response) => {
    vi.stubEnv("RESEND_API_KEY", "test-key"); provider.send.mockResolvedValue(response)
    expect(await sendEmail({ to: "user@example.com", subject: "Briefing", html: "<p>Hello</p>" })).toMatchObject({ success: false })
  })
})

describe("candidate email content", () => {
  it.each([PLANNING_ERROR_FALLBACK, "", "AI provider not configured for user.", "Headless evaluation encountered an error: secret", "Evaluation completed successfully."])("uses factual fallback instead of diagnostic: %s", (content) => {
    expect(resolveBriefingContent({ success: true, content }, "Review your applications.")).toBe("Review your applications.")
  })
  it("preserves valid briefings and rejects failed evaluations", () => {
    expect(resolveBriefingContent({ success: true, content: "Review Stripe." }, "Fallback")).toBe("Review Stripe.")
    expect(resolveBriefingContent({ success: false, content: "private error" }, "Fallback")).toBe("Fallback")
  })
  it.each(["javascript:alert(1)", 'https://example.com/"onclick="alert(1)', "https://user:password@example.com", "data:text/html,test"])("rejects unsafe links: %s", (url) => expect(safeEmailUrl(url)).toBeUndefined())
  it("escapes all external digest fields and removes fake salary", () => {
    const html = formatDailyOpportunityDigestHtml({ candidateName: '<img src=x onerror="bad">', briefingText: PLANNING_ERROR_FALLBACK,
      opportunities: [{ id: "1", company: "<script>bad</script>", title: "<b>Engineer</b>", location: "<svg>", salary: "Range", employmentType: "<img>", matchScore: 99, url: "javascript:bad" }],
    })
    const doc = new DOMParser().parseFromString(html, "text/html")
    expect(doc.querySelector("script, img, svg")).toBeNull()
    expect(html).not.toContain(PLANNING_ERROR_FALLBACK)
    expect(html).not.toContain("javascript:")
    expect(doc.body.textContent).not.toContain("Range")
    expect(html).toContain("prefers-color-scheme: dark")
    expect(html).toContain("max-width: 480px")
  })
  it("escapes outreach metadata", () => {
    const html = formatOutreachEmailHtml({ bodyText: "Hello", candidateName: "<img>", companyName: "<script>", jobTitle: "</title><script>" })
    expect(new DOMParser().parseFromString(html, "text/html").querySelector("script,img")).toBeNull()
  })
  it("renders interview times in explicit Bangladesh time and strips malicious meeting links", () => {
    const html = formatInterviewReminderHtml({ companyName: "<img>", jobTitle: "Engineer", interviewNotes: "<script>bad</script>", interviewDate: "2026-10-13T08:00:00Z", reminderType: "2h", applicationId: "app-1", interviewMeetingUrl: "javascript:bad" })
    expect(html).toContain("02:00 PM")
    expect(html).not.toContain("javascript:")
    expect(new DOMParser().parseFromString(html, "text/html").querySelector("script,img")).toBeNull()
    expect(() => formatInterviewReminderHtml({ companyName: "X", jobTitle: "X", interviewDate: "bad", reminderType: "24h", applicationId: "1" })).toThrow("Invalid interview date")
  })
  it("does not leak CSS into the plain-text body", () => {
    expect(emailHtmlToText('<head><style>body {color:red}</style></head><p>First &amp; second</p><p>Next</p>')).toBe("First & second\nNext")
  })
})
