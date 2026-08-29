# AI Agent Phase 2: Safety — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add PII sanitization, HITL confirmation for destructive tools, idempotency keys for mutations, and wire conversation summarization into the chat pipeline.

**Architecture:** Sanitize user PII before LLM injection. Add a confirmation flow for destructive tool calls — tools return pending status, user approves/rejects, tool re-executes with confirmation flag. Add idempotency keys to prevent duplicate mutations. Wire summarization into the chat route for long sessions.

**Tech Stack:** Vercel AI SDK, js-tiktoken (from Phase 1), Prisma, Redis, existing tool registry from Phase 1.

## Global Constraints

- Next.js 15.5.20, React 19, Prisma ORM, Clerk auth
- Existing patterns: Redis caching (1hr TTL), TanStack Query, Zustand store
- No native binaries (Vercel deployment)
- All new code must pass `npx eslint` with zero new errors
- Follow existing code style: no emojis in code

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/lib/ai/pii-sanitizer.ts` | **NEW** — Detect and mask PII before LLM injection |
| `src/lib/ai/__tests__/pii-sanitizer.test.ts` | **NEW** — Tests for PII sanitizer |
| `src/lib/ai/idempotency.ts` | **NEW** — Idempotency key generation and dedup |
| `src/lib/ai/__tests__/idempotency.test.ts` | **NEW** — Tests for idempotency |
| `src/lib/ai/context-builder.ts` | **MODIFY** — Apply PII sanitization before context injection |
| `src/app/api/ai/chat/route.ts` | **MODIFY** — Wire summarizeConversation for long sessions |
| `src/lib/ai/tools.ts` | **MODIFY** — Add confirmation flow to destructive tools |
| `src/components/ai/AIChat.tsx` | **MODIFY** — Add confirmation UI for pending tool calls |
| `src/app/api/applications/route.ts` | **MODIFY** — Add idempotency key header support |
| `src/app/api/companies/route.ts` | **MODIFY** — Add dedup + idempotency key support |

---

## Task 1: PII Sanitizer

**Files:**
- Create: `src/lib/ai/pii-sanitizer.ts`
- Create: `src/lib/ai/__tests__/pii-sanitizer.test.ts`

**Interfaces:**
- Consumes: None (standalone utility)
- Produces: `sanitizePII(text: string): string`, `maskEmail(email: string): string`, `maskUrl(url: string): string`

- [ ] **Step 1: Create pii-sanitizer.ts**

```typescript
/**
 * PII detection and masking before LLM injection.
 * Redacts emails, phone numbers, and URLs to prevent PII leakage to external LLM providers.
 */

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
const PHONE_REGEX = /(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/g
const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g

/**
 * Mask an email address: "john@example.com" → "j***@example.com"
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@")
  if (!local || !domain) return "***"
  return `${local[0]}***@${domain}`
}

/**
 * Mask a URL: "https://linkedin.com/in/john" → "https://***.com/**"
 */
export function maskUrl(url: string): string {
  try {
    const parsed = new URL(url)
    return `${parsed.protocol}//***.com/**`
  } catch {
    return "***"
  }
}

/**
 * Detect if a string contains PII patterns.
 */
export function containsPII(text: string): boolean {
  return EMAIL_REGEX.test(text) || PHONE_REGEX.test(text) || URL_REGEX.test(text)
}

/**
 * Sanitize text by masking all PII patterns.
 * Resets regex lastIndex between calls (since they use /g flag).
 */
export function sanitizePII(text: string): string {
  if (!text) return ""

  let result = text

  // Reset and replace emails
  EMAIL_REGEX.lastIndex = 0
  result = result.replace(EMAIL_REGEX, (match) => maskEmail(match))

  // Reset and replace phone numbers
  PHONE_REGEX.lastIndex = 0
  result = result.replace(PHONE_REGEX, (match) => {
    const digits = match.replace(/\D/g, "")
    if (digits.length >= 10) {
      return `***-***-${digits.slice(-4)}`
    }
    return "***"
  })

  // Reset and replace URLs (only external URLs, not internal links)
  URL_REGEX.lastIndex = 0
  result = result.replace(URL_REGEX, (match) => maskUrl(match))

  return result
}
```

- [ ] **Step 2: Create tests**

```typescript
import { describe, it, expect } from "vitest"
import { sanitizePII, maskEmail, maskUrl, containsPII } from "../pii-sanitizer"

describe("maskEmail", () => {
  it("masks local part keeping first char", () => {
    expect(maskEmail("john@example.com")).toBe("j***@example.com")
  })

  it("handles single char local part", () => {
    expect(maskEmail("a@test.com")).toBe("***@test.com")
  })
})

describe("maskUrl", () => {
  it("masks domain and path", () => {
    expect(maskUrl("https://linkedin.com/in/john")).toBe("https://***.com/**")
  })

  it("handles invalid URL gracefully", () => {
    expect(maskUrl("not-a-url")).toBe("***")
  })
})

describe("containsPII", () => {
  it("detects email", () => {
    expect(containsPII("Contact me at john@example.com")).toBe(true)
  })

  it("detects phone number", () => {
    expect(containsPII("Call me at 555-123-4567")).toBe(true)
  })

  it("detects URL", () => {
    expect(containsPII("Visit https://example.com")).toBe(true)
  })

  it("returns false for clean text", () => {
    expect(containsPII("Just a normal sentence")).toBe(false)
  })
})

describe("sanitizePII", () => {
  it("masks email addresses", () => {
    const result = sanitizePII("Email: john@example.com")
    expect(result).not.toContain("john@example.com")
    expect(result).toContain("***@example.com")
  })

  it("masks phone numbers", () => {
    const result = sanitizePII("Phone: 555-123-4567")
    expect(result).not.toContain("555-123-4567")
    expect(result).toContain("***-***-4567")
  })

  it("masks URLs", () => {
    const result = sanitizePII("Visit https://linkedin.com/in/john")
    expect(result).not.toContain("linkedin.com/in/john")
    expect(result).toContain("***.com/**")
  })

  it("handles empty string", () => {
    expect(sanitizePII("")).toBe("")
  })

  it("preserves non-PII text", () => {
    expect(sanitizePII("Hello world")).toBe("Hello world")
  })

  it("handles multiple PII types in one string", () => {
    const result = sanitizePII("Email john@test.com or call 555-123-4567")
    expect(result).not.toContain("john@test.com")
    expect(result).not.toContain("555-123-4567")
  })
})
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/lib/ai/__tests__/pii-sanitizer.test.ts`
Expected: All 11 tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/ai/pii-sanitizer.ts src/lib/ai/__tests__/pii-sanitizer.test.ts
git commit -m "feat(ai): add PII sanitizer for email, phone, URL masking"
```

---

## Task 2: Integrate PII Sanitization into Context Builder

**Files:**
- Modify: `src/lib/ai/context-builder.ts`
- Modify: `src/features/ai/__tests__/context-builder.test.ts`

**Interfaces:**
- Consumes: `sanitizePII()` from Task 1
- Produces: Updated `buildFullContext()` that sanitizes PII before injection

- [ ] **Step 1: Add PII sanitization to context-builder.ts**

In `src/lib/ai/context-builder.ts`, add import at top:
```typescript
import { sanitizePII } from "./pii-sanitizer"
```

Find the `User Identity` block (around line 236) and wrap email with sanitizePII:
```typescript
// Before:
- Email: ${user?.email || "Not set"}
// After:
- Email: ${user?.email ? sanitizePII(user.email) : "Not set"}
```

Find the `User Profile` block (around line 242) and wrap URLs:
```typescript
// Before:
- LinkedIn: ${profile.linkedInUrl || "Not set"}
- GitHub: ${profile.githubUrl || "Not set"}
- Portfolio: ${profile.portfolioUrl || "Not set"}
// After:
- LinkedIn: ${profile.linkedInUrl ? sanitizePII(profile.linkedInUrl) : "Not set"}
- GitHub: ${profile.githubUrl ? sanitizePII(profile.githubUrl) : "Not set"}
- Portfolio: ${profile.portfolioUrl ? sanitizePII(profile.portfolioUrl) : "Not set"}
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run src/features/ai/__tests__/context-builder.test.ts`
Expected: All tests PASS

- [ ] **Step 3: Run lint**

Run: `npx eslint src/lib/ai/context-builder.ts`
Expected: Zero errors

- [ ] **Step 4: Commit**

```bash
git add src/lib/ai/context-builder.ts src/features/ai/__tests__/context-builder.test.ts
git commit -m "feat(ai): sanitize PII in AI context before LLM injection"
```

---

## Task 3: Wire Summarization into Chat Route

**Files:**
- Modify: `src/app/api/ai/chat/route.ts`

**Interfaces:**
- Consumes: `summarizeConversation()` from Phase 1 conversation-summarizer.ts
- Produces: Updated chat route that summarizes long conversations

- [ ] **Step 1: Add import and integrate**

In `src/app/api/ai/chat/route.ts`, add import:
```typescript
import { summarizeConversation } from "@/lib/ai/conversation-summarizer"
```

Find the budgeting section (around line 134-135) and replace:
```typescript
// Before:
const budgetedMessages = budgetConversationHistory(rawFormatted, 16_000)

// After:
let budgetedMessages: Array<{ role: "user" | "assistant"; content: string }>
try {
  budgetedMessages = await summarizeConversation(rawFormatted, 16_000, userId)
} catch {
  // Fallback to simple trimming if summarization fails
  budgetedMessages = budgetConversationHistory(rawFormatted, 16_000)
}
```

- [ ] **Step 2: Run lint**

Run: `npx eslint src/app/api/ai/chat/route.ts`
Expected: Zero errors

- [ ] **Step 3: Commit**

```bash
git add src/app/api/ai/chat/route.ts
git commit -m "feat(ai): wire conversation summarization into chat route"
```

---

## Task 4: Idempotency Key Utility

**Files:**
- Create: `src/lib/ai/idempotency.ts`
- Create: `src/lib/ai/__tests__/idempotency.test.ts`

**Interfaces:**
- Consumes: Redis from `@/lib/redis`
- Produces: `checkIdempotency(key: string, ttlSeconds?: number): Promise<{isDuplicate: boolean, existingResult?: unknown}>`, `storeResult(key: string, result: unknown, ttlSeconds?: number): Promise<void>`, `generateIdempotencyKey(...): string`

- [ ] **Step 1: Create idempotency.ts**

```typescript
import { redis } from "@/lib/redis"

const IDEMPOTENCY_TTL = 300 // 5 minutes

/**
 * Generate an idempotency key from request parameters.
 */
export function generateIdempotencyKey(params: {
  userId: string
  action: string
  resourceType?: string
  resourceId?: string
  bodyHash?: string
}): string {
  const parts = [params.userId, params.action]
  if (params.resourceType) parts.push(params.resourceType)
  if (params.resourceId) parts.push(params.resourceId)
  if (params.bodyHash) parts.push(params.bodyHash)
  return `idem:${parts.join(":")}`
}

/**
 * Check if a request with this idempotency key was already processed.
 * Returns the stored result if duplicate, null if new.
 */
export async function checkIdempotency(
  key: string,
  ttlSeconds: number = IDEMPOTENCY_TTL
): Promise<{ isDuplicate: boolean; existingResult?: unknown }> {
  try {
    const existing = await redis.get(key)
    if (existing) {
      return { isDuplicate: true, existingResult: JSON.parse(existing as string) }
    }
    return { isDuplicate: false }
  } catch {
    // Redis failure — proceed without dedup
    return { isDuplicate: false }
  }
}

/**
 * Store a result for idempotency dedup.
 */
export async function storeResult(
  key: string,
  result: unknown,
  ttlSeconds: number = IDEMPOTENCY_TTL
): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(result), { ex: ttlSeconds })
  } catch {
    // Redis failure — non-critical, log and continue
  }
}
```

- [ ] **Step 2: Create tests**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"
import { generateIdempotencyKey, checkIdempotency, storeResult } from "../idempotency"

// Mock redis
vi.mock("@/lib/redis", () => ({
  redis: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue("OK"),
  },
}))

