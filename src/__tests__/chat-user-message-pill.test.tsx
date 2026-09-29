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

  it("suggests 🎙️ Voice Mock pill when discussing interview topics", () => {
    const html = renderToString(
      <ChatMessage
        message={{
          id: "asst-msg-int-prep",
          role: "assistant",
          content: "Here are common interview questions asked by Defdone for frontend developers.",
        }}
        isLast={true}
        isStreaming={false}
        onSuggestionClick={vi.fn()}
      />
    )

    expect(html).toContain("Voice Mock")
    expect(html).toContain("Model STAR Answers")
  })
})

