# Level 3 Autonomous Agentic AI Maturity Upgrade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform CareerTrack from a Level 1.5 single-shot prompt wrapper into a true Level 3 Autonomous Agent with self-correction (Reflexion/Evaluator-Optimizer loop), autonomous context building (Career Knowledge Graph + Memory RAG), and semantic reflection.

**Architecture:** 
1. Build a generic, reusable Evaluator-Optimizer (Reflexion) loop that drafts, evaluates against strict semantic rubrics (placeholders, length, hallucination), and self-corrects until verified.
2. Build an Autonomous Context Engine that automatically queries the Career Knowledge Graph (`traverseGraphForJD`) and vector memories (`pgvector`) to assemble grounded proof-points without manual user micromanagement.
3. Replace the blind `hasResult` check in LangGraph's `reflection.ts` with an intelligent semantic critic.
4. Upgrade user-facing generation engines (`cover-letter-agent.ts` and outreach endpoints) with this agentic self-correcting foundation.

**Tech Stack:** Next.js 15, TypeScript, LangGraph, Vercel AI SDK (`generateText`), Zod, Prisma ORM, Redis, Vitest.

---

## Global Constraints & User Rules (`AGENTS.md`)
- **Anti-Hallucination Guardrail (Rule 10):** The agent may NEVER invent experience, metrics, or technologies not present in verified `UserMemory` / `CareerKnowledgeGraph`.
- **Living Tracker Rule (Rule 3):** Any modifications to `src/lib/discovery/`, discovery DB schemas, or discovery tests must update `docs/JOB-DISCOVERY-TRACKER.md`.
- **Zero Sparkles & Gradients:** Strict adherence to clean architectural UI rules.
- **Verification Rule:** Backed by real execution (`tsc --noEmit`, Vitest).

---

## File Structure Plan

| File | Action | Responsibility |
| :--- | :--- | :--- |
| `src/lib/ai/evaluator-optimizer.ts` | **CREATE** | Reusable Evaluator-Optimizer (Reflexion) loop with rubric validation |
| `src/lib/ai/__tests__/evaluator-optimizer.test.ts` | **CREATE** | Unit tests verifying self-correction when drafts fail rubrics |
| `src/lib/ai/agentic-context.ts` | **CREATE** | Autonomous context builder leveraging Knowledge Graph & Vector Memory |
| `src/lib/ai/__tests__/agentic-context.test.ts` | **CREATE** | Unit tests for dynamic JD graph traversal and dossier assembly |
| `src/lib/discovery/cover-letter-agent.ts` | **MODIFY** | Upgrade from single-shot `generateText` to autonomous self-correcting engine |
| `src/app/api/applications/[id]/outreach/route.ts` | **MODIFY** | Upgrade on-demand outreach endpoint with Evaluator-Optimizer loop |
| `src/lib/ai/graph/nodes/reflection.ts` | **MODIFY** | Replace blind `hasResult` pass-through with semantic critic and feedback loop |
| `src/lib/ai/__tests__/reflection-node.test.ts` | **CREATE** | Unit tests for LangGraph semantic reflection |
| `docs/JOB-DISCOVERY-TRACKER.md` | **MODIFY** | Update living tracker with audit log and completed milestones |

---

## Task 1: Evaluator-Optimizer (Reflexion) Engine

**Files:**
- Create: `src/lib/ai/evaluator-optimizer.ts`
- Create: `src/lib/ai/__tests__/evaluator-optimizer.test.ts`

**Overview:**
Create a high-performance, robust Evaluator-Optimizer loop. If a draft fails quality checks (e.g. contains placeholders like `[Hiring Manager]`, exceeds character constraints, or omits mandatory keywords), the engine automatically executes a targeted critique-and-refine prompt loop (up to max iterations, default 2-3) before returning. If the loop exhausts retries, it applies deterministic sanitization.

