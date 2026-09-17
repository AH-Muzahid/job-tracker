# 🚀 CareerTrack Interview Feature Implementation Plan

> **Document Type**: Technical Implementation & Architecture Plan  
> **Source Audit**: [`docs/INTERVIEW-AUDIT-REPORT.md`](./INTERVIEW-AUDIT-REPORT.md)  
> **Living Tracker**: [`docs/INTERVIEW-IMPLEMENTATION-TRACKER.md`](./INTERVIEW-IMPLEMENTATION-TRACKER.md)  
> **Target Completion**: 95+ / 100 Production Readiness  
> **Date**: September 17, 2026  

---

## 1. Executive Summary & Strategy

This implementation plan translates the forensic audit of the CareerTrack Interview Prep system into an actionable engineering delivery plan. The objective is to elevate the current prototype (~45% production readiness) to an autonomous, reliable, and secure **Level 3 Interview Agent** within 5 targeted sprints.

---

## 2. Prioritization Framework

Every finding from the audit is categorized by risk and business criticality:

| Priority | Definition | Action Rule | SLA |
| :--- | :--- | :--- | :--- |
| **P0: Critical** | Broken user flows (404s), session loss, security exploits (IDOR, prompt injection) | Immediate fix before any feature expansion | 48 Hours |
| **P1: High** | Missing relational links, inaccurate phase prompts, illegal scraping, schema gaps | Core stability and data integrity sprint | 1–2 Weeks |
| **P2: Medium** | Cross-session memory, dead code cleanup, phantom tool sync | AI personalization and architectural hygiene | 2–3 Weeks |
| **P3: Low** | Cosmetic UX bugs, unused prompt cleanup | Polish and minor enhancements | 4 Weeks |

### P0 Critical Issues
1. **P0-1: Broken Concept Lab Route (404)** — `ConceptLabTab.tsx` calls missing `/api/ai/prep-chat`.
2. **P0-2: Broken Notification Reminder Link (404)** — `reminders/route.ts` links to non-existent `/prep`.
3. **P0-3: Accidental Modal Destruction** — Radix outside click or `Esc` key wipes out active 15m voice interviews.
4. **P0-4: IDOR Security Hole in Prep Notes** — `POST /api/prep-notes` allows cross-tenant `applicationId` attachment.
5. **P0-5: Prompt Injection via Unsanitized Input** — Raw interpolation of `targetCompany` in `converse/route.ts`.

---

## 3. Feature Status Matrix

| Feature | Current Status | Completion % | Priority | Dependencies | Effort |
| :--- | :--- | :---: | :---: | :--- | :---: |
| **Mock Interview Voice Engine** | Partially Complete (Active) | 70% | **P0** | Web Speech API, TTS | 3 Days |
| **Feedback & STAR Debrief Engine**| Complete (Active) | 85% | **P1** | Vercel AI SDK, Zod | 2 Days |
| **Revision Notes & Gap Doctor** | Complete (Active) | 80% | **P0** | Prisma `PrepNote` | 1 Day |
| **Concept Lab & AI Tutor** | Broken (404 Route) | 40% | **P0** | Study Assistant API | 1 Day |
| **Interview Scheduling & Calendar**| Missing | 10% | **P1** | Prisma `Application` | 4 Days |
| **Company Research System** | Missing (Phantom Stub) | 0% | **P1** | Web Search Tool, Firecrawl/Exa | 5 Days |
| **Interview Preparation Engine** | Missing | 0% | **P1** | Inngest, LangGraph | 5 Days |
| **Interview Reminder Automation** | Broken (404 Action URL) | 25% | **P0** | Inngest, Notifications | 2 Days |
| **Cross-Session Memory & Mastery**| Missing | 0% | **P2** | pgvector, `UserMemory` | 4 Days |
| **Real-World Post Debrief** | Missing | 0% | **P2** | Application Detail Header | 3 Days |

---

## 4. Architecture Decisions

