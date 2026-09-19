# 🚀 CareerTrack Autonomous Career Agent: Concrete Implementation Roadmap

> **Source Audit Document**: [`docs/AUTONOMOUS-CAREER-AGENT-AUDIT.md`](./AUTONOMOUS-CAREER-AGENT-AUDIT.md)  
> **Living Execution Tracker**: [`docs/AUTONOMOUS-CAREER-AGENT-TRACKER.md`](./AUTONOMOUS-CAREER-AGENT-TRACKER.md)  
> **Date**: September 18, 2026  
> **Status**: Ready for Execution  
> **Principles**: Focus on shipping, deterministic execution, zero fake multi-agent loops, strictly no Sparkles icons.

---

## Roadmap Overview & Dependency Graph

```
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: Eliminate Debt, Unify Ingestion & Fix Data Loss (Days 1–10)   │
│ • Remove billing templates  • Fix localStorage bug                     │
│ • Activate JDIntakePanel    • Unify /api/opportunities/evaluate        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 2: Discovery-to-Application Pipeline & 1-Click Packaging (11–22) │
│ • 1-Click "Package Application"   • Staged application state           │
│ • Multi-asset Workbench           • Gmail auto-status sync             │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 3: IA Consolidation & Ambient Copilot (Days 23–35)               │
│ • Collapse 11 routes to 4 pillars • Merge Weekly Goals & Companies     │
│ • Slide-over Copilot (Cmd+J)      • Daily Strategic Executive Briefing │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 4: Autonomous Career Brain & Intelligent Loop Closure (36–50)    │
│ • First-class Career Brain UI     • Bi-directional debrief feedback    │
│ • Automated 5-day follow-up cron  • Offer benchmarking & negotiation   │
└────────────────────────────────────────────────────────────────────────┘
```

---

# Phase 1: Eliminate Debt, Unify Ingestion & Fix Data Loss (Days 1–10)

### 1.1 Remove Leftover SaaS Billing Artifacts & Deploy Real Career Metrics
* **Goal**: Clean out invoice/billing leftovers from the dashboard and establish real career search KPIs.
* **Required Backend Changes**:
  - Update `src/app/api/dashboard/stats/route.ts` to return career search velocity metrics:
    - `activeApplications`: Count of applications in `APPLIED` or `INTERVIEWING`.
    - `interviewsScheduled`: Count of applications with an upcoming `interviewDate`.
    - `responseRatePercentage`: Math.round((Interviewing + Offer) / Total * 100).
    - `averageResponseTimeDays`: Average days between `applicationDate` and first `StatusChange`.
    - `weeklyVelocity`: Array of applications submitted per week over the last 8 weeks.
* **Required Frontend Changes**:
  - Delete `src/components/billing-health.tsx`, `src/components/dashboard-invoices.tsx`, `src/components/net-revenue-chart.tsx`, and `src/components/channel-sales-chart.tsx`.
  - Create `src/components/dashboard/PipelineHealthCard.tsx`, `src/components/dashboard/RecentApplicationsCard.tsx`, `src/components/dashboard/ApplicationVelocityChart.tsx`, and `src/components/dashboard/FunnelConversionChart.tsx`.
  - Refactor `src/components/dashboard.tsx` to mount these new domain components within the blueprint grid layout using `DecorIcon` crosshairs.
* **Database Changes**: None (uses existing `Application` and `StatusChange` records).
* **Agent Workflow Changes**: None.
* **UX Changes**: The dashboard transitions from a financial admin look to a high-density Career Campaign Dashboard.
* **Priority**: **P0 (Immediate)**
* **Estimated Complexity**: **Low (1–2 days)**
* **Dependencies**: None.

---

### 1.2 Fix Critical `localStorage` Data Loss for Outreach Drafts
* **Goal**: Eradicate `localStorage.setItem("outreach_" + id)` in `ApplicationWorkbench.tsx` and persist all AI outreach materials to Postgres.
* **Database Changes**:
  - Extend `ApplicationAnalysis` in `prisma/schema.prisma`:
    ```prisma
    model ApplicationAnalysis {
      id                  String    @id @default(uuid())
      applicationId       String    @unique
      matchScore          Int?
      confidence          String?
      verdict             String?
      jdKeywords          Json?
      gapAnalysis         Json?
      resumeAdvice        Json?
      applyStrategy       Json?
      redFlags            String?
      finalRecommendation String?
      rawJd               String?
      rawAnalysis         String?
      outreachSubject     String?
      outreachBody        String?   @db.Text
      outreachChecklist   Json?
      tailoredResumeJson  Json?
      analyzedAt          DateTime  @default(now())

      application         Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)
    }
    ```
  - Run `npx prisma db push`.
