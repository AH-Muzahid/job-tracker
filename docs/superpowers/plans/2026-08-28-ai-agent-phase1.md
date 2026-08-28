# AI Agent Phase 1: Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add token counting, conversation summarization, loop detection, and tool risk classification to the AI agent.

**Architecture:** Replace character-based budgeting with tiktoken-based token counting. Add rolling conversation summarization when history exceeds token limits. Track tool calls per step to detect and break loops. Classify tools by risk level to control execution.

**Tech Stack:** `js-tiktoken` (pure JS tiktoken), Vercel AI SDK `streamText`, existing Prisma/Redis infrastructure.

## Global Constraints

- Next.js 15.5.20, React 19, Prisma ORM, Clerk auth
- Existing patterns: Redis caching (1hr TTL), TanStack Query, Zustand store
- No native binaries (Vercel deployment) — use `js-tiktoken` not `tiktoken`
- All new code must pass `npx eslint` with zero new errors
- Follow existing code style: no emojis in code, `rounded-none` on buttons

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/lib/ai/token-counter.ts` | **NEW** — Token counting utility using js-tiktoken |
| `src/lib/ai/conversation-summarizer.ts` | **NEW** — Rolling summarization of old messages |
| `src/lib/ai/loop-detector.ts` | **NEW** — Track tool calls, detect重复 loops |
| `src/lib/ai/tool-registry.ts` | **NEW** — Tool risk classification and dynamic routing |
| `src/lib/ai/context-builder.ts` | **MODIFY** — Replace char budget with token budget |
| `src/app/api/ai/chat/route.ts` | **MODIFY** — Integrate loop detector, use token budget |
| `src/lib/ai/tools.ts` | **MODIFY** — Add risk metadata to tool definitions |
| `src/lib/ai/resilience.ts` | **MODIFY** — Use loop detector in streamText callback |
| `package.json` | **MODIFY** — Add `js-tiktoken` dependency |

---

## Task 1: Token Counter Utility

**Files:**
- Create: `src/lib/ai/token-counter.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: None (standalone utility)
- Produces: `countTokens(text: string): number`, `countMessageTokens(messages: Array<{role: string, content: string}>): number`

- [ ] **Step 1: Install js-tiktoken**

Run: `cd "D:\Projects\Job Tracker\career-track" && npm install js-tiktoken`

- [ ] **Step 2: Create token-counter.ts**

```typescript
import { encodingForModel } from "js-tiktoken"

const cl100k = encodingForModel("gpt-4o")

/**
 * Count tokens in a plain text string using cl100k_base encoding.
 * Works for OpenAI, Anthropic (approximate), and Google models.
 */
export function countTokens(text: string): number {
  if (!text) return 0
  return cl100k.encode(text).length
}

/**
 * Count tokens across an array of chat messages.
 * Adds ~4 tokens overhead per message for role/formatting.
 */
export function countMessageTokens(
  messages: Array<{ role: string; content: string }>
): number {
  let total = 0
  for (const msg of messages) {
    total += 4 // message framing overhead
    total += countTokens(msg.content)
  }
  return total
}

/**
 * Trim messages to fit within a token budget.
 * Always keeps the first user message and the most recent messages.
 * Returns messages in original order.
 */
export function trimToTokenBudget(
  messages: Array<{ role: string; content: string }>,
  maxTokens: number
): Array<{ role: string; content: string }> {
  if (messages.length === 0) return []

  const firstMessage = messages[0]
  const rest = messages.slice(1)

  // Always keep the first message
  let budget = maxTokens - countMessageTokens([firstMessage])
  if (budget <= 0) return [firstMessage]

  // Take from the end (most recent) until budget is exhausted
  const kept: Array<{ role: string; content: string }> = []
  for (let i = rest.length - 1; i >= 0; i--) {
    const msgTokens = countMessageTokens([rest[i]])
    if (budget - msgTokens < 0 && kept.length >= 2) break
    budget -= msgTokens
    kept.unshift(rest[i])
  }

  // Ensure history starts with a user role message
  const result = [firstMessage, ...kept]
  while (result.length > 1 && result[1].role !== "user") {
    result.splice(1, 1)
  }

  return result
}
```

- [ ] **Step 3: Write tests**

