# 🎯 CareerTrack Autonomous Career Agent: Living Execution Tracker

> **Source Audit Document**: [`docs/AUTONOMOUS-CAREER-AGENT-AUDIT.md`](./AUTONOMOUS-CAREER-AGENT-AUDIT.md)  
> **Implementation Roadmap**: [`docs/AUTONOMOUS-CAREER-AGENT-ROADMAP.md`](./AUTONOMOUS-CAREER-AGENT-ROADMAP.md)  
> **Initial Activation Date**: September 18, 2026  
> **Status**: Active Living Tracker  
> **Maturity Goal**: Transform CareerTrack from a collection of isolated AI features into an Autonomous Goal-Driven Career Agent.

---

## ⚠️ MANDATORY RULE FOR ALL AGENTS & DEVELOPERS

```
Whenever ANY architectural change, refactor, deletion, endpoint modification, or UI update is made under this initiative:
1. Update the status of the corresponding action item in this tracker ([ ] -> [/] -> [x]).
2. Record the date, owner, target files, and verification proof.
3. Append a detailed entry to the "Audit Change Log & History" section at the bottom.
4. If modifications touch Job Discovery files (src/lib/discovery/, batch-job-pipeline.ts, Discovery components), update docs/JOB-DISCOVERY-TRACKER.md simultaneously as per AGENTS.md.
```

### ⚖️ Pragmatic Tiered Execution Protocol (Speed & Quality Balance)
- **TIER 1: Core Architecture & Roadmap Features (`CAG-01` to `CAG-16`)**:
  - Full adherence to the 10-step workflow (Requirements, Acceptance Criteria, User Journeys, Implementation, Static Analysis, Test Generation, Malicious QA, Simulation, Tech Debt, Release Readiness Review).
  - All claims verified via real terminal execution (`vitest`, `build`, `prisma`).
- **TIER 2: Surgical Fixes & Minor Tweaks (Fast-Track Quality Protocol)**:
  - Isolated UI/styling, copy updates, single-file bug fixes.
  - Compact analysis -> Surgical implementation -> Automated build/lint/typecheck validation -> Fast Release.


---

## 📊 High-Level Metric & Scorecard Tracker

| Milestone | Overall Architecture | Agentic Autonomy | UX & IA Cohesion | Reliability & Ground Truth | Target Date | Status |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Baseline Audit** | **42 / 100** | **28 / 100** | **45 / 100** | **60 / 100** | Sep 18, 2026 | ✅ Audited |
| **Phase 1: Stabilization & Ingestion** | **65 / 100** | **45 / 100** | **62 / 100** | **78 / 100** | Day 10 | 🟡 Pending |
| **Phase 2: Discovery-to-App & Packaging** | **80 / 100** | **72 / 100** | **78 / 100** | **88 / 100** | Day 22 | ⚪ Backlog |
| **Phase 3: IA Consolidation & Ambient Copilot** | **92 / 100** | **85 / 100** | **94 / 100** | **92 / 100** | Day 35 | ⚪ Backlog |
| **Phase 4: Autonomous Brain & Loop Closure** | **98 / 100** | **96 / 100** | **98 / 100** | **97 / 100** | Day 50 | ⚪ Backlog |

---

## 📋 Comprehensive Action Item Registry

### Phase 1: Eliminate Debt, Unify Ingestion & Fix Data Loss (Days 1–10)

- [x] **`CAG-01` [Cleanup / Dashboard] Purge Leftover SaaS Billing Artifacts & Deploy Career Operating System Cockpit**
  - **Description**: Eradicate invoice/billing template components and deploy pixel-perfect Career Operating System dashboard matching user design mockup.
  - **Target Files**:
    - `src/components/billing-health.tsx` (DELETED)
    - `src/components/dashboard-invoices.tsx` (DELETED)
    - `src/components/net-revenue-chart.tsx` (DELETED)
    - `src/components/channel-sales-chart.tsx` (DELETED)
    - `src/components/dashboard/DashboardHeader.tsx` (CREATED)
    - `src/components/dashboard/DashboardKpis.tsx` (CREATED)
    - `src/components/dashboard/RecommendedOpportunities.tsx` (CREATED)
    - `src/components/dashboard/RecentApplicationsList.tsx` (CREATED)
    - `src/components/dashboard/UpcomingInterviewsList.tsx` (CREATED)
    - `src/components/dashboard/AICareerCopilotCard.tsx` (CREATED)
    - `src/components/dashboard/TodayTasksCard.tsx` (CREATED)
    - `src/components/dashboard/StayConsistentCard.tsx` (CREATED)
    - `src/app/api/dashboard/stats/route.ts` (MODIFIED)
    - `src/components/dashboard.tsx` (MODIFIED)
    - `src/components/stats.tsx` (MODIFIED)
    - `src/components/app-shared.tsx` (MODIFIED)
    - `src/components/app-sidebar.tsx` (MODIFIED)
    - `src/__tests__/dashboard-career-metrics.test.ts` (CREATED)
  - **Acceptance Criteria**: Dashboard displays 0 references to revenue, invoices, or billing. Displays pixel-perfect cockpit with greeting, 4 KPIs, Recommended Opportunities (with Package & Stage), Recent Applications, Upcoming Interviews (with Prep CTA), Copilot rail with 4 actions, Today's Tasks, and Stay Consistent streak.
  - **Priority**: `P0`
  - **Owner**: Antigravity AI
  - **Status**: `Release Ready`

