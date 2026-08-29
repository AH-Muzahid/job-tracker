# Phase 3: Intelligence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add intelligent tool routing, memory consolidation, semantic search, and message editing to the AI agent.

**Architecture:** Leverage existing mode-router to filter tools per request. Add importance scoring and merge logic to memory system. Use OpenAI embeddings API for vector similarity. Extend retry mechanism to support message editing.

**Tech Stack:** Vercel AI SDK, Upstash Redis, Prisma, OpenAI embeddings API (text-embedding-3-small)

---

## File Structure

| File | Purpose |
|------|---------|
| `src/lib/ai/tool-router.ts` | NEW — maps modes to tool subsets, filters tools |
| `src/lib/ai/memory-consolidator.ts` | NEW — importance scoring, merge logic |
| `src/lib/ai/memory-search.ts` | NEW — embedding generation + vector similarity |
| `src/lib/ai/__tests__/tool-router.test.ts` | NEW — tests for tool routing |
| `src/lib/ai/__tests__/memory-consolidator.test.ts` | NEW — tests for consolidation |
| `src/lib/ai/__tests__/memory-search.test.ts` | NEW — tests for semantic search |
| `src/app/api/ai/chat/route.ts` | MODIFY — use dynamic tool routing |
| `src/app/api/user/memories/route.ts` | MODIFY — add embedding on create |
| `src/lib/ai/tools.ts` | MODIFY — add embedding to saveUserMemory |
| `src/components/ai/AIChat.tsx` | MODIFY — add edit message capability |
| `src/components/ai/ChatMessage.tsx` | MODIFY — add edit button |
| `prisma/schema.prisma` | MODIFY — add embedding field to UserMemory |

---

### Task 9: Dynamic Tool Routing

**Files:**
- Create: `src/lib/ai/tool-router.ts`
- Create: `src/lib/ai/__tests__/tool-router.test.ts`
- Modify: `src/app/api/ai/chat/route.ts:160`

**Interfaces:**
- Consumes: `classifyMode(message)` from mode-router, `createAiTools(userId)` from tools.ts
- Produces: `filterToolsByMode(tools, mode): Record<string, Tool>` — filtered tool set

- [ ] **Step 1: Create tool-category mapping in tool-router.ts**

```typescript
import type { AIMode } from "./context-builder"
import { ToolRisk, TOOL_RISK_MAP } from "./tool-registry"

// Which tool categories are relevant per mode
const MODE_TOOL_CATEGORIES: Record<AIMode, ToolRisk[]> = {
  "tracker":     [ToolRisk.READ_ONLY, ToolRisk.LOW_MUTATION, ToolRisk.HIGH_MUTATION],
  "application": [ToolRisk.READ_ONLY, ToolRisk.LOW_MUTATION, ToolRisk.HIGH_MUTATION],
  "jd-scan":     [ToolRisk.READ_ONLY, ToolRisk.LOW_MUTATION, ToolRisk.EXTERNAL],
  "interview":   [ToolRisk.READ_ONLY, ToolRisk.LOW_MUTATION],
  "weekly":      [ToolRisk.READ_ONLY, ToolRisk.LOW_MUTATION],
  "response":    [ToolRisk.READ_ONLY, ToolRisk.LOW_MUTATION],
  "recovery":    [ToolRisk.READ_ONLY, ToolRisk.LOW_MUTATION],
  "profile":     [ToolRisk.READ_ONLY, ToolRisk.LOW_MUTATION],
  "general":     [ToolRisk.READ_ONLY, ToolRisk.LOW_MUTATION],
}

// Always expose safe tools regardless of mode
const ALWAYS_EXPOSE: ToolRisk[] = [ToolRisk.READ_ONLY, ToolRisk.LOW_MUTATION]

// Specific tool overrides per mode (add high-mutation/destructive tools only where needed)
const MODE_SPECIFIC_TOOLS: Partial<Record<AIMode, string[]>> = {
  "tracker": ["createApplication", "updateApplicationStatus", "deleteApplication", "batchImportApplications", "syncToGoogleSheets"],
  "application": ["createApplication", "tailorResumeForJob", "draftOutreachEmail", "sendOutreachEmailViaResend"],
  "jd-scan": ["scrapeJobLink", "researchCompanyIntel", "queryCareerKnowledgeGraph"],
  "interview": ["addPrepQuestions", "savePrepNote", "getPrepNotes", "recordMockInterviewScore"],
  "weekly": ["setWeeklyGoals"],
  "profile": ["syncCareerKnowledgeGraph"],
}

export function filterToolsByMode(
  tools: Record<string, any>,
  mode: AIMode
): Record<string, any> {
  const allowedRisks = MODE_TOOL_CATEGORIES[mode] ?? ALWAYS_EXPOSE
  const allowedSpecific = MODE_SPECIFIC_TOOLS[mode] ?? []

  return Object.fromEntries(
    Object.entries(tools).filter(([name]) => {
      const risk = TOOL_RISK_MAP[name]?.risk ?? ToolRisk.LOW_MUTATION
      return allowedRisks.includes(risk) || allowedSpecific.includes(name)
    })
  )
}
```