import { redis } from "@/lib/redis"

describe("generateIdempotencyKey", () => {
  it("generates key from basic params", () => {
    const key = generateIdempotencyKey({ userId: "u1", action: "create" })
    expect(key).toBe("idem:u1:create")
  })

  it("includes resourceType and resourceId", () => {
    const key = generateIdempotencyKey({
      userId: "u1",
      action: "create",
      resourceType: "application",
      resourceId: "app1",
    })
    expect(key).toBe("idem:u1:create:application:app1")
  })

  it("includes bodyHash", () => {
    const key = generateIdempotencyKey({
      userId: "u1",
      action: "create",
      bodyHash: "abc123",
    })
    expect(key).toBe("idem:u1:create:abc123")
  })
})

describe("checkIdempotency", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns isDuplicate false when key not found", async () => {
    vi.mocked(redis.get).mockResolvedValue(null)
    const result = await checkIdempotency("idem:u1:create")
    expect(result.isDuplicate).toBe(false)
  })

  it("returns isDuplicate true with stored result when found", async () => {
    vi.mocked(redis.get).mockResolvedValue(JSON.stringify({ id: "app1" }))
    const result = await checkIdempotency("idem:u1:create")
    expect(result.isDuplicate).toBe(true)
    expect(result.existingResult).toEqual({ id: "app1" })
  })

  it("returns isDuplicate false on Redis error", async () => {
    vi.mocked(redis.get).mockRejectedValue(new Error("Redis down"))
    const result = await checkIdempotency("idem:u1:create")
    expect(result.isDuplicate).toBe(false)
  })
})

