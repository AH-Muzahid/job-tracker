# Level 4/5 Autonomous Career Operating System — Master Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Commit after each discrete task.

**Goal:** Elevate CareerTrack from Level 1.5 prompt wrappers into a true Level 4 (Coordinated Multi-Agent Squad) and Level 5 (Proactive, Self-Evolving Autonomous Career Operating System) across all core features.

**Architecture:**
- **Level 3 Core:** Evaluator-Optimizer (Reflexion) loop + Dynamic Career Knowledge Graph RAG + Semantic Reflection.
- **Level 4 Squad:** 5 Specialized Agents (`Scout`, `Strategist`, `Scribe`, `Critic`, `Coach`) coordinated through LangGraph state machine with shared memory and adversarial review.
- **Level 5 Proactivity:** Inngest background event daemons that monitor job lifecycles (stale apps, high matches, upcoming interviews) and autonomously generate staged action packages without waiting for user prompts.
- **Level 5 Self-Evolution:** Real-world outcome feedback loop that automatically adapts prompt weights, boosts winning skills, and penalizes failing patterns when applications transition to `Interview`, `Offer`, or `Rejected`.

**Tech Stack:** Next.js 15, TypeScript, LangGraph, Vercel AI SDK, Inngest, Prisma ORM, Redis, Vitest.

---

## Strict Rules & Constraints (`AGENTS.md`)
1. **Never use Sparkles icon.**
2. **Zero gradient colors** (`bg-gradient-*` strictly prohibited; solid architectural colors only).
3. **Living Tracker Rule (Rule 3):** Update `docs/JOB-DISCOVERY-TRACKER.md` on any discovery/pipeline changes.
4. **Anti-Hallucination Guardrail (Rule 10):** Agents may NEVER invent metrics or technologies not present in verified profile/graph.
5. **Separate Commits:** Commit cleanly after each task.

---

## Master Phase & Task Roadmap

```
PHASE 1: Foundation (Level 3 Reflexion & Context Engine)
  ├── Task 1: Evaluator-Optimizer (Reflexion) Engine [src/lib/ai/evaluator-optimizer.ts]
  ├── Task 2: Autonomous Context Assembler [src/lib/ai/agentic-context.ts]
  ├── Task 3: LangGraph Semantic Reflection Node [src/lib/ai/graph/nodes/reflection.ts]
  └── Commit 1: feat(ai): implement core reflexion engine and dynamic context assembler

PHASE 2: Multi-Agent Squad Orchestration (Level 4)
  ├── Task 4: Agent Roles & Squad Manifest [src/lib/ai/squad/roles.ts]
  ├── Task 5: Coordinated Squad Orchestrator [src/lib/ai/squad/orchestrator.ts]
  ├── Task 6: Upgrade Application Scribe & Cover Letter Agents [src/lib/discovery/cover-letter-agent.ts]
  └── Commit 2: feat(ai): implement level 4 multi-agent squad orchestration

PHASE 3: Proactive Lifecycle Daemons (Level 5)
  ├── Task 7: Inngest Proactive Career Daemon [src/inngest/functions/agent-proactive-daemon.ts]
  ├── Task 8: Proactive Follow-up & Staging Actions API [src/lib/ai/proactive/actions.ts]
  └── Commit 3: feat(ai): implement level 5 proactive background career daemon

PHASE 4: Closed-Loop Self-Evolution Engine (Level 5)
  ├── Task 9: Outcome Feedback Hook on Status Transitions [src/lib/ai/learning-engine.ts]
  ├── Task 10: Adaptive Prompt Calibration for All Agents [src/lib/ai/prompts/adaptive-injector.ts]
  └── Commit 4: feat(ai): implement level 5 closed-loop self-evolving feedback engine

PHASE 5: Verification & Release Readiness
  ├── Task 11: Comprehensive Test Suite & Tracker Update [docs/JOB-DISCOVERY-TRACKER.md]
  └── Task 12: Static Analysis (`tsc --noEmit`) & Release Readiness Report
```

---

## Detailed Task Breakdown

### Task 1: Evaluator-Optimizer (Reflexion) Engine
- **Files:** `src/lib/ai/evaluator-optimizer.ts`, `src/lib/ai/__tests__/evaluator-optimizer.test.ts`
- **Spec:** Reusable function `runEvaluatorOptimizer<TOutput>()` that drafts, runs an adversarial evaluation rubric (no brackets `/[\[\]]/`, length bounds, anti-hallucination, ATS keywords), and passes feedback to the drafter for self-correction (max 2-3 iterations).
- **Test:** Verify self-correction occurs when drafts fail rubrics.

### Task 2: Autonomous Context Assembler (Dynamic Graph & RAG)
- **Files:** `src/lib/ai/agentic-context.ts`, `src/lib/ai/__tests__/agentic-context.test.ts`
- **Spec:** Function `assembleAgenticCandidateContext(userId, jobContext)` that traverses `CareerKnowledgeGraph` via `traverseGraphForJD`, fetches verified project metrics, semantic memories, and weaknesses, formatting an unassailable dossier for all agents.

### Task 3: LangGraph Semantic Reflection Node
- **Files:** `src/lib/ai/graph/nodes/reflection.ts`, `src/lib/ai/__tests__/reflection-node.test.ts`
- **Spec:** Replace dummy `hasResult` check with real semantic evaluation of tool outputs, generating actionable retry guidance.

### Task 4 & 5: Level 4 Multi-Agent Squad Orchestrator
- **Files:** `src/lib/ai/squad/roles.ts`, `src/lib/ai/squad/orchestrator.ts`, `src/lib/ai/__tests__/multi-agent-squad.test.ts`
- **Spec:** Connect 5 specialized personas (`Scout`, `Strategist`, `Scribe`, `Critic`, `Coach`) via a shared LangGraph state graph. Scribe drafts -> Critic evaluates -> Loops until approved or max iterations reached.

### Task 6: Upgrade Application Scribe & Outreach
- **Files:** `src/lib/discovery/cover-letter-agent.ts`, `src/app/api/applications/[id]/outreach/route.ts`
- **Spec:** Seamlessly replace 1-shot `generateText` with the Multi-Agent Squad & Evaluator-Optimizer loop.

### Task 7 & 8: Level 5 Proactive Lifecycle Daemons
- **Files:** `src/inngest/functions/agent-proactive-daemon.ts`, `src/lib/ai/proactive/actions.ts`
- **Spec:** Event-driven Inngest function that detects stale applications (applied > 7 days), high-match jobs (>90%), and automatically generates staged follow-up actions and briefings without waiting for user clicks.

### Task 9 & 10: Level 5 Closed-Loop Self-Evolution Engine
- **Files:** `src/lib/ai/learning-engine.ts`, `src/lib/ai/prompts/adaptive-injector.ts`
- **Spec:** Hook into application status updates (`Interview`, `Offer`, `Rejected`). Boosts winning skills, updates weakness memories, and injects adaptive weights into all agent prompts.

### Task 11 & 12: Audit & Release Readiness
- **Files:** `docs/JOB-DISCOVERY-TRACKER.md`
- **Spec:** Run complete test suite, verify zero TypeScript errors, update living tracker, and produce standard Release Readiness Report.