| Component / Module | Decision | Rationale | Migration Strategy |
| :--- | :---: | :--- | :--- |
| `ConversationalVoiceInterviewModal` | **REFACTOR** | Core room works; needs backdrop guard & dynamic phase prompt | Retain speech hooks; add Radix event interception |
| `ConceptLabTab.tsx` | **REFACTOR** | Broken 404; backend exists under mismatched path & schema | Rewire to study-assistant and normalize schemas |
| `VoiceMockInterviewModal.tsx` | **REMOVE** | 100% superseded by conversational voice modal | Delete file; move shared types to `types.ts` |
| `/api/ai/mock-interview/evaluate` | **REMOVE** | Orphaned route for dead modal | Delete route |
| `/api/ai/tts` (`tw-ob` scraper) | **REWRITE** | Illegal scraper; 10 req/min lock causes frequent voice failure | Rewrite using OpenAI TTS or browser fallback |
| `model PrepQuestion` & routes | **REMOVE** | Zombie entity; zero UI consumers bloating migrations | Drop table via Prisma migration; clean routes |
| `model InterviewSession` | **REFACTOR** | Lacks relational link to job app preventing unified history | Add `applicationId` FK and indices on `[userId, score]` |
| `model Application` (Interview Ext) | **REFACTOR** | Lacks scheduling data (date, round, meetingUrl, interviewer) | Add `interviewDate`, round, meetingUrl to Application |
| Tool Registry (Phantom Tools) | **REFACTOR** | Tools registered but unhandled by runtime tool dispatcher | Implement handlers in `executeToolByName` or prune |

---

## 5. Technical Debt Elimination Plan

Execute cleanup in exact sequence to prevent broken build references:

```
Step 1: Extract Shared Types (MockQuestion -> conversational/types.ts)
  │
  ▼
Step 2: Delete Dead UI Components (VoiceMockInterviewModal.tsx, InterviewPrepResult.tsx)
  │
  ▼
Step 3: Remove Dead Routes (/api/mock-interview/evaluate)
  │
  ▼
Step 4: Prune Zombie DB Entities (PrepQuestion Model & APIs)
  │
  ▼
Step 5: Rewire Concept Lab (Fix 404 Endpoint Alignment)
```

### Cleanup Checklist
* [ ] **TD-01**: In `src/components/interview/conversational/types.ts`, define `export interface MockQuestion`.
* [ ] **TD-02**: In `src/components/interview/ConversationalVoiceInterviewModal.tsx`, remove import from dead modal.
* [ ] **TD-03**: Delete `src/components/interview/VoiceMockInterviewModal.tsx` (572 lines).
* [ ] **TD-04**: Delete `src/components/ai/InterviewPrepResult.tsx` (51 lines).
* [ ] **TD-05**: Delete `src/app/api/ai/mock-interview/evaluate/route.ts` (114 lines).
* [ ] **TD-06**: In `src/app/api/interview-sessions/route.ts`, remove unused `POST` handler and fix `/10` bug.
* [ ] **TD-07**: Delete `src/app/api/prep-questions/route.ts` & `[id]/route.ts`.
* [ ] **TD-08**: In `src/lib/api.ts`, remove unused hook `usePrepQuestions()`.
* [ ] **TD-09**: In `prisma/schema.prisma`, remove `model PrepQuestion` and user relation.
* [ ] **TD-10**: In `src/lib/ai/prompts/interview.ts`, connect `getInterviewPrompt()` to LangGraph orchestrator or delete.
* [ ] **TD-11**: In `src/lib/ai/tool-registry.ts`, remove `addPrepQuestions` registration.

---

## 6. Backend Execution Plan

### 1. Database Schema Extensions
* Add to `Application`:
  * `interviewDate`: `DateTime?`
  * `interviewRound`: `String?`
  * `interviewMeetingUrl`: `String?`
  * `interviewNotes`: `String? @db.Text`
  * Index: `@@index([userId, interviewDate])`
