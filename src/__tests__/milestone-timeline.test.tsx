import { describe, it, expect } from "vitest"
import React from "react"
import { renderToString } from "react-dom/server"
import { MilestoneTimeline } from "@/components/applications/MilestoneTimeline"
import type { Application } from "@/components/applications/types"

describe("MilestoneTimeline Component (CAG-08)", () => {
  const mockApplication: Application = {
    id: "app-test-1",
    companyName: "Stripe",
    jobTitle: "Staff Software Engineer",
    source: "LinkedIn",
    applicationDate: "2026-09-15T00:00:00.000Z",
    status: "Interview",
    jobUrl: "https://stripe.com/jobs/staff-eng",
    notes: "Top choice company",
    interviewDate: "2026-10-15T14:00:00.000Z",
    interviewRound: "Technical Screen",
    interviewMeetingUrl: "https://zoom.us/j/123456789",
    interviewNotes: null,
    tags: [],
    statusChanges: [
      {
        id: "sc-1",
        fromStatus: "Applied",
        toStatus: "Interview",
        changedAt: "2026-09-18T10:00:00.000Z",
        metadata: {
          source: "gmail_inbox_sync",
          sender: "recruiter@stripe.com",
          subject: "Stripe Technical Screen Invitation",
          intent: "INTERVIEW",
          round: "Technical Screen",
          meetingUrl: "https://zoom.us/j/123456789",
          interviewDate: "2026-10-15T14:00:00.000Z",
          snippet: "We would love to schedule a technical screen with the hiring manager.",
        },
      },
    ],
    createdAt: "2026-09-15T00:00:00.000Z",
    updatedAt: "2026-09-18T10:00:00.000Z",
  }

  it("renders 'Updated via Email Sync' badge when status change has gmail_inbox_sync source", () => {
    const html = renderToString(<MilestoneTimeline application={mockApplication} />)

    expect(html).toContain("Updated via Email Sync")
    expect(html).toContain("recruiter@stripe.com")
    expect(html).toContain("Stripe Technical Screen Invitation")
    expect(html).toContain("Technical Screen")
  })

  it("renders 'Join Meeting' link with meeting URL", () => {
    const html = renderToString(<MilestoneTimeline application={mockApplication} />)

    expect(html).toContain("Join Meeting")
    expect(html).toContain("https://zoom.us/j/123456789")
  })

  it("renders 'Launch Interview Prep' link pointing to interview prep tool", () => {
    const html = renderToString(<MilestoneTimeline application={mockApplication} />)

    expect(html).toContain("Launch Interview Prep")
    expect(html).toContain("/interview-prep?applicationId=app-test-1")
  })

  it("does not render Sparkles icon or forbidden decor", () => {
    const html = renderToString(<MilestoneTimeline application={mockApplication} />)

    expect(html.toLowerCase()).not.toContain("sparkles")
    expect(html).not.toContain("lucide-sparkles")
  })

  it("renders empty status change message when no milestones exist", () => {
    const emptyApp: Application = {
      ...mockApplication,
      statusChanges: [],
    }
    const html = renderToString(<MilestoneTimeline application={emptyApp} />)

    expect(html).toContain("No status changes recorded.")
  })
})