- [x] **`CAG-02` [Bugfix / Persistence] Eradicate `localStorage` Outreach Drafts & Persist to Postgres**
  - **Description**: Fix critical data loss bug where generated cold emails and cover letters are stored in browser `localStorage`.
  - **Target Files**:
    - `prisma/schema.prisma` (MODIFIED - added outreachSubject, outreachBody, outreachChecklist, outreachGeneratedAt, tailoredResumeJson to `ApplicationAnalysis`)
    - `src/app/api/applications/[id]/analysis/route.ts` (MODIFIED - added PATCH handler with Zod validation, tenant isolation, and JsonNull safety)
    - `src/app/api/applications/[id]/outreach/route.ts` (MODIFIED - persist generated outreach drafts directly to Postgres `ApplicationAnalysis`)
    - `src/components/applications/types.ts` (MODIFIED - added outreach persistence fields to `WorkbenchAnalysis`)
    - `src/features/applications/application.hooks.ts` (MODIFIED - added `useUpdateApplicationAnalysis` mutation hook)
    - `src/lib/api.ts` (MODIFIED - exported `useUpdateApplicationAnalysis`)
    - `src/components/applications/ApplicationWorkbench.tsx` (MODIFIED - eliminated all localStorage reads/writes, added cloud initialization, legacy migration, debounced auto-save)
    - `src/components/applications/OutreachAssistantCard.tsx` (MODIFIED - added 'Draft saved to cloud' status indicator and manual save)
    - `src/__tests__/application-outreach-persistence.test.ts` (CREATED - 6 unit & tenant security tests)
  - **Acceptance Criteria**: Outreach subject, body, and checklist persist across browser clears and page reloads. Zero localStorage writes for outreach drafts. Strict tenant isolation enforced.
  - **Priority**: `P0`
  - **Owner**: Antigravity AI
  - **Status**: `Release Ready`

- [x] **`CAG-03` [Ingestion / Agent] Activate Orphaned `JDIntakePanel.tsx` & Build Unified `/api/discovery/evaluate`**
  - **Description**: Unify the 4 disparate JD inputs into a single universal opportunity evaluator with web scraping, scam risk gating, and tech stack extraction inside the Discovery Hub.
  - **Target Files**:
    - `src/components/ai/JDIntakePanel.tsx` (DEPRECATED & RE-EXPORTED `UniversalJDEvaluator`)
    - `src/components/discovery/UniversalJDEvaluator.tsx` (CREATED)
    - `src/components/discovery/UniversalJDEvaluatorModal.tsx` (CREATED)
    - `src/app/api/discovery/evaluate/route.ts` (CREATED)
    - `src/components/app-header.tsx` (MODIFIED - added Evaluate Job action)
    - `src/components/CommandPalette.tsx` (MODIFIED - added /evaluate command & search item)
    - `src/components/discovery/DiscoveryPage.tsx` (MODIFIED - added Evaluate JD header action)
    - `src/components/dashboard/DashboardQuickIntake.tsx` (MODIFIED)
    - `src/components/dashboard/CommandZone.tsx` (MODIFIED)
    - `src/components/app-shell.tsx` (MODIFIED - mounted modal globally)
    - `src/stores/store.ts` (MODIFIED - added evaluatorModal state to useUI)
    - `src/__tests__/discovery-evaluate-api.test.ts` (CREATED)
  - **Acceptance Criteria**: Candidates can paste any job post URL or raw text in a single evaluator modal to receive an instant fit dossier with 1-click stage action. Validated with Zod schema.
  - **Priority**: `P0`
  - **Owner**: Antigravity AI
  - **Status**: `Release Ready`

- [x] **`CAG-04` [Data Model / Pipeline] Formalize `STAGED` Application Status in Database & UI**
  - **Description**: Provide a formal staging area between discovering a job and submitting an application.
  - **Target Files**:
    - `prisma/schema.prisma` (MODIFIED - documented formalized pipeline statuses on `Application.status`)
    - `src/features/applications/application.constants.ts` (MODIFIED - added `Staged`, `STAGED`, `Archived`, `ARCHIVED` to `VALID_STATUSES` and `CANONICAL_STATUSES`)
    - `src/features/applications/application.repository.ts` (MODIFIED - case-insensitive and synonym status query mapping in `findManyByUser`)
    - `src/app/api/dashboard/stats/route.ts` (MODIFIED - aggregated `staged` counts while strictly isolating `activeApplications` from staging)
    - `src/app/api/applications/bulk/route.ts` (MODIFIED - validated `VALID_STATUSES` on bulk status updates)
    - `src/components/dashboard/types.ts` (MODIFIED - added `Staged` to `STATUS_OPTIONS` and 1st `staged` column to `boardColumns` with `Layers` icon)
    - `src/components/dashboard/BoardView.tsx` (MODIFIED - updated responsive layout to 6 columns with snap horizontal scroll and quick-jump chips)
    - `src/components/dashboard/TableView.tsx` (MODIFIED - aligned `ALL_STATUSES` with canonical pipeline statuses including `Staged`)
    - `src/components/StatusBadge.tsx` (MODIFIED - added distinctive purple styling for `Staged` and case-insensitive color resolution)
    - `src/app/(app)/applications/page.tsx` (MODIFIED - added `staged: "Staged"` to drag-and-drop `columnMap`)
    - `src/components/dashboard/ApplicationFormModal.tsx` (MODIFIED - added `Staged` option to status selector)
    - `src/features/applications/components/ApplicationForm.tsx` (MODIFIED - added `Staged` option to status selector)
    - `src/components/applications/ApplicationWorkbench.tsx` (MODIFIED - added `Staged` option to status selector)
    - `src/components/CommandPalette.tsx` (MODIFIED - added `Staged` to `/status` command)
    - `src/components/ai/MiniBoardTab.tsx` (MODIFIED - added `Staged` column to AI Copilot MiniBoard)
    - `src/components/discovery/UniversalJDEvaluator.tsx` (MODIFIED - updated primary action to "Package & Stage Application" with `status: "Staged"`)
    - `src/__tests__/staged-application-status.test.ts` (CREATED - 8 unit and integration tests)
  - **Acceptance Criteria**: Applications can be stored in `STAGED` state without skewing active `APPLIED` velocity metrics. Dedicated Kanban column, table, list, and form support.
  - **Priority**: `P1`
  - **Owner**: Antigravity AI
  - **Status**: `Release Ready`

---

### Phase 2: Discovery-to-Application Pipeline & 1-Click Packaging (Days 11–22)