* Add to `InterviewSession`:
  * `applicationId`: `String?`
  * Relation: `application Application? @relation(fields: [applicationId], references: [id], onDelete: SetNull)`
  * Index: `@@index([applicationId])`
  * Index: `@@index([userId, targetCompany])`
* Drop model `PrepQuestion`.

### 2. API Endpoints & Security Updates
* **Align Concept Lab Route**:
  * Create route alias or rename `src/app/api/ai/study-assistant/route.ts` to `/api/ai/prep-chat`.
  * Support `{ history, topic, question, language }` and return `{ answer, topic, suggestedNextQuestions }`.
* **Fix Reminders Endpoint**:
  * In `src/app/api/notifications/reminders/route.ts`, change `actionUrl` to `/interview-prep?appId=${app.id}&company=${encodeURIComponent(app.companyName)}&role=${encodeURIComponent(app.jobTitle)}`.
* **IDOR Prevention**:
  * In `src/app/api/prep-notes/route.ts` and `[id]/route.ts`, verify tenant ownership of `applicationId` before saving.
* **Input Validation via Zod**:
  * Add `ConversationTurnSchema` to validate requests in `converse/route.ts`.
  * Add `InterviewReportSchema` to validate structured outputs in `report/route.ts`.
* **Prompt Injection Defense**:
  * Wrap `targetCompany` and `targetRole` with `sanitizeUntrustedContext()`.

### 3. Audio & Text-To-Speech Engine Replacement
* In `src/app/api/ai/tts/route.ts`:
  * Remove scraping of `translate.google.com/translate_tts?client=tw-ob`.
  * Use OpenAI `tts-1` when `aiConfig.providerType === "openai"`.
  * Return HTTP 204 for Bengali or non-OpenAI configs so client uses native browser `SpeechSynthesis`.
  * Increase rate limit to 60 req/min.

### 4. Dynamic Turn Logic in Mock Interview
* In `converse/route.ts`:
  * Dynamically select phase prompts based on `interviewType`:
    * **Behavioral**: STAR Ownership -> Conflict Resolution -> Failure & Resilience.
    * **System Design**: Scale & Requirements -> High-Level Design -> Bottlenecks & Failure.
    * **Technical**: Fundamentals & Internals -> Edge Cases & Concurrency -> Live Outage Debugging.

### 5. Cross-Session Memory Loop
* In `report/route.ts`:
  * Save high-severity knowledge gaps into `UserMemory` (`category = "weakness"`).
* In `converse/route.ts`:
  * Query past weaknesses using `searchUserMemories()` and instruct the interviewer to probe them in Turn 3.

---

## 7. Frontend Execution Plan

### 1. Modal Teardown Guard
* In `ConversationalVoiceInterviewModal.tsx`:
  * Intercept Radix Dialog backdrop and `Escape` key events during active rounds:
    ```tsx
    onInteractOutside={(e) => {
      if (step === "interview" && dialogue.length > 0) e.preventDefault()
    }}
    onEscapeKeyDown={(e) => {
      if (step === "interview" && dialogue.length > 0) e.preventDefault()
    }}
    ```
  * Show confirmation modal before discarding active dialogue.

### 2. Concept Lab UI Wiring
* In `ConceptLabTab.tsx`:
  * Update fetch target to `/api/ai/prep-chat` (or `/api/ai/study-assistant`).
  * Normalize payload keys: pass `conversationHistory` and read `data.explanation`.

### 3. Launchpad State Synchronization
* In `MockInterviewLaunchpad.tsx` and `page.tsx`:
  * Forward `preset.tone` and `preset.turns` into `ConversationalVoiceInterviewModal`.

### 4. Application Workbench & Calendar View
* In `ApplicationDetailHeader.tsx`:
  * Show interview date badge and round details.
  * Render past `InterviewSession` cards in the application drawer.
* In `src/app/(app)/calendar/page.tsx`:
  * Display interview date badges with quick links to the prep room.

---

## 8. AI & Agent Roadmap