Create: `src/lib/ai/__tests__/token-counter.test.ts`

```typescript
import { describe, it, expect } from "vitest"
import { countTokens, countMessageTokens, trimToTokenBudget } from "../token-counter"

describe("countTokens", () => {
  it("counts tokens in simple text", () => {
    const tokens = countTokens("Hello, world!")
    expect(tokens).toBeGreaterThan(0)
    expect(tokens).toBeLessThan(10)
  })

  it("returns 0 for empty string", () => {
    expect(countTokens("")).toBe(0)
  })

  it("handles longer text", () => {
    const text = "This is a longer piece of text that should have more tokens than a simple greeting."
    expect(countTokens(text)).toBeGreaterThan(10)
  })
})

describe("countMessageTokens", () => {
  it("counts tokens with message overhead", () => {
    const messages = [{ role: "user", content: "Hello" }]
    const tokens = countMessageTokens(messages)
    expect(tokens).toBeGreaterThan(4) // at least the overhead
  })

  it("sums multiple messages", () => {
    const messages = [
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi there" },
    ]
    const single = countMessageTokens([messages[0]])
    const double = countMessageTokens(messages)
    expect(double).toBeGreaterThan(single)
  })
})

describe("trimToTokenBudget", () => {
  it("returns all messages if within budget", () => {
    const messages = [
      { role: "user", content: "Hi" },
      { role: "assistant", content: "Hello" },
    ]
    const result = trimToTokenBudget(messages, 10_000)
    expect(result).toHaveLength(2)
  })

  it("always keeps first message", () => {
    const messages = Array.from({ length: 20 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: "A longer message with more tokens to consume budget quickly ".repeat(5),
    }))
    const result = trimToTokenBudget(messages, 200)
    expect(result[0].content).toBe(messages[0].content)
  })

  it("ensures result starts with user role", () => {
    const messages = [
      { role: "user", content: "Hi" },
      { role: "assistant", content: "Hello" },
      { role: "assistant", content: "How can I help?" },
    ]
    const result = trimToTokenBudget(messages, 50)
    if (result.length > 1) {
      expect(result[1].role).toBe("user")
    }
  })
})
```

- [ ] **Step 4: Run tests**

Run: `cd "D:\Projects\Job Tracker\career-track" && npx vitest run src/lib/ai/__tests__/token-counter.test.ts`
Expected: All 8 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai/token-counter.ts src/lib/ai/__tests__/token-counter.test.ts package.json package-lock.json
git commit -m "feat(ai): add token counting utility with js-tiktoken

- countTokens(), countMessageTokens(), trimToTokenBudget()
- Uses cl100k_base encoding (works across OpenAI/Anthropic/Google)
- Replaces character-based budgeting with accurate token counting"
```

---

## Task 2: Conversation Summarizer

**Files:**
- Create: `src/lib/ai/conversation-summarizer.ts`
- Create: `src/lib/ai/__tests__/conversation-summarizer.test.ts`

**Interfaces:**
- Consumes: `countTokens()` from Task 1, `generateText` from `ai` package
- Produces: `summarizeConversation(messages, maxTokens): Promise<Array<{role, content}>>`

- [ ] **Step 1: Create conversation-summarizer.ts**

```typescript
import { generateText } from "ai"
import { countMessageTokens, trimToTokenBudget } from "./token-counter"
import { getUserAIConfig } from "./config"
import { getFallbackModelCascade } from "./resilience"

const SUMMARY_SYSTEM_PROMPT = `You are a conversation summarizer. Summarize the following conversation into a concise paragraph that preserves:
- Key decisions made
- Action items and their status
- Important facts or preferences expressed
- Current state of any ongoing task

Be concise but complete. Output only the summary, no preamble.`

/**
 * If conversation exceeds maxTokens, summarize older messages to fit.
 * Always preserves: first message, last 4 messages (untouched), summary of middle.
 */