- [x] **`CAG-05` [Pipeline / UX] 1-Click "Package Application" on Discovery Rows**
  - **Description**: Close the action dead-end in `/discovery` by adding a 1-click **"Package & Stage"** button directly to each discovery job row (`DiscoveryJobRow.tsx`). Clicking this invokes the packaging pipeline, creates/updates an `Application` in `STAGED` status in PostgreSQL, runs the cover letter & materials generator agent to pre-populate custom cover letter, tailored resume highlights, and LinkedIn outreach pitch into `ApplicationAnalysis`, marks the `UserJobMatch` as saved & staged, and transitions the row button to a link pointing directly to the application in the Workbench.
  - **Target Files**:
    - `src/lib/discovery/cover-letter-agent.ts` (MODIFIED - persist `outreachSubject`, `outreachBody`, `outreachChecklist`, `outreachGeneratedAt`, `tailoredResumeJson` into `ApplicationAnalysis`)
    - `src/lib/discovery/telemetry.ts` (MODIFIED - added `JOB_PACKAGED` to `DiscoveryEventType`)
    - `src/app/api/discovery/[id]/package/route.ts` (CREATED - tenant authentication, rate limiting, opportunity resolution, upsert into `STAGED` status, materials generation agent, cache invalidation, and background telemetry)
    - `src/hooks/use-job-discovery.ts` (MODIFIED - added `packageMutation`, `stagedJobs`, `stagedAppMap`, query invalidations, toast action linking to Workbench)
    - `src/components/discovery/DiscoveryJobList.tsx` (MODIFIED - pass down packaging state and handlers)
    - `src/components/discovery/DiscoveryJobRow.tsx` (MODIFIED - added primary `[ Package & Stage ]` CTA with `Zap` icon, loading spinner state, and `[ ✓ Staged ↗ ]` link to Workbench)
    - `src/components/discovery/DiscoveryPage.tsx` (MODIFIED - connected packaging props to list view)
    - `src/__tests__/discovery-package-api.test.ts` (CREATED - 5 API integration and tenant security tests)
    - `src/__tests__/discovery-row-package-ui.test.tsx` (CREATED - 5 UI component tests verifying state transitions and 0 Sparkles rule)
    - `src/__tests__/cover-letter-agent.test.ts` (MODIFIED - added assertions for outreach & resume persistence)
  - **Acceptance Criteria**: 1-click packaging creates/updates `STAGED` application, persists tailored materials to `ApplicationAnalysis`, updates `UserJobMatch`, updates row to `[ ✓ Staged ↗ ]` linking to `/applications/${applicationId}`, zero Sparkles icons.
  - **Priority**: `P0`
  - **Owner**: Antigravity AI
  - **Status**: `Release Ready`

- [x] **`CAG-06` [Workbench / Multi-Asset Studio Backend] Re-architect Application Workbench into Multi-Asset Studio**
  - **Description**: Consolidate application collateral into a unified atomic API endpoint (`GET /api/applications/[id]/package`) returning Target JD, canonical tech stack, tailored resume diff/JSON, personalized cover letter, cold outreach pitch, offer strategy, company intelligence, timeline, and autonomous next best action.
  - **Target Files**:
    - `src/lib/applications/package-engine.ts` (CREATED - Multi-asset packaging engine with tech extraction, resume diff, outreach resolution, company intel enrichment, and stage-aware next best action)
    - `src/app/api/applications/[id]/package/route.ts` (CREATED - GET endpoint with tenant isolation, distributed rate limiting, and no-store caching)
    - `src/__tests__/application-package-engine.test.ts` (CREATED - 8 unit and integration tests)
  - **Acceptance Criteria**: Candidate/frontend can fetch complete multi-asset dossier (target JD, canonical tech stack, tailored resume highlights, cover letter, LinkedIn pitch, company intel, and next best action) in a single request with strict tenant isolation.
  - **Priority**: `P0`
  - **Owner**: Antigravity AI
  - **Status**: `Release Ready`

- [x] **`CAG-07` [Automation / Inngest] Wire `career-orchestrator.ts` Autonomous Inngest Pipeline to User Feed**
  - **Description**: Connect the autonomous background LangGraph orchestrator to stage high-fit applications (>=85% fit) automatically during the 6-hour batch cycle, populating custom cover letter, tailored resume highlights, and LinkedIn outreach pitch.
  - **Target Files**:
    - `src/lib/ai/graph/state/career-orchestrator-state.ts` (MODIFIED - added `strategyTip` and `atsKeywords` to `ApplicationPackageItem`)
    - `src/lib/ai/graph/workflows/career-orchestrator.ts` (MODIFIED - zero-touch >= 85% fitScore threshold, `statusChanges` audit trail, complete `ApplicationAnalysis` outreach persistence, and Redis cache invalidation)
    - `src/inngest/functions/batch-job-pipeline.ts` (MODIFIED - Step 7 dispatches `career/orchestrator.execute` when curated batch opportunities have `fitScore >= 85`)
    - `src/components/dashboard/BoardCard.tsx` (MODIFIED - rendered subtle `Auto-Staged` badge with `Bot` icon when `source === "Career Orchestrator"`)
    - `src/components/dashboard/ListView.tsx` (MODIFIED - rendered `Auto-Staged` badge with `Bot` icon)
    - `src/components/dashboard/TableView.tsx` (MODIFIED - rendered `Auto-Staged` badge with `Bot` icon)
    - `src/__tests__/career-orchestrator.test.ts` (MODIFIED - 5 unit & workflow tests verifying >= 85% gating, borderline 80-84% rejection, outreach persistence, and cache invalidation)
    - `src/__tests__/batch-job-pipeline.test.ts` (MODIFIED - 6 unit & pipeline tests verifying orchestrator trigger on >= 85% fit opportunities)
  - **Acceptance Criteria**: Active users wake up to 1–3 pre-packaged applications in their staging inbox with in-app notifications, pre-generated cover letter, resume highlights, and outreach draft in PostgreSQL, with zero Sparkles icons.
  - **Priority**: `P1`
  - **Owner**: Antigravity AI
  - **Status**: `Release Ready`

