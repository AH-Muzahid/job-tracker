# 🎙️ CareerTrack Interview Feature Living Execution Tracker

> **Source Audit Document**: [`docs/INTERVIEW-AUDIT-REPORT.md`](./INTERVIEW-AUDIT-REPORT.md)  
> **Implementation Plan**: [`docs/INTERVIEW-IMPLEMENTATION-PLAN.md`](./INTERVIEW-IMPLEMENTATION-PLAN.md)  
> **Initial Audit Date**: September 17, 2026  
> **Status**: Active Living Tracker  
> **Maturity Goal**: Transform Interview Feature from a single-question speech prototype (47/100 baseline) into an Autonomous Multi-Round AI Interview Coach (95+/100 Agentic).

---

## ⚠️ MANDATORY RULE FOR ALL AGENTS & DEVELOPERS

```
Whenever ANY change, fix, optimization, or feature is added to the Interview System:
1. Update the status of the corresponding item in this tracker ([ ] -> [/] -> [x]).
2. Record the date, owner, and target files.
3. Append a detailed entry to the "Audit Change Log & History" section at the bottom.
4. Keep docs/INTERVIEW-AUDIT-REPORT.md, docs/INTERVIEW-IMPLEMENTATION-PLAN.md, and docs/INTERVIEW-IMPLEMENTATION-TRACKER.md in sync.
```

---

## 📊 High-Level Metric & Scorecard Tracker

| Milestone | Overall Score | Production Readiness | Agentic Maturity | AI Architecture | Reliability & Audio | Target Date | Status |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Baseline Audit (v0.1.0)** | **47 / 100** | **45 / 100** | **25 / 100** | **40 / 100** | **55 / 100** | Sep 17, 2026 | ✅ Audited |
| **Phase 1: Immediate Critical Fixes (P0)** | 65 / 100 | 70 / 100 | 40 / 100 | 55 / 100 | 70 / 100 | Sep 24, 2026 | 🟡 In Queue |
| **Phase 2: Schema & Core Flow (P1)** | 78 / 100 | 82 / 100 | 60 / 100 | 75 / 100 | 85 / 100 | Oct 08, 2026 | ⚪ Planned |
| **Phase 3: Adaptive Memory & Inngest (P2)** | 88 / 100 | 90 / 100 | 80 / 100 | 88 / 100 | 90 / 100 | Oct 22, 2026 | ⚪ Planned |
| **Phase 4: Autonomous Interview OS (P3)** | 95+ / 100 | 96 / 100 | 95 / 100 | 95 / 100 | 95 / 100 | Nov 2026 | ⚪ Planned |

---

## 🚨 Top 20 Action Items & Recommendation Tracker

### Phase 1: Immediate Critical Fixes & Security (P0 — Target: Sprint 1)

- [x] **`INT-01` [UX / Resiliency] Prevent Accidental Destruction of Active Voice Modal**
  - **Issue**: Clicking outside the modal backdrop or pressing `Escape` triggers immediate Radix dialog unmount, permanently destroying up to 15 minutes of in-progress interview dialogue with zero confirmation.
  - **Action**: Intercept `onInteractOutside` and `onEscapeKeyDown` when `step === "interview"` and `dialogue.length > 0`. Display confirmation before quitting.
  - **Target Files**: `src/components/interview/ConversationalVoiceInterviewModal.tsx`
  - **Status**: `Completed`
  - **Owner**: Antigravity AI
  - **Completed At**: 2026-09-17

- [x] **`INT-02` [Bugfix / Route] Fix Broken Concept Lab 404 Route**
  - **Issue**: `ConceptLabTab.tsx:104` calls `/api/ai/prep-chat` which returns a 404 Not Found error. The backend implementation exists at `/api/ai/study-assistant/route.ts` with mismatched request/response schemas.
  - **Action**: Normalize endpoint to `/api/ai/prep-chat` (or update target to `/api/ai/study-assistant`), align payload schema (`conversationHistory`, `topic`, `question`), and display structured responses with suggested follow-ups.
  - **Target Files**: `src/components/interview/prep/ConceptLabTab.tsx`, `src/app/api/ai/study-assistant/route.ts`, `src/app/api/ai/prep-chat/route.ts`
  - **Status**: `Completed`
  - **Owner**: Antigravity AI
  - **Completed At**: 2026-09-17