- [ ] **Step 2: Write tests**

```typescript
import { describe, it, expect } from "vitest"
import { filterToolsByMode } from "../tool-router"

const mockTools = {
  searchApplications: { name: "searchApplications" },
  createApplication: { name: "createApplication" },
  deleteApplication: { name: "deleteApplication" },
  sendOutreachEmailViaResend: { name: "sendOutreachEmailViaResend" },
  addPrepQuestions: { name: "addPrepQuestions" },
  scrapeJobLink: { name: "scrapeJobLink" },
  setWeeklyGoals: { name: "setWeeklyGoals" },
}

describe("filterToolsByMode", () => {
  it("tracker mode includes application mutation tools", () => {
    const filtered = filterToolsByMode(mockTools, "tracker")
    expect(filtered.searchApplications).toBeDefined()
    expect(filtered.createApplication).toBeDefined()
    expect(filtered.deleteApplication).toBeDefined()
    expect(filtered.sendOutreachEmailViaResend).toBeUndefined()
  })

  it("interview mode excludes external and destructive tools", () => {
    const filtered = filterToolsByMode(mockTools, "interview")
    expect(filtered.searchApplications).toBeDefined()
    expect(filtered.addPrepQuestions).toBeDefined()
    expect(filtered.deleteApplication).toBeUndefined()
    expect(filtered.sendOutreachEmailViaResend).toBeUndefined()
  })

  it("general mode only exposes safe tools", () => {
    const filtered = filterToolsByMode(mockTools, "general")
    expect(filtered.searchApplications).toBeDefined()
    expect(filtered.createApplication).toBeUndefined()
    expect(filtered.deleteApplication).toBeUndefined()
  })
})
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/lib/ai/__tests__/tool-router.test.ts`
Expected: ALL PASS

- [ ] **Step 4: Wire into chat route**

In `src/app/api/ai/chat/route.ts`, after `const tools = createAiTools(userId)`, add:
```typescript
import { classifyMode } from "@/lib/ai/mode-router"
import { filterToolsByMode } from "@/lib/ai/tool-router"

// After creating tools:
const mode = classifyMode(message)
const filteredTools = filterToolsByMode(tools, mode)
```

Then change `tools,` to `tools: filteredTools,` in resilientStreamText call.

- [ ] **Step 5: Run lint + commit**

Run: `npx eslint src/lib/ai/tool-router.ts src/app/api/ai/chat/route.ts`
Expected: 0 errors
Commit: `feat(ai): add dynamic tool routing by mode`

---

### Task 10: Memory Consolidation

**Files:**
- Create: `src/lib/ai/memory-consolidator.ts`
- Create: `src/lib/ai/__tests__/memory-consolidator.test.ts`
- Modify: `prisma/schema.prisma` — add `lastAccessedAt` and `accessCount` fields to UserMemory