- [x] **`CAG-08` [Integration / Agent] Autonomous Gmail Recruiter Reply Status Ingestion**
  - **Description**: Connect inbound Gmail sync pipeline (`src/lib/gmail-sync.ts` & Inngest cron `src/inngest/functions/inbox-sync.ts`) to detect confirmation emails, interview invitations (with meeting URL, round, and scheduled date extraction), and rejections, automatically transitioning application status, initializing mock interview prep sessions, and invalidating caches.
  - **Target Files**:
    - `src/lib/gmail-sync.ts` (MODIFIED - added `extractMeetingUrl`, `extractInterviewRound`, `extractInterviewDate`, `extractBodyText`, `CONFIRMATION` intent detection, interview round/date/link updates on `Application`, `StatusChange` rich metadata, `InterviewSession` auto-initialization, and Redis cache invalidation)
    - `src/components/applications/MilestoneTimeline.tsx` (MODIFIED - rendered "Updated via Email Sync" badge, recruiter sender info, meeting URL button, and interview prep launcher with zero Sparkles icons)
    - `src/components/applications/types.ts` (MODIFIED - extended `StatusChange.metadata` schema)
    - `src/features/applications/components/types.ts` (MODIFIED - extended `StatusChange.metadata` schema)
    - `src/__tests__/gmail-inbound-sync.test.ts` (MODIFIED - comprehensive 14-test suite covering extraction helpers, confirmation progression, interview session creation, and cache invalidation)
    - `src/__tests__/milestone-timeline.test.tsx` (CREATED - 5 unit tests verifying email sync badge, meeting link, prep link, and 0-Sparkles compliance)
  - **Acceptance Criteria**: When a recruiter email containing an interview link arrives, application moves to `Interview`, records `interviewRound`, `interviewMeetingUrl`, and `interviewDate`, schedules/initializes `InterviewSession`, and invalidates dashboard caches.
  - **Priority**: `P1`
  - **Owner**: Antigravity AI
  - **Status**: `Release Ready`

---

### Phase 3: IA Consolidation & Ambient Copilot (Days 23–35)

- [x] **`CAG-09` [Navigation / IA] Consolidate 11 Sidebar Routes into 4 Core Pillars**
  - **Description**: Reorganized navigation around the 4 core workflow pillars: Dashboard (`/dashboard`), Discovery Hub (`/discovery`), Pipeline (`/applications`), and Interview Lab (`/interview-prep`) + Tools (Career Profile & Settings).
  - **Target Files**:
    - `src/components/app-shared.tsx` (MODIFIED)
    - `src/components/app-sidebar.tsx` (MODIFIED)
  - **Acceptance Criteria**: Sidebar contains only 4 main workflow items + Ground Truth (Career Profile & Settings). Retains `/discovery` without URL churn. Zero Sparkles icons.
  - **Priority**: `P0`
  - **Owner**: Antigravity AI
  - **Status**: `Release Ready`

- [ ] **`CAG-10` [Consolidation / UX] Merge Weekly Goals & Companies into Core Workspaces**
  - **Description**: Remove standalone bloat routes `/weekly-goals` and `/companies`.
  - **Target Files**:
    - `src/components/dashboard/WeeklyGoalsWidget.tsx` (NEW)
    - `src/app/(app)/weekly-goals/page.tsx` (DEPRECATE / REDIRECT)
    - `src/app/(app)/companies/page.tsx` (DEPRECATE / REDIRECT)
  - **Acceptance Criteria**: Weekly goals appear directly on the Campaign Dashboard; company intel appears inside application cards.
  - **Priority**: `P1`
  - **Owner**: TBD
  - **Status**: `Pending`

- [x] **`CAG-11` [Ambient AI / Copilot Backend] Demote `/ai-assistant` to Ambient Slide-over Copilot (`Cmd+J`)**
  - **Description**: Enable ambient screen and entity context awareness across the core LangGraph career agent. When the user interacts with the Copilot drawer on any screen (e.g. applications, jobs, interviews), route context and entity metadata are injected into the agent planner and responder.
  - **Target Files**:
    - `src/lib/ai/graph/state.ts` (MODIFIED - added `AgentRouteContext` interface and `routeContext` state annotation)
    - `src/lib/ai/graph/nodes/planner.ts` (MODIFIED - formatted active screen route, entity type/id, and entity details into planner prompts)
    - `src/lib/ai/graph/nodes/responder.ts` (MODIFIED - incorporated active screen context into response prompts)
    - `src/app/api/agent/run/route.ts` (MODIFIED - parsed `routeContext`, added tenant-isolated database enrichment for applications and opportunities, and passed to graph input)
    - `src/__tests__/ambient-copilot-context.test.ts` (CREATED - 5 unit and integration tests)
  - **Acceptance Criteria**: Agent execution accepts route context, isolates entity enrichment by `userId`, injects active context into planner and responder prompts, and functions with zero regressions when context is omitted.
  - **Priority**: `P0`
  - **Owner**: Antigravity AI
  - **Status**: `Release Ready`

- [x] **`CAG-12` [Dashboard / UX / API] Deploy Daily Strategic Executive Briefing**
  - **Description**: Greet the user each morning with an actionable, 30-second prioritized battle plan aggregating staged packages, upcoming interviews in the next 72 hours, dormant follow-ups, weekly goals, and an AI/deterministic executive tactical summary.
  - **Target Files**:
    - `src/lib/dashboard/briefing-engine.ts` (CREATED - pipeline segmentation, interview filtering within 72h, weekly goal progress, priority action buttons, AI/deterministic executive summary)
    - `src/app/api/dashboard/briefing/route.ts` (CREATED - GET endpoint with tenant isolation, distributed rate limiting, and no-store caching)
    - `src/__tests__/dashboard-briefing.test.ts` (CREATED - 6 unit and integration tests)
  - **Acceptance Criteria**: Dashboard briefing endpoint returns today's priority actions (staged packages ready, follow-ups due, upcoming interviews within 72 hours, goal progress, and 3-bullet executive tactical summary).
  - **Priority**: `P1`
  - **Owner**: Antigravity AI
  - **Status**: `Release Ready`

---

### Phase 4: Autonomous Career Brain & Intelligent Loop Closure (Days 36–50)