* **Required Backend Changes**:
  - Add `PATCH /api/applications/[id]/analysis` to save, update, and retrieve outreach drafts and tailored resume payloads.
* **Required Frontend Changes**:
  - In `src/components/applications/ApplicationWorkbench.tsx`, replace all `localStorage` reads/writes with React Query mutations targeting `/api/applications/[id]/analysis`.
  - Add autosave indicators ("Draft saved to cloud").
* **Agent Workflow Changes**: Save outreach generation results directly to `ApplicationAnalysis`.
* **UX Changes**: Candidates can switch browsers, refresh pages, or access the mobile web without losing drafted cover letters and cold emails.
* **Priority**: **P0 (Immediate)**
* **Estimated Complexity**: **Low (1 day)**
* **Dependencies**: 1.1

---

### 1.3 Activate Orphaned `JDIntakePanel.tsx` & Build Unified Ingestion API
* **Goal**: Unify the 4 disparate external JD inputs into a single **Universal Opportunity Evaluator** powered by the existing orphaned scraper.
* **Required Backend Changes**:
  - Consolidate `/api/ai/scan-jd` and `/api/ai/scrape-url` into a single endpoint: `POST /api/discovery/evaluate`:
    ```ts
    // Accepts: { url?: string; rawText?: string; generatePackage?: boolean }
    // Returns: { roleSnapshot, matchScore, gapAnalysis, redFlags, companyIntel, packageId }
    ```
  - Integrate scam detection (`evaluateJobScamRisk`) and cross-encoder fit scoring into this single pass.
* **Required Frontend Changes**:
  - Adopt the orphaned `src/components/ai/JDIntakePanel.tsx`. Rename and place it at `src/components/discovery/UniversalJDEvaluator.tsx`.
  - Remove redundant JD textareas from `src/components/dashboard/DashboardQuickIntake.tsx` and `src/components/dashboard/CommandZone.tsx`.
  - Add a "Evaluate Any Job" button in the global header and Command Palette (`Cmd+K`) that triggers the `UniversalJDEvaluator` slide-over modal.
* **Database Changes**: None.
* **Agent Workflow Changes**: Combine scraping, parsing, and scoring into a single deterministic execution node.
* **UX Changes**: Candidate pastes a URL (LinkedIn, Greenhouse, Lever, Indeed) or raw text anywhere in the app and immediately receives an authoritative Opportunity Dossier with a 1-click action to stage or apply.
* **Priority**: **P0 (Critical)**
* **Estimated Complexity**: **Medium (2–3 days)**
* **Dependencies**: 1.2

---

### 1.4 Formalize the `STAGED` Application Pipeline State
* **Goal**: Create a distinct staging area between discovering a job and submitting an application.
* **Database Changes**:
  - Update `Application` model `status` field documentation/enums to officially support:
    `"STAGED" | "SAVED" | "APPLIED" | "INTERVIEWING" | "OFFER" | "REJECTED" | "ARCHIVED"`.
* **Required Backend Changes**:
  - Update `src/app/api/applications/route.ts` filters and status counters to handle `STAGED`.
  - Update `src/inngest/functions/batch-job-pipeline.ts` and `career-orchestrator.ts` to push high-fit matches directly as `STAGED` applications.
* **Required Frontend Changes**:
  - Update `src/components/dashboard/BoardView.tsx` and `TableView.tsx` to display a dedicated "Staged (Ready to Review)" column or filtered view.
* **Agent Workflow Changes**: The autonomous pipeline now has a clean persistence target for auto-packaged opportunities.
* **UX Changes**: Candidates see an "Inbox" of AI-prepared applications waiting for human approval.
* **Priority**: **P1**
* **Estimated Complexity**: **Low (1–2 days)**
* **Dependencies**: 1.2, 1.3