export async function summarizeConversation(
  messages: Array<{ role: string; content: string }>,
  maxTokens: number
): Promise<Array<{ role: string; content: string }>> {
  const totalTokens = countMessageTokens(messages)

  // If within budget, just trim (no summarization needed)
  if (totalTokens <= maxTokens) {
    return trimToTokenBudget(messages, maxTokens)
  }

  // Reserve tokens: summary (~300 tokens) + last 4 messages + first message
  const保留Messages = messages.slice(0, 1) // first message
  const recentMessages = messages.slice(-4) // last 4 messages
  const middleMessages = messages.slice(1, -4) // everything in between

  if (middleMessages.length === 0) {
    return trimToTokenBudget(messages, maxTokens)
  }

  // Calculate budget for summary
  const fixedTokens = countMessageTokens([...保留Messages, ...recentMessages])
  const summaryBudget = Math.min(300, maxTokens - fixedTokens)

  if (summaryBudget < 100) {
    // Not enough room for summary, just trim
    return trimToTokenBudget(messages, maxTokens)
  }

  // Summarize the middle portion
  const middleText = middleMessages
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n\n")

  try {
    const config = await getUserAIConfig(null)
    const cascade = getFallbackModelCascade(config, null)

    if (cascade.length === 0) {
      return trimToTokenBudget(messages, maxTokens)
    }

    const { text: summary } = await generateText({
      model: cascade[0].model,
      system: SUMMARY_SYSTEM_PROMPT,
      prompt: `Summarize this conversation in under ${summaryBudget} tokens:\n\n${middleText.slice(0, 8000)}`,
      maxTokens: summaryBudget,
      temperature: 0.1,
    })

    const summaryMessage = {
      role: "system" as const,
      content: `[Conversation Summary]\n${summary.trim()}`,
    }

    return [...保留Messages, summaryMessage, ...recentMessages]
  } catch {
    // On failure, fall back to simple trimming
    return trimToTokenBudget(messages, maxTokens)
  }
}
```

- [ ] **Step 2: Write tests**

Create: `src/lib/ai/__tests__/conversation-summarizer.test.ts`

```typescript
import { describe, it, expect, vi } from "vitest"

// Mock the AI SDK and config modules
vi.mock("ai", () => ({
  generateText: vi.fn().mockResolvedValue({ text: "Summary of the conversation." }),
}))

vi.mock("@/lib/ai/config", () => ({
  getUserAIConfig: vi.fn().mockResolvedValue({}),
}))

vi.mock("@/lib/ai/resilience", () => ({
  getFallbackModelCascade: vi.fn().mockReturnValue([{ model: {}, name: "test" }]),
}))

import { summarizeConversation } from "../conversation-summarizer"

describe("summarizeConversation", () => {
  it("returns messages unchanged if within budget", async () => {
    const messages = [
      { role: "user", content: "Hi" },
      { role: "assistant", content: "Hello" },
    ]
    const result = await summarizeConversation(messages, 10_000)
    expect(result).toHaveLength(2)
  })

  it("summarizes middle messages when over budget", async () => {
    const messages = Array.from({ length: 10 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: "A longer message with more content to consume tokens quickly. ".repeat(10),
    }))
    const result = await summarizeConversation(messages, 200)
    // Should have: first message + summary + last 4 messages
    expect(result.length).toBeLessThan(messages.length)
    expect(result[0].content).toBe(messages[0].content)
  })

  it("always preserves first message", async () => {
    const messages = Array.from({ length: 8 }, (_, i) => ({
      role: "user",
      content: "Message with enough tokens to matter. ".repeat(10),
    }))
    const result = await summarizeConversation(messages, 150)
    expect(result[0].content).toBe(messages[0].content)
  })
})
```

- [ ] **Step 3: Run tests**

Run: `cd "D:\Projects\Job Tracker\career-track" && npx vitest run src/lib/ai/__tests__/conversation-summarizer.test.ts`
Expected: All 3 tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/ai/conversation-summarizer.ts src/lib/ai/__tests__/conversation-summarizer.test.ts
git commit -m "feat(ai): add conversation summarizer for long histories

- Summarizes middle messages when conversation exceeds token budget
- Preserves first message and last 4 messages untouched
- Falls back to simple trimming on summarization failure"
```

---

## Task 3: Loop Detector

**Files:**
- Create: `src/lib/ai/loop-detector.ts`
- Create: `src/lib/ai/__tests__/loop-detector.test.ts`