**Interfaces:**
- Consumes: Prisma `UserMemory` records
- Produces: `scoreMemory(memory)`, `findMergeableMemories(memories)`, `consolidateMemories(userId)`

- [ ] **Step 1: Add fields to schema.prisma**

```prisma
model UserMemory {
  // ... existing fields ...
  lastAccessedAt DateTime?
  accessCount    Int       @default(0)
}
```

Then run: `npx prisma db push`

- [ ] **Step 2: Create memory-consolidator.ts**

```typescript
import { prisma } from "@/lib/prisma"

interface ScoredMemory {
  id: string
  content: string
  category: string
  confidence: number
  accessCount: number
  createdAt: Date
  score: number
}

/**
 * Calculate importance score based on access frequency and recency.
 */
export function scoreMemory(memory: {
  confidence: number | null
  accessCount: number
  createdAt: Date
  lastAccessedAt: Date | null
}): number {
  const confidence = memory.confidence ?? 1.0
  const accessBoost = Math.min(memory.accessCount / 10, 1.0) // 0-1 based on 0-10 accesses
  const recency = memory.lastAccessedAt
    ? Math.max(0, 1 - (Date.now() - memory.lastAccessedAt.getTime()) / (30 * 24 * 60 * 60 * 1000)) // 30-day decay
    : 0.3

  return confidence * 0.4 + accessBoost * 0.3 + recency * 0.3
}

/**
 * Find memories with similar content that can be merged.
 */
export function findMergeableMemories(
  memories: Array<{ id: string; content: string; category: string }>
): Array<{ keep: string; merge: string; mergedContent: string }>[] {
  const groups: Array<{ keep: string; merge: string; mergedContent: string }[]> = []
  const used = new Set<string>()

  for (const m1 of memories) {
    if (used.has(m1.id)) continue
    const group: { keep: string; merge: string; mergedContent: string }[] = []

    for (const m2 of memories) {
      if (m1.id === m2.id || used.has(m2.id)) continue
      if (m1.category !== m2.category) continue

      const words1 = new Set(m1.content.toLowerCase().split(/\s+/))
      const words2 = m2.content.toLowerCase().split(/\s+/)
      const overlap = words2.filter((w: string) => words1.has(w)).length / words2.length

      if (overlap > 0.6) {
        group.push({ keep: m1.id, merge: m2.id, mergedContent: m1.content })
        used.add(m2.id)
      }
    }

    if (group.length > 0) {
      used.add(m1.id)
      groups.push(group)
    }
  }

  return groups
}

/**
 * Increment access count for a memory.
 */
export async function touchMemory(memoryId: string): Promise<void> {
  await prisma.userMemory.update({
    where: { id: memoryId },
    data: {
      accessCount: { increment: 1 },
      lastAccessedAt: new Date(),
    },
  })
}

/**
 * Remove low-scoring memories below threshold.
 */
export async function pruneStaleMemories(
  userId: string,
  threshold = 0.2,
  minAgeDays = 90
): Promise<number> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - minAgeDays)

  const memories = await prisma.userMemory.findMany({
    where: { userId, createdAt: { lt: cutoff } },
  })

  const scored = memories.map((m) => ({ ...m, score: scoreMemory(m) }))
  const stale = scored.filter((m) => m.score < threshold)

  if (stale.length === 0) return 0

  await prisma.userMemory.deleteMany({
    where: { id: { in: stale.map((m) => m.id) } },
  })

  return stale.length
}
```

- [ ] **Step 3: Write tests**

