import { describe, it, expect } from "vitest"
import { formatOutreachEmailHtml, sendEmail } from "@/lib/email"
import { inngest } from "@/inngest/client"
import { dailyJobHuntFunction } from "@/inngest/functions/daily-job-hunt"
import { weeklyGoalDigestFunction } from "@/inngest/functions/weekly-goal-digest"

describe("Email System", () => {
  it("formats outreach email HTML correctly", () => {
    const html = formatOutreachEmailHtml({
      candidateName: "Alex Doe",
      companyName: "Acme Corp",
      jobTitle: "Software Engineer",
      bodyText: "I am interested in your open role.\nHere is my background.",
    })

    expect(html).toContain("Acme Corp")
    expect(html).toContain("Software Engineer")
    expect(html).toContain("Alex Doe")
    expect(html).toContain("<p")
    expect(html).toContain("I am interested in your open role.")
  })

  it("simulates email delivery safely when no RESEND_API_KEY is configured", async () => {
    delete process.env.RESEND_API_KEY

    const result = await sendEmail({
      to: "recruiter@example.com",
      subject: "Application for Frontend Engineer",
      html: "<p>Hello</p>",
    })

    expect(result.success).toBe(true)
    expect(result.simulated).toBe(true)
    expect(result.id).toBeDefined()
  })
})

describe("Inngest Autonomous Functions", () => {
  it("initializes Inngest client with correct ID", () => {
    expect(inngest.id).toBe("career-track-agent")
  })

  it("registers daily job hunt background function", () => {
    expect(dailyJobHuntFunction.id()).toBe("daily-job-hunt-agent")
  })

  it("registers weekly goal digest background function", () => {
    expect(weeklyGoalDigestFunction.id()).toBe("weekly-goal-digest-agent")
  })
})