### Step 1.1: Write the failing unit tests
- [ ] Create `src/lib/ai/__tests__/evaluator-optimizer.test.ts`.
- [ ] Test 1: Evaluator detects square-bracket placeholders (`[Candidate Name]`, `[Company]`) and triggers refinement.
- [ ] Test 2: Optimizer passes the critic's structured feedback back to the generator.
- [ ] Test 3: Evaluator enforces character limits (e.g. LinkedIn connect <= 300 chars).
- [ ] Test 4: Deterministic fallback takes over if max iterations exceeded.
- [ ] Run `npx vitest run src/lib/ai/__tests__/evaluator-optimizer.test.ts` (Ensure tests fail / file not found).

### Step 1.2: Implement `src/lib/ai/evaluator-optimizer.ts`
- [ ] Define `EvaluationRubric`:
  ```typescript
  export interface EvaluationRubric {
    disallowPlaceholders?: boolean
    maxCharacters?: number
    minCharacters?: number
    requiredKeywords?: string[]
    customRuleDescription?: string
    customValidator?: (content: string) => { passed: boolean; feedback?: string }
  }
  ```
- [ ] Define `evaluateDraft(content: string, rubric: EvaluationRubric): { passed: boolean; violations: string[] }`.
- [ ] Implement `runEvaluatorOptimizer<TOutput>()` loop:
  - Generate initial draft using `generateText`.
  - Run evaluation.
  - If passed, return immediately (1-shot latency when quality is high).
  - If failed, construct a focused critique prompt containing the previous draft and exact violations.
  - Iterate up to `maxIterations` (default 2).
  - Return `{ result: TOutput, iterations: number, selfCorrected: boolean, violations: string[] }`.

### Step 1.3: Run tests and verify
- [ ] Run `npx vitest run src/lib/ai/__tests__/evaluator-optimizer.test.ts` to ensure 100% passing.

---

## Task 2: Autonomous Context Assembler (Dynamic Knowledge Graph & RAG)

**Files:**
- Create: `src/lib/ai/agentic-context.ts`
- Create: `src/lib/ai/__tests__/agentic-context.test.ts`

**Overview:**
Eliminate manual context feeding. Instead of hardcoding `profile.bestProjects[0]`, the agent autonomously traverses the candidate's `CareerKnowledgeGraph` using the existing `traverseGraphForJD` function, queries semantic memory embeddings, and fetches prior interview weaknesses.

### Step 2.1: Write the failing unit tests
- [ ] Create `src/lib/ai/__tests__/agentic-context.test.ts`.
- [ ] Test 1: Assembles grounded proof points from Career Knowledge Graph for a target JD.
- [ ] Test 2: Identifies missing skills and flags them as caution areas (preventing hallucination).
- [ ] Test 3: Formats a clean, high-density system context string ready for LLM consumption.
- [ ] Run `npx vitest run src/lib/ai/__tests__/agentic-context.test.ts` (Ensure tests fail).

### Step 2.2: Implement `src/lib/ai/agentic-context.ts`
- [ ] Interface `GroundedCandidateDossier`:
  ```typescript
  export interface GroundedCandidateDossier {
    candidateName: string
    candidateEmail?: string
    links: { github?: string; linkedin?: string; portfolio?: string }
    matchedSkills: Array<{ skill: string; proofProjects: Array<{ projectName: string; metrics: string[] }> }>
    missingSkills: string[]
    bestProjects: any[]
    weaknessesToCounteract: string[]
    summaryContextText: string
  }
  ```
- [ ] Implement `assembleAgenticCandidateContext(userId: string, jobContext: { jobTitle: string; companyName: string; jdText?: string })`.
- [ ] Integrate `traverseGraphForJD` from `@/lib/ai/knowledge-graph`.
- [ ] Integrate `getUserWeaknesses` and profile links.

### Step 2.3: Run tests and verify
- [ ] Run `npx vitest run src/lib/ai/__tests__/agentic-context.test.ts` to ensure 100% passing.

---

## Task 3: Upgrade `cover-letter-agent.ts` & Outreach Engine to Level 3