- [x] **`INT-03` [Bugfix / Route] Fix Broken Notification Reminder Action URL**
  - **Issue**: `src/app/api/notifications/reminders/route.ts:89` generates interview reminders with `actionUrl: /prep?appId=...`, resulting in a 404 page for users clicking reminders.
  - **Action**: Update `actionUrl` to `/interview-prep?appId=${app.id}&company=${encodeURIComponent(app.companyName)}&role=${encodeURIComponent(app.jobTitle)}`.
  - **Target Files**: `src/app/api/notifications/reminders/route.ts`, `src/components/CommandPalette.tsx`
  - **Status**: `Completed`
  - **Owner**: Antigravity AI
  - **Completed At**: 2026-09-17

- [x] **`INT-04` [Security] Remediate IDOR Vulnerability in Prep Notes**
  - **Issue**: `src/app/api/prep-notes/route.ts:42` and `[id]/route.ts:34` accept an arbitrary `applicationId` from user payload and attach notes without verifying that the application belongs to the authenticated user.
  - **Action**: Enforce ownership check: if `applicationId` is provided, verify `prisma.application.findFirst({ where: { id: applicationId, userId } })` before mutating.
  - **Target Files**: `src/app/api/prep-notes/route.ts`, `src/app/api/prep-notes/[id]/route.ts`
  - **Status**: `Completed`
  - **Owner**: Antigravity AI
  - **Completed At**: 2026-09-17

- [ ] **`INT-05` [Security] Sanitize Prompt Inputs in Voice Interview Converse Route**
  - **Issue**: `src/app/api/ai/mock-interview/converse/route.ts:182` directly interpolates unvalidated, user-supplied `targetCompany` and `targetRole` strings into the system prompt, creating a prompt injection vector.
  - **Action**: Wrap untrusted fields with `sanitizeUntrustedContext()` and validate request payload with Zod `ConversationTurnSchema`.
  - **Target Files**: `src/app/api/ai/mock-interview/converse/route.ts`
  - **Status**: `In Queue`
  - **Owner**: Unassigned
  - **Completed At**: —

- [ ] **`INT-06` [Cleanup] Purge Dead Voice Interview Modal, Evaluator & Orphaned Code**
  - **Issue**: `VoiceMockInterviewModal.tsx` (572 lines), `/api/ai/mock-interview/evaluate` (114 lines), and `InterviewPrepResult.tsx` (51 lines) are completely dead, superseded by conversational components.
  - **Action**: Extract shared `MockQuestion` interface to `src/components/interview/conversational/types.ts`, delete dead modal, remove dead route, remove unused `usePrepQuestions()` hook, and prune unused prompt generator `getInterviewPrompt()`.
  - **Target Files**: `src/components/interview/VoiceMockInterviewModal.tsx`, `src/app/api/ai/mock-interview/evaluate/route.ts`, `src/components/ai/InterviewPrepResult.tsx`, `src/components/interview/conversational/types.ts`, `src/lib/ai/prompts/interview.ts`, `src/lib/api.ts`
  - **Status**: `In Queue`
  - **Owner**: Unassigned
  - **Completed At**: —

---

### Phase 2: Schema Integrity, Relational DB & Core Flow (P1 — Target: Sprint 2–3)

- [ ] **`INT-07` [Database / Schema] Link InterviewSession to Application & Purge PrepQuestion**
  - **Issue**: `InterviewSession` records float unlinked from `Application`, preventing applicants from seeing their interview debriefs on the job detail drawer. `PrepQuestion` is a zombie table with no UI consumers.
  - **Action**: Add `applicationId` foreign key and relation to `InterviewSession`. Drop `model PrepQuestion` and remove dead `/api/prep-questions` CRUD routes.
  - **Target Files**: `prisma/schema.prisma`, `src/app/api/prep-questions/route.ts`, `src/app/api/prep-questions/[id]/route.ts`
  - **Status**: `Planned`
  - **Owner**: Unassigned
  - **Completed At**: —

- [ ] **`INT-08` [Database / Schema] Add Interview Scheduling Fields to Application**
  - **Issue**: The `Application` model has status `"Interview"`, but lacks fields for scheduling date, time, interview round, meeting link, and preparation notes.
  - **Action**: Add `interviewDate`, `interviewRound`, `interviewMeetingUrl`, and `interviewNotes` columns to `Application` with index `@@index([userId, interviewDate])`.
  - **Target Files**: `prisma/schema.prisma`, `src/types/job.ts`
  - **Status**: `Planned`
  - **Owner**: Unassigned
  - **Completed At**: —