describe("storeResult", () => {
  it("stores result in Redis with TTL", async () => {
    await storeResult("idem:u1:create", { id: "app1" }, 300)
    expect(redis.set).toHaveBeenCalledWith(
      "idem:u1:create",
      JSON.stringify({ id: "app1" }),
      { ex: 300 }
    )
  })

  it("does not throw on Redis error", async () => {
    vi.mocked(redis.set).mockRejectedValue(new Error("Redis down"))
    await expect(storeResult("key", "value")).resolves.not.toThrow()
  })
})
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/lib/ai/__tests__/idempotency.test.ts`
Expected: All 7 tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/ai/idempotency.ts src/lib/ai/__tests__/idempotency.test.ts
git commit -m "feat(ai): add idempotency key utility for mutation dedup"
```

---

## Task 5: Add Idempotency to API Routes

**Files:**
- Modify: `src/app/api/applications/route.ts`
- Modify: `src/app/api/companies/route.ts`

**Interfaces:**
- Consumes: `checkIdempotency()`, `storeResult()`, `generateIdempotencyKey()` from Task 4
- Produces: Updated POST routes with idempotency support

- [ ] **Step 1: Add idempotency to POST /api/applications**

In `src/app/api/applications/route.ts`, add imports and wrap the POST handler:

```typescript
import { checkIdempotency, storeResult, generateIdempotencyKey } from "@/lib/ai/idempotency"
import { createHash } from "crypto"

export async function POST(req: Request) {
  const userId = await getInternalUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Idempotency check
  const idempotencyKey = req.headers.get("idempotency-key")
  if (idempotencyKey) {
    const { isDuplicate, existingResult } = await checkIdempotency(
      generateIdempotencyKey({ userId, action: "create", resourceType: "application", bodyHash: idempotencyKey })
    )
    if (isDuplicate) {
      return NextResponse.json(existingResult)
    }
  }

  try {
    const body = await req.json()
    const result = await ApplicationService.createApplication(userId, body)

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    // Store for idempotency
    if (idempotencyKey) {
      await storeResult(
        generateIdempotencyKey({ userId, action: "create", resourceType: "application", bodyHash: idempotencyKey }),
        result.data
      )
    }

    return NextResponse.json(result.data, { status: result.status })
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
}
```