**Files:**
- Modify: `src/lib/discovery/cover-letter-agent.ts`
- Modify: `src/app/api/applications/[id]/outreach/route.ts`
- Test: `src/__tests__/cover-letter-agent.test.ts`
- Test: `src/__tests__/outreach-multi-channel.test.ts`

**Overview:**
Replace the single-shot prompt wrapper in `cover-letter-agent.ts` and `/api/applications/[id]/outreach` with the `assembleAgenticCandidateContext` and `runEvaluatorOptimizer` loop.

### Step 3.1: Update `cover-letter-agent.ts`
- [ ] Import `assembleAgenticCandidateContext` and `runEvaluatorOptimizer`.
- [ ] Replace hardcoded project selection with the grounded dossier.
- [ ] Wrap generation in `runEvaluatorOptimizer`:
  - Enforce zero placeholders.
  - Enforce grounding in candidate's matched skills and proof projects.
  - If the LLM generates `[Company Name]`, the critic catches it, feeds it back, and the LLM self-corrects.
- [ ] Ensure deterministic fallbacks remain completely resilient for users without API keys.

### Step 3.2: Update `/api/applications/[id]/outreach/route.ts`
- [ ] Integrate `runEvaluatorOptimizer` for on-demand single channel generation (e.g. `linkedin_connect` <= 300 chars).
- [ ] Verify that if generated text exceeds 300 chars, the evaluator triggers self-correction to compress it.

### Step 3.3: Run tests
- [ ] Run `npx vitest run src/__tests__/cover-letter-agent.test.ts`.
- [ ] Run `npx vitest run src/__tests__/outreach-multi-channel.test.ts`.

---

## Task 4: Upgrade LangGraph Reflection Node to Semantic Critic

**Files:**
- Modify: `src/lib/ai/graph/nodes/reflection.ts`
- Create: `src/lib/ai/__tests__/reflection-node.test.ts`

**Overview:**
Turn `src/lib/ai/graph/nodes/reflection.ts` from a dummy `hasResult` check into a semantic critic that inspects step outcomes, detects tool failures or malformed outputs, and generates actionable retry guidance.

### Step 4.1: Write failing test for reflection node
- [ ] Create `src/lib/ai/__tests__/reflection-node.test.ts`.
- [ ] Test 1: When step fails with a retryable error, generates structured feedback and requests retry (`passed: false`).
- [ ] Test 2: When tool returns empty data (e.g. 0 jobs found for query), reflection suggests query relaxation instead of blind `passed: true`.
- [ ] Test 3: When step succeeds with valid data, records verified rationale and advances (`passed: true`).

### Step 4.2: Implement semantic reflection in `reflection.ts`
- [ ] Upgrade `createReflectionNode()` to inspect `currentStep.result` content:
  - If output contains error message or empty collection where items were expected, flag feedback and trigger retry if under retry limit.
  - Provide actionable context for the executor node.

### Step 4.3: Run tests
- [ ] Run `npx vitest run src/lib/ai/__tests__/reflection-node.test.ts`.

---

## Task 5: Living Tracker Update & Full Verification Pipeline

**Files:**
- Modify: `docs/JOB-DISCOVERY-TRACKER.md`

### Step 5.1: Update living tracker
- [ ] Log the architectural upgrade to `docs/JOB-DISCOVERY-TRACKER.md` as required by AGENTS.md Rule 3.
- [ ] Record modified files, testing status, and design decisions.

### Step 5.2: Static Analysis & Full Test Suite
- [ ] Run `npm run lint` or `npx eslint` on modified files.
- [ ] Run `npx tsc --noEmit` to verify 0 type errors.
- [ ] Run `npx vitest run` across all AI, discovery, and outreach suites.

### Step 5.3: Produce Release Readiness Report
- [ ] Produce the standard AGENTS.md Release Readiness Report:
  - Architecture Score, Security Score, Performance Score, Maintainability Score.
  - Decision: RELEASE READY.
