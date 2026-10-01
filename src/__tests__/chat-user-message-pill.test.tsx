import { describe, it, expect, vi } from "vitest"
import React from "react"
import { renderToString } from "react-dom/server"
import ChatMessage from "@/components/ai/ChatMessage"

describe("ChatMessage User Pill Bubble & Hover Actions", () => {
  it("renders user message as a clean rounded pill with blue background and white text", () => {
    const html = renderToString(
      <ChatMessage
        message={{
          id: "user-msg-1",
          role: "user",
          content: "ACI slide theke purota bujhao",
        }}
        isLast={false}
        isStreaming={false}
        onRetry={vi.fn()}
        onEdit={vi.fn()}
      />
    )

    // Verify user message text is rendered inside the pill
    expect(html).toContain("ACI slide theke purota bujhao")

    // Verify pill styling classes
    expect(html).toContain("rounded-2xl")
    expect(html).toContain("bg-blue-600")
    expect(html).toContain("text-white")

    // Verify right aligned
    expect(html).toContain("items-end")

    // Verify action buttons are present with accessible titles
    expect(html).toContain('title="Copy"')
    expect(html).toContain('title="Retry"')
    expect(html).toContain('title="Edit"')

    // Verify default-hidden opacity classes on the action bar
    expect(html).toContain("opacity-0")
    expect(html).toContain("group-hover:opacity-100")

    // Verify old clunky text labels ("<span>Copy</span>") are removed
    expect(html).not.toContain("<span>Copy</span>")
    expect(html).not.toContain("<span>Edit</span>")
    expect(html).not.toContain("<span>Retry</span>")
  })

  it("does not render avatar for user messages", () => {
    const html = renderToString(
      <ChatMessage
        message={{
          id: "user-msg-2",
          role: "user",
          content: "amar save kora job koita?",
        }}
        isLast={false}
        isStreaming={false}
      />
    )

    expect(html).toContain("amar save kora job koita?")
    expect(html).not.toContain("MessageSquare")
  })

  it("renders assistant message with avatar and left alignment", () => {
    const html = renderToString(
      <ChatMessage
        message={{
          id: "asst-msg-1",
          role: "assistant",
          content: "You have 5 saved jobs in your pipeline.",
        }}
        isLast={true}
        isStreaming={false}
      />
    )

    expect(html).toContain("You have 5 saved jobs in your pipeline.")
    expect(html).toContain("justify-start")
    expect(html).toContain("prose")
    expect(html).toContain('title="Save to Revision Notes"')
  })

  it("does not render generic hardcoded suggestion pills for general answers", () => {
    const html = renderToString(
      <ChatMessage
        message={{
          id: "asst-msg-2",
          role: "assistant",
          content: "Here is general advice on system design principles.",
        }}
        isLast={true}
        isStreaming={false}
      />
    )

    // Hardcoded generic questions must be strictly removed
    expect(html).not.toContain("Elaborate with detailed examples & metrics")
    expect(html).not.toContain("What are the recommended action items?")
  })

  it("renders contextual follow-up suggestions when toolInvocation contains company entity", () => {
    const html = renderToString(
      <ChatMessage
        message={{
          id: "asst-msg-3",
          role: "assistant",
          content: "I have prepared an outreach draft for Stripe.",
          toolInvocations: [
            {
              toolCallId: "call-1",
              toolName: "draftOutreachEmail",
              args: { companyName: "Stripe", role: "Software Engineer" },
              state: "result",
              result: {
                success: true,
                companyName: "Stripe",
                isEmailDraft: true,
              },
            },
          ],
        }}
        isLast={true}
        isStreaming={false}
        onSuggestionClick={vi.fn()}
      />
    )

    expect(html).toContain("Track Stripe as Applied")
    expect(html).toContain("Interview Questions (Stripe)")
    expect(html).toContain("Company Intel &amp; Culture")
  })

  it("renders interactive Voice Mock Room launch card when interview codeblock is present", () => {
    const interviewBlock = "```interview\n" + JSON.stringify({
      companyName: "Stripe",
      role: "Backend Engineer",
      interviewType: "Technical",
      topics: ["Distributed Systems", "Idempotency", "Database Locking"],
      turns: 5,
      summary: "5-round spoken simulation tailored to Stripe engineering culture."
    }) + "\n```"

    const html = renderToString(
      <ChatMessage
        message={{
          id: "asst-msg-interview",
          role: "assistant",
          content: interviewBlock,
        }}
        isLast={true}
        isStreaming={false}
      />
    )

    expect(html).toContain("Conversational Voice Mock Room")
    expect(html).toContain("Voice Engine Online")
    expect(html).toContain("Backend Engineer")
    expect(html).toContain("Stripe")
    expect(html).toContain("Launch Voice Mock Room")
    expect(html).toContain("autostart=true")
    expect(html).toContain("company=Stripe")
  })

  it("suggests contextual action pills when concrete interview tools or schemas are present", () => {
    const html = renderToString(
      <ChatMessage
        message={{
          id: "asst-msg-int-prep",
          role: "assistant",
          content: "I have configured the mock interview room.\n```interview\n{\"companyName\": \"Defdone\", \"role\": \"Frontend Developer\"}\n```",
        }}
        isLast={true}
        isStreaming={false}
        onSuggestionClick={vi.fn()}
      />
    )

    expect(html).toContain("Switch to System Design Focus")
    expect(html).toContain("Focus on Behavioral &amp; STAR")
  })

  it("never dumps unprompted suggestions on normal greetings or conversational text", () => {
    const html = renderToString(
      <ChatMessage
        message={{
          id: "asst-msg-greeting",
          role: "assistant",
          content: "Hello Muzahid, welcome back! How can I help you with your job search today?",
        }}
        isLast={true}
        isStreaming={false}
        onSuggestionClick={vi.fn()}
      />
    )

    expect(html).not.toContain("Suggested Next Steps")
    expect(html).not.toContain("Draft Outreach Email (you)")
  })

  it("renders interactive Tailored Resume Studio card when tailored-resume codeblock is present", () => {
    const resumeBlock = "```tailored-resume\n" + JSON.stringify({
      companyName: "Google",
      role: "Staff Infrastructure Engineer",
      matchScore: 95,
      highlights: ["Quantified distributed consensus achievements", "Injected Go/Kubernetes keywords"],
      summary: "Tailored specifically for Staff Infrastructure Engineer at Google."
    }) + "\n```"

    const html = renderToString(
      <ChatMessage
        message={{
          id: "asst-msg-resume",
          role: "assistant",
          content: resumeBlock,
        }}
        isLast={true}
        isStreaming={false}
      />
    )

    expect(html).toContain("Tailored Resume Studio")
    expect(html).toContain("ATS Fit:")
    expect(html).toContain("95")
    expect(html).toContain("Staff Infrastructure Engineer")
    expect(html).toContain("Google")
    expect(html).toContain("Open in Tailor Studio")
    expect(html).toContain("tailor=true")
    expect(html).toContain("company=Google")
  })

  it("renders interactive Cover Letter Draft card when cover-letter codeblock is present", () => {
    const coverLetterBlock = "```cover-letter\nDear Hiring Team at Linear,\nI am writing to express my enthusiasm for the Senior Frontend Engineer role.\n```"

    const html = renderToString(
      <ChatMessage
        message={{
          id: "asst-msg-cover-letter",
          role: "assistant",
          content: coverLetterBlock,
        }}
        isLast={true}
        isStreaming={false}
      />
    )

    expect(html).toContain("Cover Letter Draft")
    expect(html).toContain("Dear Hiring Team at Linear")
    expect(html).toContain("Copy Draft")
    expect(html).toContain("Download (.txt)")
  })

  it("renders actionable execution buttons for /actions/ endpoints", () => {
    const content = `
[Package & Stage](/actions/stage?company=Vercel&title=Staff+DX+Engineer)
[Set as Weekly Goal](/actions/goal?company=Vercel&goal=Apply%20to%20Vercel&target=1)
[Sync to Google Sheets](/actions/sync-sheets)
    `

    const html = renderToString(
      <ChatMessage
        message={{
          id: "asst-msg-actions",
          role: "assistant",
          content,
        }}
        isLast={true}
        isStreaming={false}
      />
    )

    expect(html).toContain("Package &amp; Stage")
    expect(html).toContain("Set as Weekly Goal")
    expect(html).toContain("Sync to Google Sheets")
  })

  it("renders styled link buttons for core platform routes", () => {
    const content = `
[Open Weekly Goals](/weekly-goals)
[Open Discovery Hub](/discovery)
[Open Companies](/companies)
[Open Integrations](/integrations)
    `

    const html = renderToString(
      <ChatMessage
        message={{
          id: "asst-msg-links",
          role: "assistant",
          content,
        }}
        isLast={true}
        isStreaming={false}
      />
    )

    expect(html).toContain('href="/weekly-goals"')
    expect(html).toContain('href="/discovery"')
    expect(html).toContain('href="/companies"')
    expect(html).toContain('href="/integrations"')
    expect(html).toContain("Open Weekly Goals")
    expect(html).toContain("Open Discovery Hub")
    expect(html).toContain("Open Companies")
    expect(html).toContain("Open Integrations")
  })

  it("renders suggestions when explicit suggestions block is embedded", () => {
    const htmlGoals = renderToString(
      <ChatMessage
        message={{
          id: "asst-msg-goals",
          role: "assistant",
          content: "Here is your progress.\n```suggestions\n[\"View Weekly Goals\", \"Set New Application Goal\"]\n```",
        }}
        isLast={true}
        isStreaming={false}
        onSuggestionClick={vi.fn()}
      />
    )
    expect(htmlGoals).toContain("View Weekly Goals")
    expect(htmlGoals).toContain("Set New Application Goal")
  })

  it("renders markdown action link buttons with not-prose and visible !text-primary-foreground styling", () => {
    const html = renderToString(
      <ChatMessage
        message={{
          id: "asst-msg-markdown-btn",
          role: "assistant",
          content: "[🎙️ Launch Voice Mock Room](/interview-prep?company=CareerTrack&role=Fullstack&autostart=true)",
        }}
        isLast={true}
        isStreaming={false}
      />
    )

    expect(html).toContain("not-prose")
    expect(html).toContain("!text-primary-foreground")
    expect(html).toContain("Launch Voice Mock Room")
    expect(html).toContain("/interview-prep")
  })
})