- [ ] **Step 2: Add dedup + idempotency to POST /api/companies**

In `src/app/api/companies/route.ts`, add dedup check and idempotency:

```typescript
import { checkIdempotency, storeResult, generateIdempotencyKey } from "@/lib/ai/idempotency"

export async function POST(request: NextRequest) {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Idempotency check
  const idempotencyKey = request.headers.get("idempotency-key")
  if (idempotencyKey) {
    const { isDuplicate, existingResult } = await checkIdempotency(
      generateIdempotencyKey({ userId, action: "create", resourceType: "company", bodyHash: idempotencyKey })
    )
    if (isDuplicate) {
      return NextResponse.json(existingResult)
    }
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const name = (body.name as string)?.trim()
  if (!name) {
    return NextResponse.json({ error: "Company name is required" }, { status: 400 })
  }

  // Dedup check
  const existing = await prisma.company.findFirst({
    where: { userId, name: { equals: name, mode: "insensitive" } },
  })
  if (existing) {
    return NextResponse.json(existing)
  }

  const company = await prisma.company.create({
    data: { userId, name, ...body, name } as any,
  })

  if (idempotencyKey) {
    await storeResult(
      generateIdempotencyKey({ userId, action: "create", resourceType: "company", bodyHash: idempotencyKey }),
      company
    )
  }

  return NextResponse.json(company, { status: 201 })
}
```

