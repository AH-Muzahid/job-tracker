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

    // Verify hover-only opacity classes on the action bar
    expect(html).toContain("sm:opacity-0")
    expect(html).toContain("sm:group-hover:opacity-100")

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
})