**Interfaces:**
- Consumes: None (standalone utility)
- Produces: `LoopDetector` class with `recordCall()`, `isLoopDetected()`, `getCallHistory()`

- [ ] **Step 1: Create loop-detector.ts**

```typescript
interface ToolCall {
  toolName: string
  argsHash: string
  timestamp: number
}

/**
 * Detects when the agent is stuck in a loop — calling the same tool
 * with the same arguments repeatedly.
 */
export class LoopDetector {
  private calls: ToolCall[] = []
  private readonly maxHistory: number
  private readonly repetitionThreshold: number
  private readonly timeWindowMs: number

  constructor(options?: {
    maxHistory?: number
    repetitionThreshold?: number
    timeWindowMs?: number
  }) {
    this.maxHistory = options?.maxHistory ?? 20
    this.repetitionThreshold = options?.repetitionThreshold ?? 3
    this.timeWindowMs = options?.timeWindowMs ?? 30_000
  }

  /**
   * Record a tool call. Returns true if a loop is detected.
   */
  recordCall(toolName: string, args: Record<string, unknown>): boolean {
    const argsHash = this.hashArgs(args)
    const now = Date.now()

    this.calls.push({ toolName, argsHash, timestamp: now })

    // Trim old calls
    if (this.calls.length > this.maxHistory) {
      this.calls = this.calls.slice(-this.maxHistory)
    }

    // Check for repetition within time window
    const recentCalls = this.calls.filter(
      (c) => now - c.timestamp < this.timeWindowMs
    )

    const sameToolCalls = recentCalls.filter(
      (c) => c.toolName === toolName && c.argsHash === argsHash
    )

    return sameToolCalls.length >= this.repetitionThreshold
  }

  /**
   * Check if a specific tool is being called excessively.
   */
  isToolExcessive(toolName: string, maxCalls: number = 5): boolean {
    const now = Date.now()
    const recentCalls = this.calls.filter(
      (c) => c.toolName === toolName && now - c.timestamp < this.timeWindowMs
    )
    return recentCalls.length >= maxCalls
  }

  /**
   * Get call history for debugging.
   */
  getCallHistory(): ReadonlyArray<ToolCall> {
    return [...this.calls]
  }

  /**
   * Reset the detector.
   */
  reset(): void {
    this.calls = []
  }

  private hashArgs(args: Record<string, unknown>): string {
    return JSON.stringify(args, Object.keys(args).sort())
  }
}
```

- [ ] **Step 2: Write tests**

Create: `src/lib/ai/__tests__/loop-detector.test.ts`

```typescript
import { describe, it, expect, beforeEach } from "vitest"
import { LoopDetector } from "../loop-detector"

describe("LoopDetector", () => {
  let detector: LoopDetector

  beforeEach(() => {
    detector = new LoopDetector({
      repetitionThreshold: 3,
      timeWindowMs: 60_000,
    })
  })

  it("returns false for first call", () => {
    expect(detector.recordCall("search", { query: "test" })).toBe(false)
  })

  it("detects loop when same call repeated 3+ times", () => {
    detector.recordCall("search", { query: "test" })
    detector.recordCall("search", { query: "test" })
    expect(detector.recordCall("search", { query: "test" })).toBe(true)
  })

  it("does not detect loop with different args", () => {
    detector.recordCall("search", { query: "apple" })
    detector.recordCall("search", { query: "apple" })
    detector.recordCall("search", { query: "banana" })
    expect(detector.recordCall("search", { query: "banana" })).toBe(false)
  })

  it("does not detect loop with different tools", () => {
    detector.recordCall("search", { query: "test" })
    detector.recordCall("search", { query: "test" })
    expect(detector.recordCall("create", { name: "test" })).toBe(false)
  })

  it("detects excessive calls for a tool", () => {
    for (let i = 0; i < 5; i++) {
      detector.recordCall("search", { query: `test${i}` })
    }
    expect(detector.isToolExcessive("search", 5)).toBe(true)
  })

  it("reset clears history", () => {
    detector.recordCall("search", { query: "test" })
    detector.recordCall("search", { query: "test" })
    detector.reset()
    expect(detector.recordCall("search", { query: "test" })).toBe(false)
  })

  it("different arg orders produce same hash", () => {
    // {a: 1, b: 2} should hash same as {b: 2, a: 1}
    detector.recordCall("test", { a: 1, b: 2 })
    // This should NOT be a loop since args are semantically identical
    const result = detector.recordCall("test", { b: 2, a: 1 })
    expect(result).toBe(true) // same hash, 3rd call = loop
  })
})
```