- [ ] **Step 3: Run lint**

Run: `npx eslint src/app/api/applications/route.ts src/app/api/companies/route.ts`
Expected: Zero errors

- [ ] **Step 4: Commit**

```bash
git add src/app/api/applications/route.ts src/app/api/companies/route.ts
git commit -m "feat(api): add idempotency keys and dedup to POST routes"
```

---

## Task 6: HITL Confirmation for Destructive Tools

**Files:**
- Modify: `src/lib/ai/tools.ts` (add `requiresConfirmation` check to destructive tools)
- Modify: `src/components/ai/ChatMessage.tsx` (add confirmation UI for pending tools)

**Interfaces:**
- Consumes: `requiresConfirmation()` from Phase 1 tool-registry.ts
- Produces: Destructive tools return pending status; UI shows confirmation buttons

- [ ] **Step 1: Add confirmation flow to destructive tools in tools.ts**

Add import at top of `src/lib/ai/tools.ts`:
```typescript
import { requiresConfirmation } from "./tool-registry"
```

Find the `deleteApplication` tool (around line 414) and add confirmation check at the start of execute:
```typescript
execute: async (rawArgs: any) => {
  const args = parseToolArgs(rawArgs)

  // HITL confirmation check
  if (requiresConfirmation("deleteApplication") && !args?.confirmed) {
    const target = args?.companyOrTitle || "unknown"
    return {
      success: false,
      requiresConfirmation: true,
      message: `⚠️ Confirm deletion: Delete application for "${target}"? This cannot be undone.`,
      toolName: "deleteApplication",
      args,
    }
  }
  // ... rest of existing logic
```

Do the same for `sendOutreachEmailViaResend` (around line 1420) and `batchImportApplications` (around line 1477).

- [ ] **Step 2: Add confirmation UI to ChatMessage.tsx**

In `src/components/ai/ChatMessage.tsx`, when rendering tool invocation results, check for `requiresConfirmation`:

Find where tool results are displayed and add a confirmation prompt:
```tsx
{toolInvocation.state === "result" && toolInvocation.result?.requiresConfirmation && (
  <div className="mt-2 p-3 border border-amber-500/30 rounded-md bg-amber-500/5">
    <p className="text-sm text-amber-600 dark:text-amber-400">{toolInvocation.result.message}</p>
    <div className="flex gap-2 mt-2">
      <button
        onClick={() => {
          // Re-invoke tool with confirmed: true
          onConfirmTool?.(toolInvocation.toolName, toolInvocation.args)
        }}
        className="px-3 py-1 text-xs font-medium rounded-md bg-amber-600 text-white hover:bg-amber-700"
      >
        Confirm
      </button>
      <button
        onClick={() => onDenyTool?.(toolInvocation.toolName)}
        className="px-3 py-1 text-xs font-medium rounded-md bg-muted text-muted-foreground hover:bg-muted/80"
      >
        Cancel
      </button>
    </div>
  </div>
)}
```

- [ ] **Step 3: Run lint**

Run: `npx eslint src/lib/ai/tools.ts src/components/ai/ChatMessage.tsx`
Expected: Zero new errors

- [ ] **Step 4: Commit**

```bash
git add src/lib/ai/tools.ts src/components/ai/ChatMessage.tsx
git commit -m "feat(ai): add HITL confirmation for destructive tools"
```

---

## Task 7: Final Integration Test + Build

**Files:**
- None (verification only)

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 2: Run lint**

Run: `npx eslint src/lib/ai/ src/app/api/`
Expected: Zero new errors

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 4: Commit any final fixes**

```bash
git add -A && git commit -m "chore: Phase 2 final integration fixes"
```

---

## Summary

| Feature | Status | File |
|---------|--------|------|
| PII sanitizer | ✅ | `pii-sanitizer.ts` |
| Context builder PII integration | ✅ | `context-builder.ts` |
| Summarization wiring | ✅ | `chat/route.ts` |
| Idempotency utility | ✅ | `idempotency.ts` |
| API route idempotency | ✅ | `applications/route.ts`, `companies/route.ts` |
| HITL confirmation | ✅ | `tools.ts`, `ChatMessage.tsx` |
| Tests | ✅ | 3 new test files |