```
┌────────────────────────────────┬──────────────────────┬─────────────────────────┬──────────────────────────────┐
│ Agent Name                     │ Primary Trigger      │ Tools & Integrations    │ Output & State Impact        │
├────────────────────────────────┼──────────────────────┼─────────────────────────┼──────────────────────────────┤
│ 1. Company Research Agent      │ Status -> "Interview"│ Web Search, Scraper,    │ Structured Company Dossier in│
│                                │ or User Request      │ Company Intel Engine    │ Company.notes & App Memory   │
├────────────────────────────────┼──────────────────────┼─────────────────────────┼──────────────────────────────┤
│ 2. Interview Prep Agent        │ Recruiter Email Sync │ JD Analyzer, Resume     │ 8-12 Tailored Prep Questions,│
│                                │ or Calendar Event    │ Matcher, Question Gen   │ Study Schedule, PrepNotes    │
├────────────────────────────────┼──────────────────────┼─────────────────────────┼──────────────────────────────┤
│ 3. Mock Interview Agent        │ Candidate Launches   │ Resilient LLM, TTS,     │ Dynamic Multi-Turn Spoken    │
│                                │ Voice Session        │ Audio Normalizer        │ Interview Session            │
├────────────────────────────────┼──────────────────────┼─────────────────────────┼──────────────────────────────┤
│ 4. Feedback & Coaching Agent   │ Interview Concluded  │ STAR Deconstructor,     │ Comprehensive Debrief, STAR  │
│                                │                      │ Gap Doctor Remediation  │ Scores, Vectorized Gaps      │
├────────────────────────────────┼──────────────────────┼─────────────────────────┼──────────────────────────────┤
│ 5. Interview Reminder Agent    │ Inngest Cron (24h/2h │ Notifications Engine,   │ Push, In-App, & Email alerts │
│                                │ before interviewDate)│ Email (Resend)          │ with 1-page cheatsheet link  │
├────────────────────────────────┼──────────────────────┼─────────────────────────┼──────────────────────────────┤
│ 6. Performance Tracking Agent  │ New Session Saved    │ Outcome Learning Engine,│ Longitudinal Readiness Score,│
│                                │ or Real Status Change│ Knowledge Graph Sync    │ Company Difficulty Benchmarks│
└────────────────────────────────┴──────────────────────┴─────────────────────────┴──────────────────────────────┘
```

---

## 9. Sprint Planning

### Sprint 1: Stabilization & Security (Days 1–3)
* **Deliverables**: Delete dead files (`VoiceMockInterviewModal.tsx`, `evaluate/route.ts`), add modal backdrop guard, fix IDOR in prep notes, sanitize prompt inputs, fix reminder 404 URL.
* **Success Criteria**: Zero 404 errors; active voice sessions protected from accidental closing.

### Sprint 2: Core Schema & Concept Lab (Days 4–7)
* **Deliverables**: Run Prisma migration linking `InterviewSession` to `Application`, add interview scheduling fields to `Application`, drop `PrepQuestion`, rewire Concept Lab.
* **Success Criteria**: Concept Lab produces verified markdown answers; interview sessions queryable by job ID.

### Sprint 3: Dynamic Prompts & Memory Loop (Week 2)
* **Deliverables**: Add dynamic phase state machines in `converse/route.ts` for Behavioral vs System Design vs Technical, auto-embed knowledge gaps in `UserMemory`, inject past weak areas into Turn 3.
* **Success Criteria**: Behavioral interviews ask STAR questions; interviewer targets candidate's past failed concepts.

### Sprint 4: Scheduling, Calendar & Company Research (Week 3)
* **Deliverables**: Date/time picker and meeting URL on job cards, interview badges on `/calendar`, implement `researchCompanyIntel` runtime tool.
* **Success Criteria**: Candidates can schedule an interview date and see it on the calendar; company research tool returns real web data.