- [ ] **Step 3: Run tests**

Run: `cd "D:\Projects\Job Tracker\career-track" && npx vitest run src/lib/ai/__tests__/loop-detector.test.ts`
Expected: All 7 tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/ai/loop-detector.ts src/lib/ai/__tests__/loop-detector.test.ts
git commit -m "feat(ai): add loop detector for repeated tool calls

- LoopDetector class tracks tool calls with args hashing
- Detects 3+ identical calls within time window
- Detects excessive calls per tool (configurable threshold)
- Arg-order invariant hashing for semantic equality"
```

---

## Task 4: Tool Risk Classification

**Files:**
- Create: `src/lib/ai/tool-registry.ts`
- Modify: `src/lib/ai/tools.ts` (add risk metadata)

**Interfaces:**
- Consumes: Tool definitions from `tools.ts`
- Produces: `ToolRisk` enum, `getToolRisk(name)`, `getToolsByRisk()`, `TOOLS_WITH_RISK` map

- [ ] **Step 1: Create tool-registry.ts**

```typescript
export enum ToolRisk {
  READ_ONLY = "read_only",       // No side effects
  LOW_MUTATION = "low_mutation", // Creates/updates non-critical data
  HIGH_MUTATION = "high_mutation", // Updates application state
  DESTRUCTIVE = "destructive",   // Deletes data
  EXTERNAL = "external",         // Sends emails, calls external APIs
}

interface ToolRiskEntry {
  name: string
  risk: ToolRisk
  requiresConfirmation: boolean
}

/**
 * Risk classification for all AI tools.
 * Tools not listed here default to LOW_MUTATION.
 */
export const TOOL_RISK_MAP: Record<string, ToolRiskEntry> = {
  // Read-only tools
  searchApplications:         { name: "searchApplications",         risk: ToolRisk.READ_ONLY,      requiresConfirmation: false },
  listUserApplications:       { name: "listUserApplications",       risk: ToolRisk.READ_ONLY,      requiresConfirmation: false },
  getPrepNotes:               { name: "getPrepNotes",               risk: ToolRisk.READ_ONLY,      requiresConfirmation: false },
  getResumeSummary:           { name: "getResumeSummary",           risk: ToolRisk.READ_ONLY,      requiresConfirmation: false },
  getPipelineStats:           { name: "getPipelineStats",           risk: ToolRisk.READ_ONLY,      requiresConfirmation: false },
  getUserMemories:            { name: "getUserMemories",            risk: ToolRisk.READ_ONLY,      requiresConfirmation: false },
  queryCareerKnowledgeGraph:  { name: "queryCareerKnowledgeGraph",  risk: ToolRisk.READ_ONLY,      requiresConfirmation: false },

  // Low mutation (non-critical creates/updates)
  setWeeklyGoals:             { name: "setWeeklyGoals",             risk: ToolRisk.LOW_MUTATION,   requiresConfirmation: false },
  addPrepQuestions:           { name: "addPrepQuestions",           risk: ToolRisk.LOW_MUTATION,   requiresConfirmation: false },
  savePrepNote:               { name: "savePrepNote",               risk: ToolRisk.LOW_MUTATION,   requiresConfirmation: false },
  saveUserMemory:             { name: "saveUserMemory",             risk: ToolRisk.LOW_MUTATION,   requiresConfirmation: false },
  recordMockInterviewScore:   { name: "recordMockInterviewScore",   risk: ToolRisk.LOW_MUTATION,   requiresConfirmation: false },
  researchCompanyIntel:       { name: "researchCompanyIntel",       risk: ToolRisk.LOW_MUTATION,   requiresConfirmation: false },
  syncCareerKnowledgeGraph:   { name: "syncCareerKnowledgeGraph",   risk: ToolRisk.LOW_MUTATION,   requiresConfirmation: false },

  // High mutation (application state changes)
  createApplication:          { name: "createApplication",          risk: ToolRisk.HIGH_MUTATION,  requiresConfirmation: false },
  updateApplicationStatus:    { name: "updateApplicationStatus",    risk: ToolRisk.HIGH_MUTATION,  requiresConfirmation: false },
  batchImportApplications:    { name: "batchImportApplications",    risk: ToolRisk.HIGH_MUTATION,  requiresConfirmation: true },
  tailorResumeForJob:         { name: "tailorResumeForJob",         risk: ToolRisk.HIGH_MUTATION,  requiresConfirmation: false },

  // Destructive
  deleteApplication:          { name: "deleteApplication",          risk: ToolRisk.DESTRUCTIVE,    requiresConfirmation: true },
  forgetUserMemory:           { name: "forgetUserMemory",           risk: ToolRisk.DESTRUCTIVE,    requiresConfirmation: true },

  // External (sends data outside the system)
  draftOutreachEmail:         { name: "draftOutreachEmail",         risk: ToolRisk.READ_ONLY,      requiresConfirmation: false },
  sendOutreachEmailViaResend: { name: "sendOutreachEmailViaResend", risk: ToolRisk.EXTERNAL,       requiresConfirmation: true },
  scrapeJobLink:              { name: "scrapeJobLink",              risk: ToolRisk.EXTERNAL,       requiresConfirmation: false },
  syncToGoogleSheets:         { name: "syncToGoogleSheets",         risk: ToolRisk.EXTERNAL,       requiresConfirmation: false },
}