```typescript
import { describe, it, expect } from "vitest"
import { scoreMemory, findMergeableMemories } from "../memory-consolidator"

describe("scoreMemory", () => {
  it("gives higher score to frequently accessed memory", () => {
    const recent = scoreMemory({
      confidence: 1.0,
      accessCount: 10,
      createdAt: new Date(),
      lastAccessedAt: new Date(),
    })
    const stale = scoreMemory({
      confidence: 1.0,
      accessCount: 0,
      createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      lastAccessedAt: null,
    })
    expect(recent).toBeGreaterThan(stale)
  })

  it("considers confidence in scoring", () => {
    const high = scoreMemory({ confidence: 1.0, accessCount: 5, createdAt: new Date(), lastAccessedAt: new Date() })
    const low = scoreMemory({ confidence: 0.3, accessCount: 5, createdAt: new Date(), lastAccessedAt: new Date() })
    expect(high).toBeGreaterThan(low)
  })
})

describe("findMergeableMemories", () => {
  it("finds similar memories in same category", () => {
    const memories = [
      { id: "1", content: "Prefers React over Vue for frontend", category: "preference" },
      { id: "2", content: "Prefers React over Angular for frontend work", category: "preference" },
      { id: "3", content: "Uses Python for backend", category: "skill" },
    ]
    const mergeable = findMergeableMemories(memories)
    expect(mergeable.length).toBe(1)
    expect(mergeable[0][0].keep).toBe("1")
  })

  it("does not merge across categories", () => {
    const memories = [
      { id: "1", content: "Prefers React for frontend", category: "preference" },
      { id: "2", content: "Prefers React for frontend development", category: "skill" },
    ]
    const mergeable = findMergeableMemories(memories)
    expect(mergeable.length).toBe(0)
  })
})
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/ai/__tests__/memory-consolidator.test.ts`
Expected: ALL PASS

- [ ] **Step 5: Wire touchMemory into context builder**