- [ ] **`INT-09` [API / Reliability] Replace Illegal Google TTS Web Scraper**
  - **Issue**: `src/app/api/ai/tts/route.ts:79` scrapes `translate.google.com/translate_tts?client=tw-ob`. Rate-limited to 10 req/min per IP, causing spoken voice playback to break on turn 2 of mock interviews.
  - **Action**: Replace with official OpenAI `tts-1` when configured, gracefully return HTTP 204 for non-supported languages to let client use native browser `SpeechSynthesis`, and raise endpoint rate limit to 60 req/min.
  - **Target Files**: `src/app/api/ai/tts/route.ts`
  - **Status**: `Planned`
  - **Owner**: Unassigned
  - **Completed At**: —

- [ ] **`INT-10` [AI / Prompts] Implement Dynamic Turn Archetypes for Behavioral, System Design & Technical**
  - **Issue**: `converse/route.ts` uses a single generic script progression (Icebreaker -> Core Challenge -> Behavioral Push -> Culture Fit) regardless of whether the interview is Behavioral, Technical, or System Design.
  - **Action**: Implement round-specific phase state machines: Behavioral uses STAR progression; System Design uses Requirements -> Architecture -> Failure Modes; Technical uses Fundamentals -> Edge Cases -> Debugging.
  - **Target Files**: `src/app/api/ai/mock-interview/converse/route.ts`
  - **Status**: `Planned`
  - **Owner**: Unassigned
  - **Completed At**: —

- [ ] **`INT-11` [UI / Synchronization] Forward Launchpad Persona Tones & Turn Counts into Voice Modal**
  - **Issue**: Launchpad cards show "5 Questions" or "Tough/Friendly Persona", but clicking Launch opens the modal with default values without applying preset parameters.
  - **Action**: Forward `preset.tone`, `preset.roundType`, and `preset.turns` via modal props from `MockInterviewLaunchpad.tsx` and hub `page.tsx`.
  - **Target Files**: `src/components/interview/prep/MockInterviewLaunchpad.tsx`, `src/app/(app)/interview-prep/page.tsx`, `src/components/interview/ConversationalVoiceInterviewModal.tsx`
  - **Status**: `Planned`
  - **Owner**: Unassigned
  - **Completed At**: —

- [ ] **`INT-12` [AI / Tools] Implement Phantom Tools in Runtime Tool Dispatcher**
  - **Issue**: `tool-registry.ts` registers `researchCompanyIntel` and `getPrepNotes`, but they are completely missing from `executeToolByName` in `src/lib/ai/graph/tools/index.ts`.
  - **Action**: Implement real runtime tool execution handlers for `researchCompanyIntel` and `getPrepNotes`, connecting company web scraping/enrichment and candidate notes retrieval.
  - **Target Files**: `src/lib/ai/graph/tools/index.ts`, `src/lib/ai/tool-registry.ts`
  - **Status**: `Planned`
  - **Owner**: Unassigned
  - **Completed At**: —

---

### Phase 3: Adaptive Memory, Scheduling & Inngest Reminders (P2 — Target: Sprint 4)

- [ ] **`INT-13` [Memory / Intelligence] Implement Cross-Session Knowledge Gap & Weakness Persistence**
  - **Issue**: Knowledge gaps identified in `report/route.ts` are only rendered in UI and saved to raw JSON; they do not persist into long-term agent memory, causing round-to-round amnesia.
  - **Action**: Automatically extract `knowledgeGaps` from the evaluation report and insert them into `UserMemory` with `category: "weakness"`, tags, and confidence scores.
  - **Target Files**: `src/app/api/ai/mock-interview/report/route.ts`, `src/lib/ai/memory.ts`
  - **Status**: `Planned`
  - **Owner**: Unassigned
  - **Completed At**: —

- [ ] **`INT-14` [Memory / Personalization] Active Weakness Probing in Follow-up Mock Interviews**
  - **Issue**: Consecutive mock interviews for the same candidate do not test whether they improved on previously diagnosed flaws.
  - **Action**: In `converse/route.ts`, query `searchUserMemories(userId, "weakness")` during session setup. Instruct the interviewer in Turn 3 to test candidate on a past weakness topic.
  - **Target Files**: `src/app/api/ai/mock-interview/converse/route.ts`
  - **Status**: `Planned`
  - **Owner**: Unassigned
  - **Completed At**: —