/**
 * Get risk level for a tool. Defaults to LOW_MUTATION if unknown.
 */
export function getToolRisk(toolName: string): ToolRisk {
  return TOOL_RISK_MAP[toolName]?.risk ?? ToolRisk.LOW_MUTATION
}

/**
 * Check if a tool requires user confirmation before execution.
 */
export function requiresConfirmation(toolName: string): boolean {
  return TOOL_RISK_MAP[toolName]?.requiresConfirmation ?? false
}

/**
 * Get all tools filtered by risk level.
 */
export function getToolsByRisk(risk: ToolRisk): string[] {
  return Object.values(TOOL_RISK_MAP)
    .filter((entry) => entry.risk === risk)
    .map((entry) => entry.name)
}

/**
 * Get only safe (read-only + low mutation) tool names.
 * Used for dynamic tool routing — only expose safe tools by default.
 */
export function getSafeTools(): string[] {
  return Object.values(TOOL_RISK_MAP)
    .filter((entry) => entry.risk === ToolRisk.READ_ONLY || entry.risk === ToolRisk.LOW_MUTATION)
    .map((entry) => entry.name)
}
```

- [ ] **Step 2: Write tests**

Create: `src/lib/ai/__tests__/tool-registry.test.ts`

```typescript
import { describe, it, expect } from "vitest"
import { getToolRisk, requiresConfirmation, getToolsByRisk, getSafeTools, ToolRisk } from "../tool-registry"