### Sprint 5: Inngest Reminders & Audio Hardening (Week 4)
* **Deliverables**: Inngest scheduled cron for 24h/2h email & push reminders, replace `tw-ob` TTS scraper with OpenAI `tts-1` / native browser synthesis.
* **Success Criteria**: Candidates receive reminder emails; spoken audio functions without rate limit lockouts.

---

## 10. Database Migration Plan

```sql
-- Migration 1: Add Interview Fields to Application
ALTER TABLE "Application"
  ADD COLUMN "interviewDate" TIMESTAMP(3),
  ADD COLUMN "interviewRound" TEXT,
  ADD COLUMN "interviewMeetingUrl" TEXT,
  ADD COLUMN "interviewNotes" TEXT;

CREATE INDEX "Application_userId_interviewDate_idx" ON "Application"("userId", "interviewDate");

-- Migration 2: Link InterviewSession to Application
ALTER TABLE "InterviewSession"
  ADD COLUMN "applicationId" TEXT;

ALTER TABLE "InterviewSession"
  ADD CONSTRAINT "InterviewSession_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL;

CREATE INDEX "InterviewSession_applicationId_idx" ON "InterviewSession"("applicationId");
CREATE INDEX "InterviewSession_userId_targetCompany_idx" ON "InterviewSession"("userId", "targetCompany");

-- Migration 3: Drop Zombie PrepQuestion Table
DROP TABLE IF EXISTS "PrepQuestion" CASCADE;
```

---

## 11. Production Readiness Checklist

* [ ] Prompt strings sanitized with `sanitizeUntrustedContext()`.
* [ ] Zod schema validation active on all mock interview routes.
* [ ] IDOR checks active on `applicationId` across all routes.
* [ ] Unofficial Google TTS scraper removed.
* [ ] Modal backdrop & `Esc` exit protection active.
* [ ] Concept Lab connected and verified.
* [ ] Notification reminder link fixed to `/interview-prep`.
* [ ] Launchpad presets properly pass tone and turn counts.
* [ ] E2E tests passing for full spoken mock interview flow.

---

## 12. Success Metrics & Targets

* **Mock Session Completion Rate**: > 75% of launched sessions reach report screen.
* **1-Click Tailored Prep Adoption**: > 40% of candidates with status "Interview" run mock prep.
* **STAR Debrief Usefulness Rating**: > 85% positive user feedback.
* **Knowledge Gap Retention**: > 80% score improvement when candidate is re-tested on previous weaknesses.
* **Spoken Turn Latency**: p95 < 1,800ms.
* **Error Rate**: 0.00% 404s across all interview routes.

---

## 13. Phase 5: Post-Validation Security & Integrity Fixes

> **Source**: Post-implementation hostile verification audit (September 17, 2026)
> **Trigger**: Audit discovered 8 new issues including 3 security vulnerabilities, 1 fake implementation, and 4 quality gaps.

### P0 Critical — Must Fix Before Production

| # | Item | Issue | Fix |
|---|---|---|---|
| INT-21 | Middleware Protection | `/api/interview-sessions` missing from `PROTECTED_API_PATHS` | Add to middleware array |
| INT-22 | Zod + IDOR | POST accepts raw body, `applicationId` not verified | Add Zod schema + ownership check |
| INT-23 | Rate Limiting | No rate limits on sessions routes | Add `checkRateLimit` |
| INT-24 | Report Sanitization | `targetRole`/`targetCompany` injected raw into LLM prompt | Add `sanitizeUntrustedContext()` |
| INT-25 | Fake Agent Node | `starEvaluationNode` scores by character length | Replace with AI-powered evaluation |

### P1 High — Fix Before Beta

| # | Item | Issue | Fix |
|---|---|---|---|
| INT-26 | Role-Aware Prompt | `interview.ts` hardcoded to JS/React | Parameterize with `targetRole` |
| INT-27 | Email Resilience | `sendEmail` not in try/catch in Inngest | Wrap with error handling |
| INT-28 | Type Safety | `(prisma as any)` in 4 files | Run `prisma generate`, remove casts |