- [ ] **`CAG-13` [Career Memory / UI] First-Class "Career Brain" Dossier Interface**
  - **Description**: Elevate `UserMemory` from a hidden settings tab to a primary ground-truth dossier interface.
  - **Target Files**:
    - `src/app/(app)/brain/page.tsx` (NEW)
    - `src/components/brain/CareerBrainDossier.tsx` (NEW)
    - `src/components/settings/AIMemoryManager.tsx` (REFACTOR)
    - `prisma/schema.prisma` (MODIFY - add `isVerified`, `pinned` to `UserMemory`)
  - **Acceptance Criteria**: Candidate can inspect, verify, and edit non-negotiable constraints, verified project metrics, and learned interview gaps.
  - **Priority**: `P1`
  - **Owner**: TBD
  - **Status**: `Pending`

- [x] **`CAG-14` [Continuous Learning / AI] Bi-directional Interview Feedback Loop**
  - **Description**: Automatically feed mock interview weaknesses into the resume tailoring engine and future mock sessions.
  - **Target Files**:
    - `src/app/api/ai/mock-interview/report/route.ts` (MODIFY)
    - `src/lib/ai/graph/workflows/interview-coach.ts` (MODIFY)
    - `src/app/api/resumes/tailor/route.ts` (MODIFY)
    - `src/lib/discovery/cover-letter-agent.ts` (MODIFY)
    - `src/lib/ai/memory.ts` (MODIFY)
    - `src/types/tailored-resume.ts` (MODIFY)
  - **Acceptance Criteria**: Weaknesses identified in mock interviews auto-populate Career Brain and dynamically influence next mock questions, resume checks, and cover letter drafts.
  - **Priority**: `P1`
  - **Owner**: Antigravity AI
  - **Status**: `Release Ready`

- [x] **`CAG-15` [Automation / Inngest] Automated 5-Day Follow-Up Dispatch Engine**
  - **Description**: Automatically detect applications silent for 5 business days and pre-draft personalized follow-up emails.
  - **Target Files**:
    - `src/lib/applications/follow-up-engine.ts` (NEW)
    - `src/app/api/applications/[id]/follow-up/route.ts` (NEW)
    - `src/inngest/functions/daily-job-hunt.ts` (MODIFY)
    - `src/components/dashboard/BoardCard.tsx` (MODIFY - add "Follow-up Due" chip)
    - `src/components/dashboard/BoardView.tsx` (MODIFY - add "Follow-up Due" column counter)
    - `src/components/dashboard/TableView.tsx` (MODIFY - add "Follow-up Due" badge)
    - `src/components/dashboard/ListView.tsx` (MODIFY - add "Follow-up Due" badge)
  - **Acceptance Criteria**: Candidate receives an alert with a 1-click review and send follow-up action for dormant applications.
  - **Priority**: `P2`
  - **Owner**: Antigravity AI
  - **Status**: `Release Ready`

- [x] **`CAG-16` [Negotiation / AI] Offer Benchmarking & Counter-Offer Strategy Assistant**
  - **Description**: Provide data-driven leverage, market percentile benchmarking, and 3-tiered counter-offer strategies when an application reaches the `OFFER` stage.
  - **Target Files**:
    - `prisma/schema.prisma` (MODIFIED - added `offerDetails Json?` to `Application`)
    - `scripts/migrate-offer-details.ts` (CREATED - safe raw SQL migration preserving LangGraph checkpoints)
    - `src/lib/applications/negotiate-engine.ts` (CREATED - market percentiles, currency multipliers, BATNA pipeline leverage scoring, 3-tiered strategies, PostgreSQL persistence)
    - `src/app/api/applications/[id]/negotiate/route.ts` (CREATED - GET & POST endpoints with tenant isolation and distributed rate limiting)
    - `src/__tests__/negotiation-engine.test.ts` (CREATED - 11 comprehensive tests)
  - **Acceptance Criteria**: Generates 3 tiered counter-offer scripts (Conservative, Balanced, Ambitious) benchmarking against market percentiles (p25, p50, p75, p90 across currencies) and active pipeline leverage score (BATNA).
  - **Priority**: `P2`
  - **Owner**: Antigravity AI
  - **Status**: `Release Ready`

---

## 🛠️ Verification & Test Commands

To verify and test any implementation step:

```bash
# 1. Type Check & Schema Validation
npm run build --no-lint

# 2. Unit & Integration Tests
npx vitest run

# 3. Prisma Schema Synchronization
npx prisma db push --preview-feature

# 4. Icon Guardrail Audit (Strictly 0 Sparkles icons)
# In PowerShell:
Get-ChildItem -Path src -Recurse -Include *.tsx,*.ts | Select-String "Sparkles"
```

---

## 📝 Audit Change Log & History