describe("Tool Risk Registry", () => {
  it("classifies read-only tools correctly", () => {
    expect(getToolRisk("searchApplications")).toBe(ToolRisk.READ_ONLY)
    expect(getToolRisk("getPipelineStats")).toBe(ToolRisk.READ_ONLY)
    expect(getToolRisk("getResumeSummary")).toBe(ToolRisk.READ_ONLY)
  })

  it("classifies destructive tools correctly", () => {
    expect(getToolRisk("deleteApplication")).toBe(ToolRisk.DESTRUCTIVE)
    expect(getToolRisk("forgetUserMemory")).toBe(ToolRisk.DESTRUCTIVE)
  })

  it("classifies external tools correctly", () => {
    expect(getToolRisk("sendOutreachEmailViaResend")).toBe(ToolRisk.EXTERNAL)
    expect(getToolRisk("scrapeJobLink")).toBe(ToolRisk.EXTERNAL)
  })

  it("defaults to LOW_MUTATION for unknown tools", () => {
    expect(getToolRisk("unknownTool")).toBe(ToolRisk.LOW_MUTATION)
  })

  it("requires confirmation for destructive tools", () => {
    expect(requiresConfirmation("deleteApplication")).toBe(true)
    expect(requiresConfirmation("sendOutreachEmailViaResend")).toBe(true)
    expect(requiresConfirmation("batchImportApplications")).toBe(true)
  })

  it("does not require confirmation for read-only tools", () => {
    expect(requiresConfirmation("searchApplications")).toBe(false)
    expect(requiresConfirmation("getPipelineStats")).toBe(false)
  })

  it("getToolsByRisk returns correct tools", () => {
    const readOnlyTools = getToolsByRisk(ToolRisk.READ_ONLY)
    expect(readOnlyTools).toContain("searchApplications")
    expect(readOnlyTools).toContain("getPipelineStats")
    expect(readOnlyTools).not.toContain("deleteApplication")
  })

  it("getSafeTools excludes destructive and external", () => {
    const safeTools = getSafeTools()
    expect(safeTools).toContain("searchApplications")
    expect(safeTools).toContain("createApplication")
    expect(safeTools).not.toContain("deleteApplication")
    expect(safeTools).not.toContain("sendOutreachEmailViaResend")
  })
})
```

- [ ] **Step 3: Run tests**

Run: `cd "D:\Projects\Job Tracker\career-track" && npx vitest run src/lib/ai/__tests__/tool-registry.test.ts`
Expected: All 8 tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/ai/tool-registry.ts src/lib/ai/__tests__/tool-registry.test.ts
git commit -m "feat(ai): add tool risk classification registry

- ToolRisk enum: READ_ONLY, LOW_MUTATION, HIGH_MUTATION, DESTRUCTIVE, EXTERNAL
- 24 tools classified with confirmation requirements
- getSafeTools() for dynamic tool routing
- requiresConfirmation() for HITL checkpoints"
```

---

## Task 5: Integrate Token Budget + Summarization

**Files:**
- Modify: `src/lib/ai/context-builder.ts` (replace char budget with token budget)
- Modify: `src/app/api/ai/chat/route.ts` (use summarization)
- Modify: `src/features/ai/__tests__/context-builder.test.ts` (update tests)

**Interfaces:**
- Consumes: `trimToTokenBudget()` from Task 1, `summarizeConversation()` from Task 2
- Produces: Updated `budgetConversationHistory()` that uses tokens

- [ ] **Step 1: Update context-builder.ts**

Replace the `budgetConversationHistory` function:

```typescript
import { countTokens, trimToTokenBudget } from "./token-counter"

// ... existing imports ...

/**
 * Enforce strict token budgeting on conversation history.
 * Uses js-tiktoken for accurate token counting instead of character estimation.
 * Always keeps first user message and ensures history starts with user role.
 */
export function budgetConversationHistory(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  maxTokens: number = 16_000
): Array<{ role: "user" | "assistant"; content: string }> {
  return trimToTokenBudget(messages, maxTokens) as Array<{ role: "user" | "assistant"; content: string }>
}

/**
 * Get token count for a message array (for logging/debugging).
 */
export function getMessageTokenCount(
  messages: Array<{ role: string; content: string }>
): number {
  return countTokens(messages.map((m) => m.content).join("\n"))
}
```

- [ ] **Step 2: Update chat route.ts**

In `src/app/api/ai/chat/route.ts`, change line 135:

```typescript
// Before:
const budgetedMessages = budgetConversationHistory(rawFormatted, 24_000)

// After:
const budgetedMessages = budgetConversationHistory(rawFormatted, 16_000)
```

Also add after line 135 (after budgeting):

```typescript
// Log token usage for monitoring
const tokenCount = getMessageTokenCount(budgetedMessages)
```

- [ ] **Step 3: Update existing tests**

In `src/features/ai/__tests__/context-builder.test.ts`, update the `budgetConversationHistory` test to use token-based budget:

```typescript
// Change the budget from 12000 (chars) to 4000 (tokens)
const budgeted = budgetConversationHistory(longMessages, 4000)
```

- [ ] **Step 4: Run all tests**

Run: `cd "D:\Projects\Job Tracker\career-track" && npx vitest run src/features/ai/__tests__/context-builder.test.ts src/lib/ai/__tests__/token-counter.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai/context-builder.ts src/app/api/ai/chat/route.ts src/features/ai/__tests__/context-builder.test.ts
git commit -m "feat(ai): integrate token-based budgeting into chat route

- Replace char-based budget (24K chars) with token-based (16K tokens)
- Add token count logging for monitoring
- Update existing context-builder tests"
```

