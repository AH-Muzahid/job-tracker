import { describe, it, expect, vi } from "vitest"
import { generateHeuristicTitle } from "@/lib/ai/title-generator"
import { createExecutorNode } from "@/lib/ai/graph/nodes/executor"
import { getResponderSystemPrompt } from "@/lib/ai/graph/nodes/responder"
import type { AgentStateType } from "@/lib/ai/graph/state"
import React from "react"
import { renderToString } from "react-dom/server"

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
    setQueryData: vi.fn(),
  })),
  useQuery: vi.fn(() => ({
    data: [
      {
        id: "session-1",
        title: "Full Stack Engineer Prep",
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
    ],
    isLoading: false,
    error: null,
  })),
  useMutation: vi.fn(() => ({
    mutate: vi.fn(),
  })),
}))

import ChatHistorySidebar from "@/components/ai/ChatHistorySidebar"
import ChatMessage from "@/components/ai/ChatMessage"

describe("AI Assistant Forensic Fixes Verification", () => {
  describe("Issue 4: Title Generation Fixes", () => {
    it("returns 'New Chat' for greetings instead of duplicate 'Career Strategy Chat'", () => {
      expect(generateHeuristicTitle("hi")).toBe("New Chat")
      expect(generateHeuristicTitle("hello")).toBe("New Chat")
      expect(generateHeuristicTitle("hey")).toBe("New Chat")
      expect(generateHeuristicTitle("hi bro")).toBe("New Chat")
      expect(generateHeuristicTitle("hello there")).toBe("New Chat")
      expect(generateHeuristicTitle("hi")).not.toBe("Career Strategy Chat")
    })

    it("generates specific titles for job descriptions and interviews", () => {
      expect(generateHeuristicTitle("analyze this job description for Stripe")).toContain("Stripe")
      expect(generateHeuristicTitle("interview questions for Google")).toContain("Google")
    })
  })

  describe("Issue 2: Elimination of Robotic LangGraph Logs in Non-Tool Steps", () => {
    it("sets result to null for non-tool conversational steps instead of synthetic status string", async () => {
      const executor = createExecutorNode()
      const mockState = {
        messages: [],
        goal: "Hi",
        currentStepIndex: 0,
        plan: [
          {
            id: "step-1",
            task: "Respond to user inquiry",
            status: "pending",
            toolName: null as any,
          },
        ],
        isHeadlessMode: false,
      } as unknown as AgentStateType

      const result = await executor(mockState)
      expect(result.plan).toBeDefined()
      expect(result.plan![0].status).toBe("completed")
      expect(result.plan![0].result).toBeNull()
      expect(result.plan![0].result).not.toBe("Task acknowledged without external tool execution.")
    })
  })

  describe("Issue 3: Anti-Hijacking and Clean Responder System Prompt", () => {
    it("strictly prohibits internal step logs and unprompted mock interview hijacking", () => {
      const prompt = getResponderSystemPrompt()
      expect(prompt).toContain("CRITICAL CONVERSATIONAL & EXECUTION RULES")
      expect(prompt).toContain("STRICT AMBIENT CONTEXT GUARDRAIL")
      expect(prompt).toContain("NEVER unilaterally launch into an unprompted mock interview")
      expect(prompt).toContain("Strict Log Prohibition")
      expect(prompt).toContain("NEVER output internal step logs")
      expect(prompt).toContain("STRICT PROHIBITION: NEVER use the Sparkles icon")
    })
  })

  describe("Issue 1: ChatHistorySidebar Navigation & Dual Sidebar Elimination", () => {
    it("renders Back to Dashboard link and branding in ChatHistorySidebar", () => {
      const html = renderToString(
        <ChatHistorySidebar
          activeChatId="session-1"
          onSelectChat={vi.fn()}
          onNewChat={vi.fn()}
          isOpen={true}
          onToggleOpen={vi.fn()}
        />
      )
      expect(html).toContain('href="/dashboard"')
      expect(html).toContain("Dashboard")
      expect(html).toContain("CareerTrack")
      expect(html).toContain("New Chat")
      expect(html).toContain("Full Stack Engineer Prep")
    })
  })

  describe("Persistence & Response Side Non-Blank Verification", () => {
    it("renders visible fallback and retry action instead of invisible null when assistant message is empty", () => {
      const html = renderToString(
        <ChatMessage
          message={{
            id: "asst-1",
            role: "assistant",
            content: "",
          }}
          isLast={true}
          isStreaming={false}
          onRetry={vi.fn()}
        />
      )
      expect(html).toContain("No response text recorded.")
      expect(html).toContain("Retry")
    })
  })
})
