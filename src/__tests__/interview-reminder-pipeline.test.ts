import { describe, it, expect, vi } from "vitest"
import { formatInterviewReminderHtml } from "@/lib/email"
import { interviewReminderPipeline } from "@/inngest/functions/interview-reminder-pipeline"

describe("INT-16: Inngest Cron Pipeline for 24h/2h Pre-Interview Briefing & Reminders", () => {
  it("formats 24-hour interview reminder email correctly with mock prep room link", () => {
    const html = formatInterviewReminderHtml({
      candidateName: "Alex Mercer",
      companyName: "Vercel",
      jobTitle: "Senior Next.js Infrastructure Engineer",
      interviewRound: "System Design",
      interviewDate: new Date("2026-09-25T14:00:00.000Z"),
      interviewMeetingUrl: "https://meet.google.com/abc-defg-hij",
      interviewNotes: "Review Edge Middleware runtime and RSC streaming caching.",
      reminderType: "24h",
      applicationId: "app-vercel-1",
      appUrl: "https://careertrack.ai",
    })

    expect(html).toContain("PREPARATION BRIEFING: 24 HOURS OUT")
    expect(html).toContain("Vercel")
    expect(html).toContain("Senior Next.js Infrastructure Engineer")
    expect(html).toContain("System Design")
    expect(html).toContain("https://careertrack.ai/interview-prep?appId=app-vercel-1&company=Vercel&role=Senior%20Next.js%20Infrastructure%20Engineer")
    expect(html).toContain("https://meet.google.com/abc-defg-hij")
    expect(html).toContain("Review Edge Middleware runtime")
  })

  it("formats 2-hour interview alert email with urgent badge and meeting link", () => {
    const html = formatInterviewReminderHtml({
      candidateName: "Sarah Chen",
      companyName: "Stripe",
      jobTitle: "Staff Backend Engineer",
      interviewRound: "Technical / Live Coding",
      interviewDate: new Date("2026-09-21T18:00:00.000Z"),
      interviewMeetingUrl: "https://zoom.us/j/9876543210",
      reminderType: "2h",
      applicationId: "app-stripe-1",
    })

    expect(html).toContain("CRITICAL: 2 HOURS REMAINING")
    expect(html).toContain("Stripe")
    expect(html).toContain("https://zoom.us/j/9876543210")
    expect(html).toContain("2-Hour Alert: Technical / Live Coding with Stripe")
  })

  it("verifies Inngest function trigger configuration and ID", () => {
    // Inngest function wraps opts in its internal configuration
    expect(interviewReminderPipeline).toBeDefined()
    // Test that the cron trigger matches every 30 minutes
    const triggers = (interviewReminderPipeline as any)["opts"]?.triggers || []
    const hasCron = triggers.some((t: any) => t.cron === "*/30 * * * *")
    const hasEvent = triggers.some((t: any) => t.event === "app/interview-reminders.check")

    expect(hasCron).toBe(true)
    expect(hasEvent).toBe(true)
  })
})