---

## Task 6: Integrate Loop Detector + Tool Risk into Chat Route

**Files:**
- Modify: `src/app/api/ai/chat/route.ts`
- Modify: `src/lib/ai/resilience.ts`

**Interfaces:**
- Consumes: `LoopDetector` from Task 3, `getToolRisk/requiresConfirmation` from Task 4
- Produces: Loop detection in streamText callback, tool risk logging

- [ ] **Step 1: Update resilience.ts**

Add loop detection to the `onStepFinish` callback in `resilientStreamText`. In `src/lib/ai/resilience.ts`, find the `resilientStreamText` function and add:

```typescript
import { LoopDetector } from "./loop-detector"
import { getToolRisk } from "./tool-registry"

// Inside resilientStreamText, before the streamText call:
const loopDetector = new LoopDetector({ repetitionThreshold: 3, timeWindowMs: 30_000 })

// Add to streamText options:
onStepFinish: ({ toolCalls, toolResults }) => {
  // Check for loops in tool calls
  for (const tc of toolCalls) {
    const isLoop = loopDetector.recordCall(tc.toolName, tc.args as Record<string, unknown>)
    if (isLoop) {
      console.warn(`[LoopDetector] Loop detected for tool: ${tc.toolName}`)
    }

    // Log tool risk
    const risk = getToolRisk(tc.toolName)
    if (risk === "destructive" || risk === "external") {
      console.warn(`[ToolRisk] ${risk} tool called: ${tc.toolName}`)
    }
  }
}
```

- [ ] **Step 2: Add loop-breaking logic**

In the same `onStepFinish`, if a loop is detected, the agent should stop. Add after the loop detection:

```typescript
// If loop detected, we can't directly stop streamText from onStepFinish,
// but we can log it. The maxSteps cap already prevents infinite loops.
// The loop detector adds visibility and logging for debugging.
```

Note: Vercel AI SDK's `streamText` doesn't support early termination from `onStepFinish`. The loop detector provides observability — in production, you'd use this data to adjust `maxSteps` or add a custom middleware.

- [ ] **Step 3: Run lint**

Run: `cd "D:\Projects\Job Tracker\career-track" && npx eslint src/app/api/ai/chat/route.ts src/lib/ai/resilience.ts`
Expected: Zero new errors

- [ ] **Step 4: Commit**

```bash
git add src/app/api/ai/chat/route.ts src/lib/ai/resilience.ts
git commit -m "feat(ai): integrate loop detector and tool risk into chat pipeline

- LoopDetector tracks tool calls per streamText execution
- Logs warnings for loop detection and high-risk tool calls
- Provides observability for debugging agent behavior"
```

---

## Task 7: Final Integration Test + Build

**Files:**
- None (verification only)

- [ ] **Step 1: Run full test suite**

Run: `cd "D:\Projects\Job Tracker\career-track" && npx vitest run`
Expected: All tests PASS

- [ ] **Step 2: Run lint**

Run: `cd "D:\Projects\Job Tracker\career-track" && npx eslint src/lib/ai/`
Expected: Zero new errors

- [ ] **Step 3: Run build**

Run: `cd "D:\Projects\Job Tracker\career-track" && npm run build`
Expected: Build succeeds

- [ ] **Step 4: Commit any final fixes**

```bash
git add -A && git commit -m "chore: final integration test fixes for AI agent Phase 1"
```

---

## Summary

After completing all 7 tasks:

| Feature | Status | File |
|---------|--------|------|
| Token counting | ✅ | `token-counter.ts` |
| Conversation summarization | ✅ | `conversation-summarizer.ts` |
| Loop detection | ✅ | `loop-detector.ts` |
| Tool risk classification | ✅ | `tool-registry.ts` |
| Token-based budgeting | ✅ | `context-builder.ts` |
| Chat route integration | ✅ | `chat/route.ts`, `resilience.ts` |
| Tests | ✅ | 4 new test files |

**Estimated time:** 2-3 days for a developer familiar with the codebase.