| Date | Item ID | Change Description | Target Files | Verified By |
|:---|:---:|:---|:---|:---:|
| 2026-09-18 | `CAG-01` | Purged legacy SaaS billing artifacts and deployed pixel-perfect Career Operating System dashboard matching user mockup. Verified with 69 test files (387 tests passing) and production build. | `src/components/dashboard.tsx`, `src/app/api/dashboard/stats/route.ts`, `src/components/dashboard/*`, `src/components/app-shared.tsx`, `src/components/app-sidebar.tsx` | Antigravity AI |
| 2026-09-19 | `CAG-01` | Pixel-perfect UI cockpit refinement matching media_1789757539889.png: permanent dark navy #0c1322 sidebar, isometric cube logo, Box icon for Interviews, wide search bar + red notification badge, #f8fafc canvas with rounded-2xl white cards, authentic SVGs via CompanyBrandLogo (Google, Stripe, Notion, Anthropic, Linear, Figma), padding to guarantee full rows, 0 sparkles guardrail. 70 test files (395 tests) and next build passed. | `src/app/globals.css`, `src/components/app-sidebar.tsx`, `src/components/app-header.tsx`, `src/components/app-shell.tsx`, `src/components/app-shared.tsx`, `src/components/dashboard/*`, `src/components/CompanyBrandLogo.tsx`, `src/__tests__/dashboard-pixel-perfect.test.tsx` | Antigravity AI |
| 2026-09-19 | `CAG-02` | Eradicated localStorage outreach drafts and migrated persistence to PostgreSQL ApplicationAnalysis. Added outreachSubject, outreachBody, outreachChecklist, outreachGeneratedAt, tailoredResumeJson. Added PATCH endpoint with Zod validation, tenant isolation (userId check), and Prisma JsonNull safety. Implemented React Query mutation with debounced cloud auto-save and 'Draft saved to cloud' indicator. One-time auto-migration for legacy localStorage drafts. Verified with 71 test files (402 tests passing), tsc --noEmit, eslint, and next build. | `prisma/schema.prisma`, `src/app/api/applications/[id]/analysis/route.ts`, `src/app/api/applications/[id]/outreach/route.ts`, `src/components/applications/types.ts`, `src/features/applications/application.hooks.ts`, `src/lib/api.ts`, `src/components/applications/ApplicationWorkbench.tsx`, `src/components/applications/OutreachAssistantCard.tsx`, `src/__tests__/application-outreach-persistence.test.ts` | Antigravity AI |
| 2026-09-19 | `CAG-03` | Activated orphaned JD intake UI and built unified Ingestion & Evaluation API (`POST /api/discovery/evaluate`). Consolidates URL scraping, SSRF loopback/private protection, autonomous scam heuristic gating (`evaluateJobScamRisk`), canonical tech stack extraction (`extractTechTagsFromText`), career knowledge graph traversal, and resilient AI fit evaluation with deterministic heuristic fallback. Refactored into `UniversalJDEvaluator.tsx` and `UniversalJDEvaluatorModal.tsx` globally accessible via AppHeader ('Evaluate Job' pill), CommandPalette (`Cmd+K` & `/evaluate`), DiscoveryPage header ('Evaluate JD' CTA), and DashboardQuickIntake. Persists directly to Application and ApplicationAnalysis upon 1-click stage/apply action. Verified with 72 test files (409 tests passing), 0 TypeScript errors, 0 ESLint warnings/errors, and production next build. | `src/app/api/discovery/evaluate/route.ts`, `src/components/discovery/UniversalJDEvaluator.tsx`, `src/components/discovery/UniversalJDEvaluatorModal.tsx`, `src/components/discovery/DiscoveryPage.tsx`, `src/components/app-header.tsx`, `src/components/CommandPalette.tsx`, `src/components/dashboard/DashboardQuickIntake.tsx`, `src/components/dashboard/CommandZone.tsx`, `src/components/ai/JDIntakePanel.tsx`, `src/stores/store.ts`, `src/components/app-shell.tsx`, `src/__tests__/discovery-evaluate-api.test.ts`, `docs/AUTONOMOUS-CAREER-AGENT-TRACKER.md`, `docs/JOB-DISCOVERY-TRACKER.md` | Antigravity AI |
| 2026-09-19 | `CAG-04` | Formalized `STAGED` application pipeline status across data model, backend API, Inngest/orchestrator pipelines, and UI views. Documented in `prisma/schema.prisma`. Updated `VALID_STATUSES` and `CANONICAL_STATUSES` to accept `Staged`, `STAGED`, `Archived`, `ARCHIVED`. Implemented case-insensitive and synonym status query filtering in `ApplicationRepository.findManyByUser`. Updated `GET /api/dashboard/stats` to aggregate `staged` counts while strictly isolating `activeApplications` so pre-application staged opportunities never artificially inflate active velocity. Validated `VALID_STATUSES` in `POST /api/applications/bulk`. Added dedicated 1st `staged` column to `boardColumns` with functional `Layers` icon (0 sparkles rule strictly enforced). Updated `BoardView.tsx` with responsive 6-column grid and mobile/tablet snap-scroll quick-jump chips. Supported `Staged` in `TableView.tsx`, `FilterBar.tsx`, `StatusBadge.tsx` (with purple styling), `ApplicationsPage` drag-and-drop `columnMap`, `ApplicationFormModal.tsx`, `ApplicationForm.tsx`, `ApplicationWorkbench.tsx`, `CommandPalette.tsx` (`/status`), `MiniBoardTab.tsx`, and `UniversalJDEvaluator.tsx` primary action. Verified with 73 test files (417 tests passing), 0 TypeScript errors (`tsc --noEmit`), 0 ESLint errors, and clean Next.js build (57 routes). | `prisma/schema.prisma`, `src/features/applications/application.constants.ts`, `src/features/applications/application.repository.ts`, `src/app/api/dashboard/stats/route.ts`, `src/app/api/applications/bulk/route.ts`, `src/components/dashboard/types.ts`, `src/components/dashboard/BoardView.tsx`, `src/components/dashboard/TableView.tsx`, `src/components/StatusBadge.tsx`, `src/app/(app)/applications/page.tsx`, `src/components/dashboard/ApplicationFormModal.tsx`, `src/features/applications/components/ApplicationForm.tsx`, `src/components/applications/ApplicationWorkbench.tsx`, `src/components/CommandPalette.tsx`, `src/components/ai/MiniBoardTab.tsx`, `src/components/discovery/UniversalJDEvaluator.tsx`, `src/__tests__/staged-application-status.test.ts` | Antigravity AI |
| 2026-09-19 | `CAG-05` | Built 1-Click "Package Application" pipeline directly on Discovery rows. Implemented `POST /api/discovery/[id]/package` with tenant auth (`getInternalUserId`), rate limiting (`checkDistributedRateLimit`), opportunity resolution (`UserJobMatch` / `CanonicalJob`), upsert into `Application` with `status: "STAGED"` and `StatusChange` audit record, invocation of `generateApplicationMaterialsAgent` to pre-populate custom cover letter, tailored resume highlights, and LinkedIn outreach pitch into `ApplicationAnalysis`, and `UserJobMatch` synchronization (`isSaved: true, status: "STAGED"`). Updated `cover-letter-agent.ts` to persist outreach subject, body, checklist, generated timestamp, and tailored resume JSON. In `DiscoveryJobRow.tsx`, added primary Linear-style `[ Package & Stage ]` CTA with `Zap` icon (0 Sparkles rule strictly enforced), spinning `[ Packaging... ]` state during execution, and persistent `[ ✓ Staged ↗ ]` badge-link navigating directly to `/applications/${applicationId}` in Workbench. Added `packageMutation`, staged sets, and toast notifications with 'View Workbench' button in `use-job-discovery.ts` and `DiscoveryJobList.tsx`. Verified with 75 test files (427 tests passing), 0 TypeScript errors, 0 ESLint warnings/errors, and Next.js production build (57 static & dynamic routes). | `src/app/api/discovery/[id]/package/route.ts`, `src/lib/discovery/cover-letter-agent.ts`, `src/lib/discovery/telemetry.ts`, `src/hooks/use-job-discovery.ts`, `src/components/discovery/DiscoveryJobRow.tsx`, `src/components/discovery/DiscoveryJobList.tsx`, `src/components/discovery/DiscoveryPage.tsx`, `src/__tests__/discovery-package-api.test.ts`, `src/__tests__/discovery-row-package-ui.test.tsx`, `src/__tests__/cover-letter-agent.test.ts` | Antigravity AI |
| 2026-09-19 | `CAG-07` | Wired Autonomous Career Orchestrator Inngest Pipeline to User Feed (`CAG-07`): (1) Tightened zero-touch autonomous staging gate in `career-orchestrator.ts` to `fitScore >= 85` and `scamScore < 0.3`; (2) Updated `persistenceNode` to write `source: "Career Orchestrator"`, record `StatusChange` audit trails, populate full `ApplicationAnalysis` outreach fields, and invalidate Redis caches; (3) Added Step 7 in 6-hour batch processor `processUserJobBatch` dispatching Inngest event `career/orchestrator.execute` on `fitScore >= 85`; (4) Added distinctive `Auto-Staged` badge with `Bot` icon across Board, List, and Table Kanban views; (5) Verified with 100% pass across 75 test suites (429 tests), 0 TS errors, 0 ESLint errors, and clean Next.js build. | `src/lib/ai/graph/state/career-orchestrator-state.ts`, `src/lib/ai/graph/workflows/career-orchestrator.ts`, `src/inngest/functions/batch-job-pipeline.ts`, `src/components/dashboard/BoardCard.tsx`, `src/components/dashboard/ListView.tsx`, `src/components/dashboard/TableView.tsx`, `src/__tests__/career-orchestrator.test.ts`, `src/__tests__/batch-job-pipeline.test.ts` | Antigravity AI |
| 2026-09-19 | `CAG-08` | Implemented Autonomous Gmail Recruiter Reply Status Ingestion & Interview Prep Trigger (`CAG-08`): (1) Added meeting URL extraction, interview round identification, ISO/natural date parsing, and base64/HTML body decoding; (2) Added `CONFIRMATION` outcome advancing `STAGED` to `Applied`; (3) Updated `syncUserInbox` to record meeting details, auto-initialize `InterviewSession`, and invalidate Redis caches; (4) Enhanced `MilestoneTimeline.tsx` with email sync badge, recruiter details, and interview prep launcher; (5) Verified across 76 test suites (440 tests), 0 TS errors, 0 ESLint errors, clean Next.js build. | `src/lib/gmail-sync.ts`, `src/components/applications/MilestoneTimeline.tsx`, `src/components/applications/types.ts`, `src/features/applications/components/types.ts`, `src/__tests__/gmail-inbound-sync.test.ts`, `src/__tests__/milestone-timeline.test.tsx` | Antigravity AI |
| 2026-09-19 | `CAG-14` | Implemented Bi-directional Interview Feedback Loop connecting mock interview evaluations to resume tailoring and cover letter generation (`CAG-14`): (1) Injected historical interview weaknesses into resume tailor and cover letter prompts; (2) Added weakness mitigation parser and schema; (3) Synchronized mock interview evaluation report directly into `ApplicationAnalysis.gapAnalysis`; (4) Verified across 77 test suites (446 tests), 0 TS errors, 0 ESLint errors. | `src/types/tailored-resume.ts`, `src/lib/ai/memory.ts`, `src/app/api/resumes/tailor/route.ts`, `src/lib/discovery/cover-letter-agent.ts`, `src/app/api/ai/mock-interview/report/route.ts`, `src/lib/ai/graph/workflows/interview-coach.ts`, `src/__tests__/bi-directional-interview-feedback.test.ts` | Antigravity AI |
| 2026-09-19 | `CAG-15` | Implemented Automated 5-Day Follow-Up Dispatch Engine (`CAG-15`): (1) Accurate business days calculation and dormancy detector; (2) Tailored follow-up drafter with PostgreSQL staging into `ApplicationAnalysis`; (3) 1-click dispatch with audit logging and Redis cache invalidation; (4) Inngest daily batch pipeline integration; (5) Linear-style "Follow-up Due" indicators with `Clock` icon across Board, Table, and List views. Verified across 78 test suites (456 tests), 0 TS errors, 0 ESLint errors. | `src/lib/applications/follow-up-engine.ts`, `src/app/api/applications/[id]/follow-up/route.ts`, `src/inngest/functions/daily-job-hunt.ts`, `src/components/dashboard/BoardCard.tsx`, `src/components/dashboard/BoardView.tsx`, `src/components/dashboard/TableView.tsx`, `src/components/dashboard/ListView.tsx`, `src/__tests__/automated-followup-engine.test.ts` | Antigravity AI |
| 2026-09-19 | `CAG-16` | Implemented Offer Benchmarking & 3-Tiered Counter-Offer Strategy Assistant (`CAG-16`): (1) Added `offerDetails Json?` to `model Application` via safe raw SQL migration (`scripts/migrate-offer-details.ts`) preserving LangGraph checkpoint tables; (2) Built `negotiate-engine.ts` with market compensation percentiles (p25, p50, p75, p90) across software engineering domains, levels, and currencies (USD, EUR, GBP, CAD, BDT, INR); (3) Built BATNA Pipeline Leverage Score (0-100) assessing competing offers (+35 pts each) and active interview loops (+15 pts each); (4) Generated 3 tiered counter-offer strategies: Conservative (+5%), Balanced (+10%), and Ambitious (+18%) with talking points, email scripts, and counter packages; (5) Exposed `GET` & `POST /api/applications/[id]/negotiate` with tenant isolation (`getInternalUserId`) and distributed rate limiting; (6) Built 11 comprehensive unit and integration tests. Verified across all 79 vitest suites (467 tests passing), 0 TypeScript errors (`tsc --noEmit`), 0 ESLint errors, 0 Sparkles compliance. | `prisma/schema.prisma`, `scripts/migrate-offer-details.ts`, `src/lib/applications/negotiate-engine.ts`, `src/app/api/applications/[id]/negotiate/route.ts`, `src/__tests__/negotiation-engine.test.ts` | Antigravity AI |
| 2026-09-19 | `CAG-12` | Implemented Daily Strategic Executive Briefing Engine & API (`CAG-12`): (1) Created `src/lib/dashboard/briefing-engine.ts` aggregating staged packages, upcoming interviews within 72 hours, dormant follow-ups past 5 business days, and weekly goal progress; (2) Generated 3-bullet natural language executive tactical summary with dual-mode support (Gemini Flash / OpenAI when AI key present, instant high-fidelity deterministic summary fallback when offline); (3) Implemented structured priority actions with direct deep links (`/interview-prep`, `/applications?status=Staged`, `/applications?filter=followup`, `/discovery`) and urgency tiers (`urgent`, `high`, `medium`, `low`); (4) Created `GET /api/dashboard/briefing` endpoint with tenant isolation (`getInternalUserId`), distributed rate limiting (`checkDistributedRateLimit`), and no-store caching; (5) Built comprehensive test suite in `dashboard-briefing.test.ts`. Verified across all 80 vitest suites (473 tests passing), 0 TypeScript errors (`tsc --noEmit`), 0 ESLint errors, 0 Sparkles compliance. | `src/lib/dashboard/briefing-engine.ts`, `src/app/api/dashboard/briefing/route.ts`, `src/__tests__/dashboard-briefing.test.ts`, `docs/AUTONOMOUS-CAREER-AGENT-TRACKER.md`, `docs/JOB-DISCOVERY-TRACKER.md` | Antigravity AI |
| 2026-09-19 | `CAG-06` | Implemented Multi-Asset Studio Packaging Engine & API (`CAG-06`): (1) Created `src/lib/applications/package-engine.ts` aggregating complete application collateral (canonical tech stack extraction via `extractTechTagsFromText` and `jdKeywords`, tailored resume diff/JSON, default resume link, personalized cover letter, cold outreach pitch subject/body/checklist, company enrichment via `getCompanyEnrichment`, interview prep status with meeting links, and offer negotiation details); (2) Added state machine next best action resolver (`nextBestAction`) dynamically determining tactical actions (`SUBMIT_APPLICATION`, `SEND_FOLLOWUP`, `AWAIT_RESPONSE`, `PREP_INTERVIEW`, `BENCHMARK_OFFER`, `RETROSPECTIVE`, `PACKAGE_ASSETS`) with urgency tiers; (3) Created `GET /api/applications/[id]/package` endpoint with tenant isolation (`getInternalUserId`), distributed rate limiting (`checkDistributedRateLimit`), and no-store caching; (4) Built comprehensive unit and integration test suite in `application-package-engine.test.ts`. Verified across 81 vitest suites (481 tests passing), 0 TypeScript errors (`tsc --noEmit`), 0 ESLint errors, 0 Sparkles compliance. | `src/lib/applications/package-engine.ts`, `src/app/api/applications/[id]/package/route.ts`, `src/__tests__/application-package-engine.test.ts`, `docs/AUTONOMOUS-CAREER-AGENT-TRACKER.md`, `docs/JOB-DISCOVERY-TRACKER.md` | Antigravity AI |
| 2026-09-20 | `CAG-11` | Implemented Ambient Copilot Route & Entity Context Injection (`CAG-11`): (1) Added `AgentRouteContext` interface and `routeContext` state channel to `AgentState` schema in `src/lib/ai/graph/state.ts`; (2) Injected screen route, active entity type/id, and entity details into `planner.ts` and `responder.ts` prompt templates; (3) Updated `POST /api/agent/run` to accept `routeContext`, added tenant-isolated database enrichment (`Application` and `UserJobMatch` lookup strictly scoped to `userId`), and injected into initial LangGraph state input; (4) Built comprehensive unit and security test suite in `ambient-copilot-context.test.ts`. Verified across 82 vitest suites (486 tests passing), 0 TypeScript errors (`tsc --noEmit`), 0 ESLint errors, 0 Sparkles compliance. | `src/lib/ai/graph/state.ts`, `src/lib/ai/graph/nodes/planner.ts`, `src/lib/ai/graph/nodes/responder.ts`, `src/app/api/agent/run/route.ts`, `src/__tests__/ambient-copilot-context.test.ts`, `docs/AUTONOMOUS-CAREER-AGENT-TRACKER.md`, `docs/JOB-DISCOVERY-TRACKER.md` | Antigravity AI |
| 2026-09-20 | `PRIVATE-BETA-RELEASE-READY` | Completed all Private Beta transition milestones: (1) Added explicit `retries: 2` across all Inngest functions (`batch-job-pipeline.ts`, `daily-job-hunt.ts`, `company-dossier-pipeline.ts`, `career-orchestrator-pipeline.ts`, `inbox-sync.ts`, `interview-reminder-pipeline.ts`); (2) Verified DB soft-delete architecture: CanonicalJob and UserJobMatch are never hard-deleted; (3) Implemented CAG-14 Weakness Auto-Resolution Lifecycle (`resolveInterviewWeaknesses` in `memory.ts` and connected to `mock-interview/report/route.ts`); (4) Purged 20 legacy dead UI files; (5) Consolidated navigation to 4 pillars (CAG-09); (6) Automated test suite: 82/82 test files passed, 488/488 tests passed (100%); (7) Production Next.js build: 57 static/dynamic routes compiled cleanly (0 errors). Zero Sparkles rule verified. Release Readiness: RELEASE READY (97.3/100). | `src/inngest/functions/*`, `src/lib/ai/memory.ts`, `src/app/api/ai/mock-interview/report/route.ts`, `docs/AUTONOMOUS-CAREER-AGENT-TRACKER.md`, `docs/PRIVATE-BETA-EXECUTION-TRACKER.md` | Antigravity AI |