In `src/lib/ai/context-builder.ts`, after fetching memories, call `touchMemory` for each returned memory (fire-and-forget, don't await).

- [ ] **Step 6: Run lint + commit**

Run: `npx eslint src/lib/ai/memory-consolidator.ts src/lib/ai/context-builder.ts`
Expected: 0 errors
Commit: `feat(ai): add memory consolidation with importance scoring`

---

### Task 11: Vector Search for Memory

**Files:**
- Create: `src/lib/ai/memory-search.ts`
- Create: `src/lib/ai/__tests__/memory-search.test.ts`
- Modify: `prisma/schema.prisma` — add `embedding` field (Unsupported Vector(1536)? or store as JSON)
- Modify: `src/app/api/user/memories/route.ts` — generate embedding on create

**Interfaces:**
- Consumes: OpenAI `text-embedding-3-small` API, Prisma `UserMemory`
- Produces: `generateEmbedding(text)`, `searchSimilarMemories(query, userId, topK)`

- [ ] **Step 1: Add embedding storage to schema**

Since Prisma doesn't support pgvector natively, store embedding as JSON in a `String` field:

```prisma
model UserMemory {
  // ... existing fields ...
  embedding  String?  // JSON-encoded Float array
}
```

Run: `npx prisma db push`

- [ ] **Step 2: Create memory-search.ts**

```typescript
import { openai } from "@ai-sdk/openai"
import { prisma } from "@/lib/prisma"
import { cosineSimilarity } from "./cosine-similarity"

const EMBEDDING_MODEL = "text-embedding-3-small"
const EMBEDDING_DIM = 1536

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embedding(EMBEDDING_MODEL).doEmbed({
    input: text,
  })
  return response.embeddings[0]
}

function serializeEmbedding(vec: number[]): string {
  return JSON.stringify(vec)
}

function deserializeEmbedding(json: string): number[] {
  return JSON.parse(json)
}

/**
 * Search memories by cosine similarity with the query embedding.
 * Uses in-memory comparison (fine for <1000 memories per user).
 */
export async function searchSimilarMemories(
  query: string,
  userId: string,
  topK = 5
): Promise<Array<{ id: string; content: string; category: string; score: number }>> {
  const queryEmbedding = await generateEmbedding(query)

  const memories = await prisma.userMemory.findMany({
    where: { userId, embedding: { not: null } },
  })

  const scored = memories
    .map((m) => {
      const memEmbedding = deserializeEmbedding(m.embedding!)
      return {
        id: m.id,
        content: m.content,
        category: m.category,
        score: cosineSimilarity(queryEmbedding, memEmbedding),
      }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)

  return scored
}
```

- [ ] **Step 3: Create cosine-similarity.ts helper**

```typescript
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  return normA === 0 || normB === 0 ? 0 : dot / (Math.sqrt(normA) * Math.sqrt(normB))
}
```

- [ ] **Step 4: Wire embedding into saveUserMemory tool**

In `src/lib/ai/tools.ts`, after saving memory, generate and store embedding:
```typescript
import { generateEmbedding } from "./memory-search"

// After creating memory:
const embedding = await generateEmbedding(content)
await prisma.userMemory.update({
  where: { id: memory.id },
  data: { embedding: serializeEmbedding(embedding) },
})
```

- [ ] **Step 5: Write tests**

```typescript
import { describe, it, expect } from "vitest"
import { generateEmbedding } from "../memory-search"
import { cosineSimilarity } from "../cosine-similarity"

describe("cosineSimilarity", () => {
  it("returns 1 for identical vectors", () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBe(1)
  })

  it("returns 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0)
  })
})

describe("generateEmbedding", () => {
  it("returns a vector of correct dimension", async () => {
    const embedding = await generateEmbedding("test text")
    expect(embedding.length).toBe(1536)
  })
})
```

- [ ] **Step 6: Run tests + lint + commit**

Run: `npx vitest run src/lib/ai/__tests__/memory-search.test.ts`
Run: `npx eslint src/lib/ai/memory-search.ts src/lib/ai/cosine-similarity.ts`
Commit: `feat(ai): add vector search for semantic memory retrieval`

---

### Task 12: Edit Message

**Files:**
- Modify: `src/components/ai/AIChat.tsx` — add handleEditMessage, edit mode state
- Modify: `src/components/ai/ChatMessage.tsx` — add edit button + inline edit UI

**Interfaces:**
- Consumes: existing `handleRetry(targetId, newText?)` pattern
- Produces: edit button on user messages, inline textarea for editing

- [ ] **Step 1: Add handleEditMessage to AIChat.tsx**

```typescript
// Add state for editing
const [editingMessageId, setEditingMessageId] = useState<string | null>(null)

// Add handler
const handleEditMessage = useCallback((messageId: string, newText: string) => {
  setEditingMessageId(null)
  // Find the message index and truncate history to that point
  const msgIndex = rawMessages.findIndex((m) => m.id === messageId)
  if (msgIndex === -1) return

  const newMessages = rawMessages.slice(0, msgIndex)
  setRawMessages(newMessages)

  // Re-send with edited text
  setTimeout(() => {
    sendMessage(newText)
  }, 50)
}, [rawMessages, sendMessage])

// Pass to ChatMessage
<ChatMessage
  onEdit={handleEditMessage}
  editingMessageId={editingMessageId}
  setEditingMessageId={setEditingMessageId}
/>
```

- [ ] **Step 2: Add edit UI to ChatMessage.tsx**

```typescript
// Add props
interface ChatMessageProps {
  // ... existing props ...
  onEdit?: (messageId: string, newText: string) => void
  editingMessageId?: string | null
  setEditingMessageId?: (id: string | null) => void
}

// For user messages, add edit button (pencil icon) next to retry
// When clicked, replace message text with editable textarea
// Show "Save" and "Cancel" buttons
```

- [ ] **Step 3: Run lint**

Run: `npx eslint src/components/ai/AIChat.tsx src/components/ai/ChatMessage.tsx`
Expected: 0 errors

- [ ] **Step 4: Commit**

Commit: `feat(ui): add edit message capability to AI chat`

---

### Task 13: Final Integration Test + Build

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 2: Run lint**

Run: `npx eslint src/lib/ai/ src/app/api/ai/ src/components/ai/`
Expected: 0 new errors

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: BUILD SUCCESS

- [ ] **Step 4: Fix any issues + commit if needed**

Commit: `chore: Phase 3 final integration fixes`