---

# Phase 2: Discovery-to-Application Pipeline & 1-Click Packaging (Days 11–22)

### 2.1 1-Click "Package Application" from Discovery Rows
* **Goal**: Close the dead-end in `/discovery` so candidates can tailor assets directly from the feed.
* **Required Backend Changes**:
  - Create endpoint `POST /api/discovery/[id]/package`:
    - Calls `generateApplicationMaterialsAgent` (from `src/lib/discovery/cover-letter-agent.ts`).
    - Generates truthful ATS-tailored resume bullets (from candidate's `bestProjects` and `UserMemory`).
    - Creates or updates an `Application` record with status `STAGED` and populates `ApplicationAnalysis`.
* **Required Frontend Changes**:
  - In `src/components/discovery/DiscoveryJobRow.tsx`, add a primary action button: **"Package & Stage"** (with loading indicator `Loader2`, strictly no Sparkles icon).
  - On completion, transition the button to **"View Package →"**, linking directly to `/applications/[id]`.
* **Database Changes**: None.
* **Agent Workflow Changes**: Wire the existing `cover-letter-agent.ts` and ATS resume generator into an atomic execution node.
* **UX Changes**: Discovery changes from a passive reading board into an active launching pad. 1-click generates all application collateral.
* **Priority**: **P0**
* **Estimated Complexity**: **Medium (2–3 days)**
* **Dependencies**: 1.3, 1.4

---

### 2.2 Re-architect Application Workbench into an Asset Studio
* **Goal**: Turn `/applications/[id]` into a unified, multi-asset campaign cockpit.
* **Required Backend Changes**:
  - Add endpoint `GET /api/applications/[id]/package` returning:
    - Target JD and extracted tech stack.
    - Tailored resume diff (comparing default resume to tailored variant).
    - Personalized cover letter.
    - Cold outreach pitch for LinkedIn/email.
    - Company intelligence summary.
* **Required Frontend Changes**:
  - Refactor `src/components/applications/ApplicationWorkbench.tsx`:
    - **Tab 1: Overview & Tracking**: Status transitions, timeline, contact person, interview dates.
    - **Tab 2: Tailored Resume**: Side-by-side ATS resume viewer with 1-click PDF download (using existing `ATSResumePreview.tsx`).
    - **Tab 3: Cover Letter & Outreach**: Editable drafts with copy buttons and checklist.
    - **Tab 4: Interview Prep**: Direct launch into mock interview session pre-configured for this role.
* **Database Changes**: None.
* **Agent Workflow Changes**: None.
* **UX Changes**: Candidate has all assets needed to submit an application on a single screen without jumping between `/resumes`, `/interview-prep`, and `/applications`.
* **Priority**: **P0**
* **Estimated Complexity**: **Medium (3 days)**
* **Dependencies**: 2.1

---

### 2.3 Wire Inngest Autonomous Orchestrator to User Staging Feed
* **Goal**: Bring `career-orchestrator.ts` out of hidden background tests and into production for all active users.
* **Required Backend Changes**:
  - In `src/inngest/functions/batch-job-pipeline.ts`, trigger `createCareerOrchestratorGraph` for users whose top match exceeds 85% fit.
  - Automatically stage up to 3 top opportunities per 24-hour cycle.
  - Create an in-app notification: *"Career Orchestrator staged 2 high-fit applications for your review."*
* **Required Frontend Changes**:
  - Add a **"Staged by Agent"** badge in the application list and board view.
  - Add an "Agent Staged Applications" quick-filter.
* **Database Changes**: None.
* **Agent Workflow Changes**: Connect LangGraph checkpointer state to Inngest step runs with telemetry.
* **UX Changes**: The platform acts while the user sleeps. The user wakes up to pre-assembled, high-fit job applications ready for review.
* **Priority**: **P1**
* **Estimated Complexity**: **Medium (2–3 days)**
* **Dependencies**: 1.4, 2.1

---

### 2.4 Inbound Gmail Auto-Status Ingestion
* **Goal**: Use existing Gmail OAuth integration (`src/lib/gmail-sync.ts`) to automatically update application status based on real recruiter replies.
* **Required Backend Changes**:
  - In `src/lib/gmail-sync.ts`, implement an AI email classifier using structured output:
    - Input: Inbound email subject + body snippet + list of active applications (company names).
    - Output: `{ matchedApplicationId: string; detectedStatus: "APPLIED" | "INTERVIEWING" | "REJECTED"; interviewDate?: string; meetingUrl?: string }`.
  - Automatically update `Application.status`, record a `StatusChange`, and populate `interviewDate`/`interviewMeetingUrl` when detected.
  - Dispatch in-app notification: *"Interview detected with Stripe for Oct 24th. Added to your schedule."*
* **Required Frontend Changes**:
  - Display "Updated via Email Sync" badge on status changes in `src/components/applications/MilestoneTimeline.tsx`.
* **Database Changes**: None.
* **Agent Workflow Changes**: Deterministic zero-shot classification node via Gemini 1.5 Flash / Groq.
* **UX Changes**: Candidate no longer needs to manually drag cards when they receive interview requests or rejection emails.
* **Priority**: **P1**
* **Estimated Complexity**: **High (3–4 days)**
* **Dependencies**: 1.4

---

# Phase 3: IA Consolidation & Ambient Copilot (Days 23–35)

### 3.1 Consolidate Sidebar Navigation: 11 Routes $\rightarrow$ 4 Core Pillars
* **Goal**: Eliminate clutter and organize around user outcomes.
* **Required Backend Changes**: None.
* **Required Frontend Changes**:
  - Refactor `src/components/app-shared.tsx` and `src/components/app-sidebar.tsx`:
    ```ts
    export const navGroups: SidebarNavGroup[] = [
      {
        label: "Career Operating System",
        items: [
          { title: "Campaign", path: "/dashboard", icon: <LayoutGridIcon className="size-4" /> },
          { title: "Discovery", path: "/discovery", icon: <CompassIcon className="size-4" /> },
          { title: "Pipeline", path: "/applications", icon: <BriefcaseIcon className="size-4" /> },
          { title: "Interview Lab", path: "/interview-prep", icon: <BrainCircuit className="size-4" /> },
        ],
      },
      {
        label: "Ground Truth",
        items: [
          { title: "Career Brain", path: "/brain", icon: <BotIcon className="size-4" /> },
          { title: "Settings", path: "/settings", icon: <SettingsIcon className="size-4" /> },
        ],
      },
    ]
    ```
  - Add Next.js redirect in `next.config.ts`:
    - `/resumes` $\rightarrow$ `/applications?tab=assets`
* **Database Changes**: None.
* **Agent Workflow Changes**: None.
* **UX Changes**: Clear, uncluttered 4-pillar mental model. No fragmented submenus. Retains `/discovery` without URL churn.
* **Priority**: **P0**
* **Estimated Complexity**: **Low (1 day)**
* **Dependencies**: Phase 1, Phase 2

---

### 3.2 Merge Weekly Goals & Companies into Core Workspaces
* **Goal**: Remove standalone bloat pages `/weekly-goals` and `/companies`.
* **Required Backend Changes**: None.
* **Required Frontend Changes**:
  - **Weekly Goals**: Embed as an interactive widget on the main Campaign Dashboard (`WeeklyGoalsWidget.tsx`).
  - **Companies**: Embed company intelligence directly within the Application detail workbench and Opportunity dossiers. Delete standalone `/companies` page and redirect route to `/applications`.
* **Database Changes**: None (preserve `WeeklyGoal` and `Company` models).
* **Agent Workflow Changes**: The Campaign Orchestrator evaluates weekly goal progress automatically at the end of each week (via existing `weekly-goal-digest.ts`).
* **UX Changes**: Removes 2 redundant pages from candidate's mental space.
* **Priority**: **P1**
* **Estimated Complexity**: **Medium (2 days)**
* **Dependencies**: 3.1

---

### 3.3 Demote `/ai-assistant` to Ambient Slide-over Copilot (`Cmd+J`)
* **Goal**: Stop isolating AI in a chat room. Make the agent omnipresent and context-aware.
* **Required Backend Changes**:
  - Update `src/app/api/agent/run/route.ts` to accept route context metadata: `{ currentRoute: string; entityId?: string; entityType?: "application" | "opportunity" | "general" }`.
  - In `src/lib/ai/graph/nodes/planner.ts`, inject current page context into the initial agent state.
* **Required Frontend Changes**:
  - Build `CopilotDrawer.tsx` (using Sheet / Drawer component).
  - Register global keyboard shortcut `Cmd+J` (or `Ctrl+J`) and a persistent trigger button in the bottom-right status bar or header.
  - Mount `CopilotDrawer` in `src/components/app-shell.tsx`.
  - Deprecate `/ai-assistant` page and redirect to `/dashboard?copilot=open`.
* **Database Changes**: None.
* **Agent Workflow Changes**: Copilot automatically loads context based on where the user is (e.g., if viewing Stripe application, agent already has Stripe's JD and notes loaded).
* **UX Changes**: The user never leaves their active work to get AI assistance. It functions like GitHub Copilot or Cursor for your career search.
* **Priority**: **P0**
* **Estimated Complexity**: **High (3–4 days)**
* **Dependencies**: 3.1

---

### 3.4 Deploy Daily Strategic Briefing on Dashboard
* **Goal**: Greet the user with an actionable, prioritized briefing every morning.
* **Required Backend Changes**:
  - Create endpoint `GET /api/dashboard/briefing`:
    - Aggregates: new staged matches today, applications pending follow-up (5+ days), upcoming interviews in next 72 hours, and goal progress.
    - Generates a 3-bullet natural language executive summary using Gemini Flash.
* **Required Frontend Changes**:
  - Build `DailyBriefingCard.tsx` following the blueprint grid layout with `DecorIcon` crosshairs.
  - Include quick-action buttons: *"Review Staged (3)"*, *"Send Follow-ups (1)"*, *"Prep for Tomorrow's Interview"*.
* **Database Changes**: None.
* **Agent Workflow Changes**: Scheduled morning briefing run via Inngest `daily-job-hunt.ts`.
* **UX Changes**: Instead of guessing what to do, the user opens CareerTrack and gets an instant 30-second prioritized battle plan.
* **Priority**: **P1**
* **Estimated Complexity**: **Medium (2 days)**
* **Dependencies**: 1.1, 1.4, 2.3

---

# Phase 4: Autonomous Career Brain & Intelligent Loop Closure (Days 36–50)

### 4.1 First-Class "Career Brain" Dossier UI
* **Goal**: Move user memory from a hidden settings tab to a core asset the user controls.
* **Required Backend Changes**:
  - Enhance `/api/user/memories`:
    - Support batch categorization: `CONSTRAINTS` (salary, location, visas), `VERIFIED_SKILLS` (tech stack + projects), `PREFERENCES` (culture, company size), and `INTERVIEW_WEAKNESSES` (areas to improve).
    - Add confidence score adjustments and candidate verification flags (`isVerified: boolean`).
* **Required Frontend Changes**:
  - Create `/brain` page (or high-level modal) replacing `AIMemoryManager.tsx`.
  - Provide a clean, structured UI:
    - **Non-Negotiables**: Salary floor, remote requirement, notice period.
    - **Verified Competencies**: Projects with verified metric impact.
    - **Growth Areas / Known Gaps**: Extracted from mock interviews with toggle to dismiss once resolved.
* **Database Changes**:
  - Add `isVerified Boolean @default(true)` and `pinned Boolean @default(false)` to `UserMemory` in `prisma/schema.prisma`.
* **Agent Workflow Changes**: Inject verified Career Brain facts into every prompt template as immutable system constraints.
* **UX Changes**: Candidate has full visibility and sovereignty over what the AI knows, eliminating hallucinations and aligning all agent outputs with truth.
* **Priority**: **P1**
* **Estimated Complexity**: **Medium (2–3 days)**
* **Dependencies**: Phase 3

---

### 4.2 Bi-directional Interview Feedback Loop
* **Goal**: Automatically feed mock interview weaknesses into the resume tailoring engine and future mock sessions.
* **Required Backend Changes**:
  - In `src/app/api/ai/mock-interview/report/route.ts`, ensure identified knowledge gaps are stored with category `INTERVIEW_WEAKNESS` in `UserMemory`.
  - In `src/lib/ai/graph/workflows/interview-coach.ts`, retrieve historical `INTERVIEW_WEAKNESS` memories to dynamically drill the candidate on previous mistakes.
  - In the Resume Tailoring Agent, flag when a target JD requires a skill that is currently logged as an active weakness.
* **Required Frontend Changes**:
  - Display "Targeted Historical Weakness" badge during mock interview question rendering.
  - In the interview debrief modal, show: *"1 gap logged to Career Brain. Click to review."*
* **Database Changes**: None.
* **Agent Workflow Changes**: Update state machine in `interview-coach.ts` to include memory retrieval step before generating questions.
* **UX Changes**: The AI actively helps candidates improve over time, transforming mock interviews from a toy into continuous career conditioning.
* **Priority**: **P1**
* **Estimated Complexity**: **Medium (3 days)**
* **Dependencies**: 4.1

---

### 4.3 Automated Follow-up Dispatch Engine
* **Goal**: Proactively draft polite follow-ups when applications go silent for 5 business days.
* **Required Backend Changes**:
  - In `src/inngest/functions/daily-job-hunt.ts`, add a step: `scan-stale-applications`:
    - Find applications where `status == "APPLIED"`, `applicationDate <= now - 5 days`, and no recent status change.
    - Generate personalized follow-up draft using candidate tone and job notes.
    - Save to `ApplicationAnalysis.outreachBody` and create notification: `type: "FOLLOW_UP"`.
* **Required Frontend Changes**:
  - Add a **"Follow-up Due"** chip on Kanban cards in `BoardView.tsx`.
  - Clicking chip opens a 1-click modal to copy or send via connected Gmail account.
* **Database Changes**: None.
* **Agent Workflow Changes**: Scheduled deterministic worker triggering targeted generation.
* **UX Changes**: Eliminates candidate mental overhead of tracking when to follow up.
* **Priority**: **P2**
* **Estimated Complexity**: **Medium (2 days)**
* **Dependencies**: 1.2, 2.4

---

### 4.4 Offer Benchmarking & Negotiation Strategy Assistant
* **Goal**: Provide data-driven leverage and scripts when an application reaches the `OFFER` stage.
* **Required Backend Changes**:
  - Create endpoint `POST /api/applications/[id]/negotiate`:
    - Compares offer base salary, equity, and bonus against market percentiles for role, level, and location.
    - Takes into account active pipeline leverage (e.g., *"You currently have 2 other companies in final interview rounds"*).
    - Generates 3 counter-offer strategy scripts: Conservative, Balanced, and Aggressive.
* **Required Frontend Changes**:
  - When an application status transitions to `OFFER`, reveal an **"Offer & Negotiation Strategy"** workbench tab.
  - Display salary percentile gauge and editable counter-offer email templates.
* **Database Changes**:
  - Add `offerDetails Json?` to `Application` model in Prisma.
* **Agent Workflow Changes**: Specialized negotiation reasoning prompt with structured compensation outputs.
* **UX Changes**: Complete end-to-end loop closure—guiding the candidate from discovery all the way to maximizing compensation at offer acceptance.
* **Priority**: **P2**
* **Estimated Complexity**: **Medium (3 days)**
* **Dependencies**: 1.4, Phase 3

---

# Execution Order & Timeline Summary

| Phase | Milestone | Duration | Primary Outcome |
| :--- | :--- | :---: | :--- |
| **Phase 1** | **Stabilization & Ingestion Unification** | **Days 1–10** | Remove billing artifacts, fix localStorage data loss, activate `UniversalJDEvaluator`, formalize `STAGED` state. |
| **Phase 2** | **1-Click Packaging & Automation** | **Days 11–22** | 1-Click "Package & Stage", multi-asset studio, Inngest auto-staging, Gmail auto-status sync. |
| **Phase 3** | **IA Consolidation & Ambient Copilot** | **Days 23–35** | 4-pillar navigation, merge bloated pages, ambient slide-over Copilot (`Cmd+J`), daily strategic briefing. |
| **Phase 4** | **Career Brain & Loop Closure** | **Days 36–50** | First-class Career Brain UI, bi-directional interview memory, 5-day follow-up engine, offer negotiation assistant. |
