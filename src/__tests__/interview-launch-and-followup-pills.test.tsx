import { describe, it, expect, vi } from "vitest"
import React from "react"
import { renderToString } from "react-dom/server"
import ChatMessage, { normalizeInternalHref } from "@/components/ai/ChatMessage"

describe("Interview Launch Navigation & Contextual Follow-up Pills Suite", () => {
  describe("normalizeInternalHref URL Normalization", () => {
    it("recognizes and normalizes relative in-app paths", () => {
      const result = normalizeInternalHref("/interview-prep?company=Google&autostart=true")
      expect(result.isInternal).toBe(true)
      expect(result.path).toBe("/interview-prep?company=Google&autostart=true")
    })

    it("normalizes localhost URLs to relative in-app paths", () => {
      const result = normalizeInternalHref("http://localhost:3000/interview-prep?company=Netflix&role=Senior+SRE&autostart=true")
      expect(result.isInternal).toBe(true)
      expect(result.path).toBe("/interview-prep?company=Netflix&role=Senior+SRE&autostart=true")
    })

    it("normalizes 127.0.0.1 URLs to relative in-app paths", () => {
      const result = normalizeInternalHref("http://127.0.0.1:3000/applications/app-123")
      expect(result.isInternal).toBe(true)
      expect(result.path).toBe("/applications/app-123")
    })

    it("normalizes careertrack domain URLs to relative in-app paths", () => {
      const result = normalizeInternalHref("https://careertrack.ai/resumes?tailor=true")
      expect(result.isInternal).toBe(true)
      expect(result.path).toBe("/resumes?tailor=true")
    })

    it("identifies external third-party URLs as external", () => {
      const result = normalizeInternalHref("https://www.linkedin.com/jobs/view/123456")
      expect(result.isInternal).toBe(false)
      expect(result.path).toBe("https://www.linkedin.com/jobs/view/123456")
    })
  })

  describe("In-App Navigation Without target='_blank'", () => {
    it("renders /interview-prep relative link as in-app button WITHOUT target='_blank'", () => {
      const content = "Your voice room is ready: [🎙️ Launch Voice Mock Room](/interview-prep?company=Google&role=Staff+Engineer&type=Technical&autostart=true)"
      const html = renderToString(
        <ChatMessage
          message={{
            id: "msg-int-launch-1",
            role: "assistant",
            content,
          }}
          isLast={true}
          isStreaming={false}
        />
      )

      // Must NOT contain target="_blank"
      expect(html).not.toContain('target="_blank"')
      expect(html).toContain('href="/interview-prep?company=Google&amp;role=Staff+Engineer&amp;type=Technical&amp;autostart=true"')
      expect(html).toContain("Launch Voice Mock Room")
      // Must use Stripe-standard 4px radius
      expect(html).toContain("rounded-[4px]")
    })

    it("renders localhost interview URL as in-app button WITHOUT target='_blank'", () => {
      const content = "Click here: [🎙️ Launch Voice Mock Room](http://localhost:3000/interview-prep?company=Stripe&role=Backend+Engineer&autostart=true)"
      const html = renderToString(
        <ChatMessage
          message={{
            id: "msg-int-launch-2",
            role: "assistant",
            content,
          }}
          isLast={true}
          isStreaming={false}
        />
      )

      // Must be stripped of localhost and navigate in-app without target="_blank"
      expect(html).not.toContain('target="_blank"')
      expect(html).toContain('href="/interview-prep?company=Stripe&amp;role=Backend+Engineer&amp;autostart=true"')
    })

    it("renders external links WITH target='_blank' and rel='noopener noreferrer'", () => {
      const content = "Check out the job posting at [Company Site](https://careers.google.com/jobs/123)."
      const html = renderToString(
        <ChatMessage
          message={{
            id: "msg-ext-1",
            role: "assistant",
            content,
          }}
          isLast={true}
          isStreaming={false}
        />
      )

      expect(html).toContain('target="_blank"')
      expect(html).toContain('rel="noopener noreferrer"')
      expect(html).toContain('href="https://careers.google.com/jobs/123"')
    })
  })

  describe("Automatic Schema Promotion for ```json Code Blocks", () => {
    it("auto-promotes ```json containing interview schema into MockInterviewResult card", () => {
      const rawJsonInterview = "```json\n" + JSON.stringify({
        companyName: "Google",
        role: "Full Stack Engineer",
        interviewType: "Technical",
        topics: [
          "Next.js App Router & Server Components",
          "Real-time Architecture",
          "PostgreSQL & Prisma Performance"
        ],
        turns: 5,
        summary: "Spoken AI simulation with live audio interaction and post-session STAR scoring."
      }) + "\n```"

      const html = renderToString(
        <ChatMessage
          message={{
            id: "msg-raw-json-interview",
            role: "assistant",
            content: rawJsonInterview,
          }}
          isLast={true}
          isStreaming={false}
        />
      )

      // Should NOT render as raw code block
      expect(html).not.toContain('title="Copy code"')
      // Must render the rich card
      expect(html).toContain("Conversational Voice Mock Room")
      expect(html).toContain("Voice Engine Online")
      expect(html).toContain("Full Stack Engineer")
      expect(html).toContain("Google")
      expect(html).toContain("Launch Voice Mock Room")
      // Must have relative launch link without target="_blank"
      expect(html).toContain("autostart=true")
      expect(html).not.toContain('target="_blank"')
    })

    it("auto-promotes ```json containing outreach schema into OutreachResult card", () => {
      const rawJsonOutreach = "```json\n" + JSON.stringify({
        subject: "Senior Frontend Engineer Application — AH Muzahid",
        body: "Hi Stripe Hiring Team,\n\nI noticed Stripe is expanding its developer infrastructure...",
        companyName: "Stripe",
        format: "Email Outreach Draft"
      }) + "\n```"

      const html = renderToString(
        <ChatMessage
          message={{
            id: "msg-raw-json-outreach",
            role: "assistant",
            content: rawJsonOutreach,
          }}
          isLast={true}
          isStreaming={false}
        />
      )

      expect(html).toContain("Email Outreach Draft")
      expect(html).toContain("Senior Frontend Engineer Application — AH Muzahid")
      expect(html).toContain("Copy")
    })
  })

  describe("Contextual Follow-up Suggestions & Stripe Design System", () => {
    it("does NOT suggest redundant 'Start Mock Interview' when mock interview is already configured", () => {
      const content = `
\`\`\`interview
{
  "companyName": "Google",
  "role": "Full Stack Engineer",
  "interviewType": "Technical",
  "turns": 5,
  "summary": "Voice simulation room ready."
}
\`\`\`
[🎙️ Launch Voice Mock Room](/interview-prep?company=Google&role=Full+Stack+Engineer&type=Technical&turns=5&autostart=true)
      `

      const html = renderToString(
        <ChatMessage
          message={{
            id: "msg-configured-interview",
            role: "assistant",
            content,
          }}
          isLast={true}
          isStreaming={false}
          onSuggestionClick={vi.fn()}
        />
      )

      // Must NOT suggest starting another mock interview!
      expect(html).not.toContain("Start Mock Interview")
      expect(html).not.toContain("Launch Voice Mock Room</span></button>")

      // Must provide contextual refinement actions
      expect(html).toContain("Switch to System Design Focus")
      expect(html).toContain("Focus on Behavioral &amp; STAR")

      // Must use Stripe design system
      expect(html).toContain("Suggested Next Steps")
      expect(html).not.toContain("FOLLOW-UP QUESTIONS")
      expect(html).toContain("rounded-[4px]")
    })

    it("renders clean Suggested Next Steps styling with status dot and ArrowRight icon", () => {
      const content = "```analysis\nHere is an analysis of your match score for Vercel.\n```"
      const html = renderToString(
        <ChatMessage
          message={{
            id: "msg-analysis-suggestions",
            role: "assistant",
            content,
          }}
          isLast={true}
          isStreaming={false}
          onSuggestionClick={vi.fn()}
        />
      )

      expect(html).toContain("Suggested Next Steps")
      expect(html).toContain("Draft Outreach (Vercel)")
      expect(html).toContain("Tailor Resume (Vercel)")
    })
  })
})