- [ ] **`INT-15` [UI / Scheduling] Add Interview Schedule Date/Time Picker to Application Drawer & Calendar View**
  - **Issue**: Users cannot schedule or see their real upcoming interviews anywhere in the UI.
  - **Action**: Add Date/Time picker, round selector, and meeting link input to `ApplicationDetailHeader.tsx` and mount interview badges with 1-click prep launch links in `/calendar`.
  - **Target Files**: `src/components/applications/detail/ApplicationDetailHeader.tsx`, `src/app/(app)/calendar/page.tsx`
  - **Status**: `Planned`
  - **Owner**: Unassigned
  - **Completed At**: —

- [ ] **`INT-16` [Automation / Inngest] Inngest Cron Pipeline for 24h/2h Pre-Interview Briefing & Reminders**
  - **Issue**: Reminders rely on passive manual client triggers rather than scheduled background crons.
  - **Action**: Build Inngest scheduled job checking applications with `interviewDate` within 24h and 2h. Dispatch email notifications with 1-page quick cheatsheet links.
  - **Target Files**: `src/inngest/functions/interview-reminder-pipeline.ts`, `src/lib/email.ts`, `src/app/api/inngest/route.ts`
  - **Status**: `Planned`
  - **Owner**: Unassigned
  - **Completed At**: —

- [ ] **`INT-17` [Agent / Workflow] Company Research & Interview Dossier Agent Integration**
  - **Issue**: No automated company research happens when a job moves to "Interview" stage.
  - **Action**: Trigger background agent when status changes to "Interview" to compile company overview, recent news, engineering blog highlights, and common interview questions into application notes.
  - **Target Files**: `src/lib/ai/agents/company-dossier-agent.ts`, `src/inngest/functions/batch-job-pipeline.ts`
  - **Status**: `Planned`
  - **Owner**: Unassigned
  - **Completed At**: —

---

### Phase 4: Autonomous Interview Agent OS & Multi-Round Coaching (P3 — Target: Sprint 5)

- [ ] **`INT-18` [Agent / Graph] LangGraph Subgraph Integration for End-to-End Interview Coach**
  - **Issue**: Interview feature runs isolated API scripts without being integrated into the core `CareerOrchestrator` agent workflow.
  - **Action**: Create an `InterviewSubGraph` with states for Dossier Gathering, Question Formulation, Mock Simulation, STAR Evaluation, and Longitudinal Tracking.
  - **Target Files**: `src/lib/ai/graph/workflows/interview-coach.ts`, `src/lib/ai/graph/workflows/career-orchestrator.ts`
  - **Status**: `Planned`
  - **Owner**: Unassigned
  - **Completed At**: —

- [ ] **`INT-19` [Analytics / Tracking] Longitudinal Interview Mastery & Company Difficulty Benchmarking**
  - **Issue**: Candidates have no visual progress charts tracking readiness scores across multiple mock rounds.
  - **Action**: Implement longitudinal mastery tracker computing average STAR scores over time, weak skill trends, and readiness benchmarks by company tier.
  - **Target Files**: `src/components/interview/prep/MockTranscriptsTab.tsx`, `src/app/api/interview-sessions/analytics/route.ts`
  - **Status**: `Planned`
  - **Owner**: Unassigned
  - **Completed At**: —

- [ ] **`INT-20` [Observability / Quality] End-to-End Test Suite for Spoken Mock Flow & Zero Regression Verification**
  - **Issue**: Existing tests only cover mock route validation and basic schema shapes; spoken speech synthesis and multi-turn state transitions lack automated verification.
  - **Action**: Add end-to-end integration tests covering 5-turn conversational progression, dynamic archetype selection, gap doctor export to `PrepNote`, and IDOR defenses.
  - **Target Files**: `src/__tests__/conversational-interview-e2e.test.ts`, `src/__tests__/interview-security.test.ts`
  - **Status**: `Planned`
  - **Owner**: Unassigned
  - **Completed At**: —

---

## 🗄️ Database Architecture Migration Tracker

Tracking schema changes for the interview system:

| Entity / Field | Type & Details | Target File | Status | Migration Reference |
|:---|:---|:---:|:---:|:---|
| `Application.interviewDate` | `DateTime?` — Timestamp of upcoming interview | `prisma/schema.prisma` | ⚪ Not Started | `add_application_interview_fields` |
| `Application.interviewRound` | `String?` — e.g. "Screening", "Technical", "System Design" | `prisma/schema.prisma` | ⚪ Not Started | `add_application_interview_fields` |
| `Application.interviewMeetingUrl` | `String?` — Zoom/Meet/Teams video link | `prisma/schema.prisma` | ⚪ Not Started | `add_application_interview_fields` |
| `Application.interviewNotes` | `String? @db.Text` — Preparation notes / cheatsheet | `prisma/schema.prisma` | ⚪ Not Started | `add_application_interview_fields` |
| `Application Index` | `@@index([userId, interviewDate])` | `prisma/schema.prisma` | ⚪ Not Started | `add_application_interview_fields` |
| `InterviewSession.applicationId` | `String?` — FK to `Application(id)` with `onDelete: SetNull` | `prisma/schema.prisma` | ⚪ Not Started | `link_interview_session_application` |
| `InterviewSession Indices` | `@@index([applicationId])`, `@@index([userId, targetCompany])` | `prisma/schema.prisma` | ⚪ Not Started | `link_interview_session_application` |
| `Drop PrepQuestion` | Drop zombie model and relations | `prisma/schema.prisma` | ⚪ Not Started | `drop_zombie_prep_question` |

---

## 📝 Audit Change Log & History

*Record every update here chronologically.*

| Date | Item ID | Changes Made & Impact | Files Modified | Author / Agent |
|:---|:---:|:---|:---|:---:|
| 2026-09-17 | `INIT` | Initialized comprehensive forensic Interview Audit (`docs/INTERVIEW-AUDIT-REPORT.md`), Execution Plan (`docs/INTERVIEW-IMPLEMENTATION-PLAN.md`), and living tracker (`docs/INTERVIEW-IMPLEMENTATION-TRACKER.md`). Baseline score: 47/100. | `docs/INTERVIEW-AUDIT-REPORT.md`, `docs/INTERVIEW-IMPLEMENTATION-PLAN.md`, `docs/INTERVIEW-IMPLEMENTATION-TRACKER.md` | Principal Architect & AI Systems Auditor |
| 2026-09-17 | `INT-01` | Implemented modal backdrop, escape key, and close event interception (`handleRequestClose`) in `ConversationalVoiceInterviewModal.tsx`. Added high-contrast exit confirmation overlay with options to Continue, End & View Report (if >=2 turns), or Discard. Completely protects active voice interview progress from accidental unmounting. | `src/components/interview/ConversationalVoiceInterviewModal.tsx`, `docs/INTERVIEW-IMPLEMENTATION-TRACKER.md` | Antigravity AI |
| 2026-09-17 | `INT-02` | Fixed Concept Lab 404 error by mounting `/api/ai/prep-chat/route.ts` and updating `study-assistant/route.ts` to support both `history` and `conversationHistory` payloads and return both `answer` and `explanation`. Updated `ConceptLabTab.tsx` data extraction and created test suite `src/__tests__/prep-chat.test.ts`. | `src/app/api/ai/prep-chat/route.ts`, `src/app/api/ai/study-assistant/route.ts`, `src/components/interview/prep/ConceptLabTab.tsx`, `src/__tests__/prep-chat.test.ts`, `docs/INTERVIEW-IMPLEMENTATION-TRACKER.md` | Antigravity AI |
| 2026-09-17 | `INT-03` | Fixed broken 404 action URL `/prep?appId=...` in `src/app/api/notifications/reminders/route.ts`. Updated reminder links to `/interview-prep?appId=...&company=...&role=...` with full parameter encoding. Updated `/prep` slash command in `CommandPalette.tsx` to route directly to tailored interview prep. Added unit test `src/__tests__/reminders-url.test.ts`. | `src/app/api/notifications/reminders/route.ts`, `src/components/CommandPalette.tsx`, `src/__tests__/reminders-url.test.ts`, `docs/INTERVIEW-IMPLEMENTATION-TRACKER.md` | Antigravity AI |
| 2026-09-17 | `INT-04` | Enforced strict tenant ownership check on `applicationId` in `POST /api/prep-notes` and `PATCH /api/prep-notes/[id]` to eliminate IDOR security vulnerability. Prevents cross-tenant note attachment and data tampering. Created unit test suite `src/__tests__/prep-notes-idor.test.ts`. | `src/app/api/prep-notes/route.ts`, `src/app/api/prep-notes/[id]/route.ts`, `src/__tests__/prep-notes-idor.test.ts`, `docs/INTERVIEW-IMPLEMENTATION-TRACKER.md` | Antigravity AI |

