# AI Agent Workflow UX Fix Plan

## Purpose

CareerTrack-er AI assistant currently ekta separate chat destination-er moto behave kore. User job tracking, application detail, interview prep, weekly planning, and profile setup korche app-er different screens-e, kintu AI help pete hole mostly `/ai-assistant` page-e jete hoy. Ei separation user-ke context switch korte badhyo kore and assistant-ke "useful collaborator" er bodole "another chat window" mone hoy.

This plan redesigns the AI experience from **chat-first** to **workflow-first**.

Primary product direction:

> AI should live inside the job-search workflow, propose concrete actions, show previews, and apply approved changes. Chat remains available as a fallback, not the main experience.

Important correction:

> The main workflow is not a ChatGPT/Gemini-style guided chat. The main workflow starts when the user submits a job/JD. AI should analyze that job and render a beautiful pre-formatted result screen with structured sections and action buttons. The user then takes actions from that result UI: save job, mark email sent, move to applied, draft outreach, create prep, set follow-up, or skip.

## Current Problems

### 1. AI Is A Separate Destination

Current behavior:

- Sidebar has a dedicated `AI Assistant` nav item.
- Dashboard `Quick Analyze` redirects to `/ai-assistant`.
- Application pages contain some AI analysis, but the board/list modal does not expose the same workflow.

Why this hurts:

- User loses the object they were working on.
- The assistant does not feel aware of the current page.
- The app feels like two products: tracker + chatbot.

Target behavior:

- AI appears contextually beside the current job/application/task.
- `/ai-assistant` becomes an optional history/ask-anything page.
- Most AI actions happen inside Dashboard, Applications, Application Detail, Prep, and Profile.

### 2. AI Replies But Does Not Reliably Act

Current behavior:

- `/api/ai/chat` streams text and saves messages.
- There is no production-grade action proposal/execution layer.
- User can say "I applied to Google", but the assistant does not update the application record automatically.

Why this hurts:

- The user still has to do manual CRUD after talking to AI.
- Chat feels performative instead of operational.
- Trust drops because the agent sounds capable but does not complete the workflow.

Target behavior:

- AI returns structured action proposals.
- UI shows a preview card with before/after fields.
- User can apply, edit, or cancel.
- Approved actions call normal app APIs or dedicated server action routes.

### 3. AI Mode Detection Is Too Fragile

Current behavior:

- Unknown messages default to `jd-scan`.
- Mode detection is pattern-based and not tied to page context.

Why this hurts:

- General questions can be interpreted as JD scan.
- The same user message should mean different things depending on whether they are on Dashboard, Application Detail, or Interview Prep.

Target behavior:

- Mode router accepts explicit UI context:
  - current route
  - selected application id
  - selected entity type
  - user intent from action button
- Unknown messages fall back to `general`, not `jd-scan`.
- Buttons and forms pass forced modes for high-confidence flows.

### 4. Application Workflow Is Fragmented

Current behavior:

- Application list/board opens `ApplicationDetailModal`.
- Full application detail page contains `ApplicationAnalysisSection`.
- Add/edit forms are duplicated across modal and page flows.

Why this hurts:

- User sees different capabilities depending on how they opened the same application.
- AI analysis is not consistently available.
- Maintenance cost increases because forms and behaviors diverge.

Target behavior:

- One reusable `ApplicationWorkbench` surface handles:
  - core job details
  - status changes
  - notes/tags
  - AI analysis
  - cover letter
  - follow-up draft
  - interview prep
  - activity timeline
- Modal and full page can share the same underlying sections.

### 5. Manual Data Entry Is Still The Primary Flow

Current behavior:

- Main creation path is manual `Add Application`.
- JD scan is a separate AI operation.
- Saving analysis and saving application are separate mental models.

Why this hurts:

- User has to copy/paste company/title/source/status manually.
- The highest-value AI flow, "paste JD -> save job -> know next step", is not first-class.

Target behavior:

- Primary add flow is:
  1. Paste JD or job URL.
  2. AI extracts job facts.
  3. AI scores fit and identifies gaps.
  4. User confirms save.
  5. App creates application + analysis together.

## Target UX Model

## Job Submission Result UI

The main AI workflow should start from a simple user action:

```txt
User submits a job/JD/job URL.
```

After submission, the app should not open a blank chat. Instead, it should show a polished, pre-formatted AI result screen with structured sections and clear actions.

Desired flow:

```txt
1. User pastes JD or submits job URL.
2. AI analyzes the job.
3. UI renders a structured result page/drawer/card.
4. User chooses actions from buttons.
5. Each action updates the tracker or generates the next artifact.
```

This is the primary experience.

### Result UI Sections

The AI result should be displayed as formatted UI, not as a chat bubble.

Recommended sections:

1. **Job Snapshot**
   - company
   - role
   - source
   - job URL
   - location/work mode
   - seniority
   - salary if found
   - tech stack

2. **Fit Summary**
   - match score
   - verdict: strong apply / apply after tweaks / stretch / skip / avoid
   - confidence
   - top reasons

3. **Gaps And Red Flags**
   - missing keywords
   - missing proof/projects
   - risky requirements
   - scam/low-quality signals

4. **Resume And Application Advice**
   - keywords to add
   - projects to highlight
   - bullet suggestions
   - whether a custom resume version is needed

5. **Recommended Next Actions**
   - save job
   - draft email
   - mark email sent
   - move to applied
   - create prep plan
   - set follow-up
   - skip job

6. **Generated Artifacts**
   - cover letter
   - recruiter email
   - LinkedIn DM
   - resume bullets
   - interview questions

### Primary Action Buttons

The result UI should include action buttons that directly move the workflow forward.

Required actions:

- `Save Job`
  - Creates application with status `Saved`.
  - Saves AI analysis.
  - Keeps user on the result/workbench.

- `Draft Email`
  - Generates recruiter/cold outreach email.
  - Does not change application status yet.

- `Mail Sent`
  - Saves the job if not already saved.
  - Marks outreach/email as sent.
  - Moves application status to `Applied`.
  - Adds activity timeline entry.
  - Suggests follow-up date.

- `Send Application Email`
  - Available when the JD says to apply by email or includes an application email address.
  - Extracts recipient email from the JD.
  - Generates a complete editable email draft with recipient, subject, body, and optional attachment suggestions.
  - User reviews/edits the draft.
  - User clicks `Send`.
  - App sends the email from the user's connected email account.
  - After successful send, application status becomes `Applied` and activity records `Application email sent`.

- `Mark Applied`
  - Saves the job if not already saved.
  - Moves application status to `Applied`.
  - Adds status change record.

- `Create Prep`
  - Creates interview prep questions or prep notes from the JD.
  - Links prep to the application.

- `Set Follow-up`
  - Adds follow-up metadata or note.
  - Future schema may need `FollowUp` or `Task` model.

- `Skip`
  - Does not create an active application by default.
  - Optionally saves as skipped/rejected/archived if the product adds that status.

### Apply By Email Section (Tiered Email Outreach)

If the JD includes an email address or says to apply by email, the AI result UI should show a dedicated mail section.

Detection examples:

```txt
Send your CV to jobs@company.com
Apply by email at careers@company.com
Email your resume and cover letter to hr@company.com
```

AI should extract:

- recipient email
- company name
- role name
- required subject format if mentioned
- required attachments if mentioned
- instructions such as portfolio link, salary expectation, notice period, or cover letter

Mail UI should show an editable draft:

```txt
To: jobs@company.com
Subject: Application for Frontend Developer - Muzahid
Body:
  Dear Hiring Team,
  ...
Attachments:
  [Resume selector]
  [Cover letter optional]
```

To optimize security and reduce setup friction, a **tiered integration approach** is used:

#### Tier 1: Zero-Friction Native Mailer (Default)
- **`Copy Subject / Body`**: Instant clipboard copying.
- **`Open Mail Client`**: Generates a standard `mailto:` link populated with recipient, subject, and body:
  `mailto:recipient@company.com?subject=SubjectLine&body=BodyContent`
- **`Mark Sent Manually`**: Moves the tracker status to `Applied` and records the email outreach event.

#### Tier 2: Connect SMTP/API (Optional Extension)
- **`Send From My Email`**: Connects via SMTP settings or OAuth (Gmail/Outlook) to send directly.
- **`OAuth Authorization`**: Safe auth configuration flow for Gmail/Outlook API.

Important safety rules:

- Never send automatically after AI generation.
- User must review and edit the draft.
- Attachments must be explicitly selected by the user.
- If send fails, do not move status to `Applied` automatically.
- Provide `Mark Sent Manually` for users who send from outside the app.

Recommended future data fields or model:

```prisma
model EmailActivity {
  id            String   @id @default(uuid())
  userId        String
  applicationId String
  provider      String   // mailto | gmail | outlook | smtp | manual
  to            String
  subject       String
  body          String?
  status        String   // draft | sent | failed | manual
  messageId     String?
  sentAt        DateTime?
  createdAt     DateTime @default(now())
}
```
```
### Status Behavior

Initial JD analysis should not automatically create an application unless user clicks an action.

Status rules:

```txt
Analyze only        -> no application created yet
Save Job            -> Saved
Mark Applied        -> Applied
Mail Sent           -> Applied + outreach/email activity
Create Prep         -> keep current status, add prep records
Skip                -> no active application, or archived/skipped if supported
```

### Example User Experience

```txt
User pastes JD.

UI shows:
- React Frontend Developer at Acme
- Match score: 78%
- Verdict: Apply after small resume tweaks
- Missing: testing, GraphQL
- Highlight: React, TypeScript, dashboard project

Actions:
[Save Job] [Draft Email] [Mail Sent] [Create Prep] [Skip]
```

If user clicks `Save Job`:

```txt
Application created.
Status: Saved
AI analysis saved.
Next suggested action: Draft Email.
```

If user clicks `Mail Sent`:

```txt
Application created if needed.
Status: Applied
Activity: Outreach email sent.
Follow-up suggested for 7 days later.
```

### Chat Role In This Model

Chat can still exist, but it is not the main workflow.

Chat is useful for:

- asking follow-up questions about the analysis
- editing generated email/cover letter
- explaining why the score is low/high
- brainstorming resume improvements

But the main job workflow should happen through structured result UI and action buttons.
### Principle 1: Ask Less, Act More

AI should not only answer. It should produce useful app changes:

- create application
- update application status
- add follow-up note
- create prep questions
- generate response draft
- update weekly goal progress
- update user profile fields

### Principle 2: Every AI Action Needs A Preview

For trust, AI writes should be visible before they happen.

Preview card must show:

- entity type
- action type
- confidence
- affected fields
- before values if updating
- after values
- warnings or missing data
- buttons: `Apply`, `Edit`, `Cancel`

Delete actions must always use a destructive confirmation dialog.

### Principle 3: Chat Is A Fallback, Not The Product

Chat remains useful for:

- open-ended coaching
- history
- explaining prior recommendations
- recovery/support conversations
- multi-step brainstorming

But the primary UI should be:

- contextual panels
- inline actions
- preview cards
- command palette actions
- workflow-specific generated artifacts

### Principle 4: Page Context Should Drive AI

The assistant should know where it is being used.

Examples:

- Dashboard: "What should I do today?"
- Applications board: "Move this application to Interview."
- Application detail: "Draft a follow-up for this job."
- Interview prep: "Generate questions from this JD."
- Profile: "Improve my profile for frontend roles."

## Proposed Information Architecture

Current nav:

- Dashboard
- Applications
- Companies
- Prep
- AI Assistant
- Resumes
- Calendar
- Profile

Recommended nav:

- Today
- Pipeline
- Jobs
- Prep
- Profile
- Settings

### Today

Purpose: daily command center.

Contains:

- active pipeline count
- stale applications
- follow-ups due
- weekly goal progress
- next recommended actions
- quick JD intake
- recent AI action history

AI role:

- recommend today's top 3 actions
- draft follow-ups
- review blockers
- update goals
- create applications from JD paste

### Pipeline

Purpose: manage application statuses.

Contains:

- board/table/list views
- filters
- status drag/drop
- batch actions
- application workbench drawer

AI role:

- update status from natural language
- detect stale applications
- suggest follow-up timing
- summarize pipeline health

### Jobs

Purpose: saved and analyzed opportunities.

Contains:

- saved jobs
- JD analyses
- match scores
- apply/skip verdicts
- resume tailoring tasks

AI role:

- extract job data from pasted JD
- score fit
- compare jobs
- suggest whether to apply

### Prep

Purpose: interview preparation and recruiter response workflows.

Contains:

- prep questions
- prep notes
- generated interview plans
- application-linked notes

AI role:

- generate interview questions from selected application
- draft STAR answers
- create prep plan
- draft recruiter replies

### Profile

Purpose: user context that powers AI.

Contains:

- target roles
- skills/strengths/gaps
- projects
- resumes
- links
- preferences

AI role:

- profile completeness review
- project proof improvement
- resume positioning guidance
- missing context prompts

## Core Workflow Redesigns

## Workflow 1: Add Job From JD

### Current Flow

1. User clicks `Add Application`.
2. User manually enters company, title, URL, source, status, notes.
3. User separately goes to AI assistant or application detail to analyze.

### New Flow (Asynchronous & Optimistic)

1. User opens `Add Job` or uses Dashboard JD intake.
2. User pastes JD text or job URL.
3. The app **instantly creates the Application record** with optimistic/placeholder fields (e.g., matching company name or title via basic client-side URL parsing, or asking the user for a quick 2-field entry).
4. The user is redirected to the Application Workbench immediately, preventing a 5-10 second blocking spinner.
5. In the background, the app calls `/api/ai/jobs/extract` to asynchronously parse the JD.
6. The AI extracts job details and generates match analysis:
   - company, title, tech stack, salary, location
   - match score, verdict, red flags
   - missing keywords, resume advice, apply strategy
7. Once analysis finishes (updated via polling/SSE), the UI merges the extracted fields, updates the `Application` record, and populates the `ApplicationAnalysis` model.
8. The UI offers subsequent actions:
   - `Draft cover letter`
   - `Tailor resume bullets`
   - `Create interview prep`
   - `Skip for now`

### Required UI

Create component:

```txt
src/components/ai/JDIntakePanel.tsx
```

States:

- empty
- analyzing
- extraction preview
- validation errors
- saved result
- AI not configured

### Required API

Create route:

```txt
POST /api/ai/jobs/extract
```

Request:

```json
{
  "jdText": "string",
  "jobUrl": "optional string",
  "source": "optional string"
}
```

Response:

```json
{
  "proposalId": "string",
  "confidence": "High | Medium | Low",
  "application": {
    "companyName": "string",
    "jobTitle": "string",
    "jobUrl": "string | null",
    "source": "string",
    "applicationDate": "YYYY-MM-DD",
    "status": "Saved",
    "notes": "string"
  },
  "analysis": {
    "matchScore": 0,
    "confidence": "High | Medium | Low",
    "verdict": "string",
    "missingGaps": {},
    "resumeAdvice": {},
    "applyStrategy": {},
    "redFlags": "string | null",
    "finalRecommendation": "string"
  },
  "warnings": []
}
```

Create route:

```txt
POST /api/ai/jobs/apply-proposal
```

This route validates the proposal and creates:

- `Application`
- `ApplicationAnalysis`
- optional `Company`
- optional tags

## Workflow 2: Update Tracker From Natural Language

### Current Flow

1. User manually opens application.
2. User changes status.
3. User adds notes separately.

### New Flow (Deterministic Suggestions & Autocomplete)

To prevent latency, token cost, and parsing fragility, we avoid raw NLP-to-DB updates. Instead:

1. **Deterministic Autocomplete:** Inside the Command Palette, typing a command (e.g., `/status Google Applied`) uses client-side keyword matching against active applications. No LLM call is made.
2. **AI Suggestion Cards:** Inside the Chat Panel, if a user mentions an update (e.g., *"I applied to Google today"*), the AI returns a formatted **Action Suggestion Card** containing a direct link/button to trigger the REST update. 
3. **Implicit Contextual Forms:** Updates are applied deterministically via standard client-side forms/API calls, ensuring 100% precision.

### Required UI

Update:
- `src/components/CommandPalette.tsx` to handle prefix autocomplete commands.
- `src/components/ai/ActionPreviewCard.tsx` to display deterministic UI buttons/cards suggested by the AI assistant.

### Required API

Create route:

```txt
POST /api/ai/actions/preview
```

Request:

```json
{
  "message": "string",
  "route": "/applications",
  "entityType": "application | profile | weeklyGoal | prepQuestion | none",
  "entityId": "optional string"
}
```

Response:

```json
{
  "mode": "tracker",
  "summary": "string",
  "actions": [
    {
      "id": "string",
      "type": "create | update | delete",
      "entity": "application",
      "confidence": "High | Medium | Low",
      "before": {},
      "after": {},
      "requiresConfirmation": true,
      "warnings": []
    }
  ],
  "assistantMessage": "string"
}
```

Create route:

```txt
POST /api/ai/actions/apply
```

Request:

```json
{
  "actions": []
}
```

Server rules:

- Validate every action with Zod.
- Re-check ownership with `getInternalUserId`.
- Never trust client-supplied user id.
- Delete actions require `confirmed: true`.
- Log action results to `ChatMessage.metadata` or a future `AIActionLog` model.

## Workflow 3: Application Workbench

### Current Flow

Application modal has details and edit/delete. Full application page has AI analysis.

### New Flow

Application detail becomes an action workbench:

```txt
-----------------------------------------------------
Header: Company, role, status, source, job link
-----------------------------------------------------
Main left:
- Details
- Notes
- Tags
- Activity timeline

Right panel:
- Match score
- Next best action
- AI actions:
  - Analyze match
  - Draft cover letter
  - Draft follow-up
  - Generate interview prep
  - Update status
-----------------------------------------------------
Generated artifacts:
- Cover letter
- Email drafts
- Prep plan
- Resume bullet suggestions
-----------------------------------------------------
```

### Required Components

Create shared workbench:

```txt
src/components/applications/ApplicationWorkbench.tsx
src/components/applications/ApplicationAIPanel.tsx
src/components/applications/ApplicationGeneratedArtifacts.tsx
```

Refactor:

- `ApplicationDetailModal` should use `ApplicationWorkbench`.
- `applications/[id]/page.tsx` should use `ApplicationWorkbench`.
- `ApplicationAnalysisSection` should become one panel inside the workbench.

## Workflow 4: Command Palette As AI Action Launcher

### Current Flow

Command palette searches pages and applications.

### New Flow

Command palette supports:

- navigation
- search
- AI commands
- natural language action preview

Example commands:

```txt
Add job from JD
Update application status
Draft recruiter reply
Prepare interview questions
Review this week
Find stale applications
```

Natural language examples:

```txt
Move Meta to interview
Follow up with Stripe tomorrow
Create prep plan for the Google role
Draft a reply to this recruiter message
```

### Required UI Changes

Update:

```txt
src/components/CommandPalette.tsx
```

Add sections:

- Pages
- Applications
- AI Actions
- Suggested Commands

Behavior:

- If query matches navigation, show page results.
- If query looks like an instruction, call `/api/ai/actions/preview`.
- Show `ActionPreviewCard` inside command palette or open a compact action sheet.

## Workflow 5: Today Page

### Current Dashboard Problem

Dashboard shows stats, charts, weekly goals, and quick analyze, but it does not tell the user what to do next.

### New Today Page

The primary landing page after sign-in should answer:

> What should I do next in my job search today?

Sections:

1. `Now`
   - top 3 recommended actions
   - examples: follow up, apply, prepare, update profile

2. `Due`
   - stale applications
   - follow-up reminders
   - upcoming interviews

3. `Capture`
   - paste JD/job URL
   - save job with AI preview

4. `Pipeline Pulse`
   - active applications
   - interviews
   - response rate
   - risky/stale statuses

5. `Weekly Goals`
   - progress
   - update from natural language

AI role:

- generate next actions from current DB state
- help user complete them in-place

## Required Data/Schema Changes

### 1. Resume Text Content (Critical for Match Score)

Currently, the `Resume` model only stores file metadata. To enable accurate AI fit scoring, we must store the parsed text of the resume.

```prisma
model Resume {
  id          String   @id @default(uuid())
  userId      String
  title       String
  fileName    String
  fileUrl     String
  fileSize    Int
  isDefault   Boolean  @default(false)
  textContent String?  // Added: Stores parsed/extracted text content of the resume
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

### 2. Action Tracking & Timeline (Audit trail)

Instead of a heavy `AIActionLog` table that introduces complex sync overhead, we recommend **enriching the existing `StatusChange` model** with metadata to store the changes.

```prisma
model StatusChange {
  id            String   @id @default(uuid())
  applicationId String
  fromStatus    String?
  toStatus      String
  changedAt     DateTime @default(now())
  metadata      Json?    // Added: Stores metadata like { initiatedBy: "AI", confidence: "High" }

  application Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)

  @@index([applicationId])
}
```

Use this if the app needs:

- action history
- undo support
- trust/audit trail
- debugging AI writes

## AI Mode Router Changes

Current mode list:

- profile
- jd-scan
- application
- tracker
- response
- interview
- weekly
- recovery

Recommended mode list:

- general
- profile
- jd-scan
- application
- tracker
- response
- interview
- weekly
- recovery

Changes:

- Add `general`.
- Unknown messages return `general`, not `jd-scan`.
- `classifyMode` should accept context:

```ts
interface ModeContext {
  route?: string
  entityType?: "application" | "profile" | "weeklyGoal" | "prepQuestion"
  entityId?: string
  forcedMode?: AIMode
}
```

New function:

```ts
export function classifyMode(message: string, context?: ModeContext): AIMode
```

Rules:

- If `forcedMode`, use it.
- If route is `/applications/[id]`, prefer `application`, `response`, `interview`, or `tracker`.
- If route is `/interview-prep`, prefer `interview`.
- If route is `/weekly-goals` or Today weekly panel, prefer `weekly`.
- If message is long and JD-like, use `jd-scan`.
- Otherwise use `general`.

## Context Builder Changes

Current issue:

- `buildFullContext` fetches broad data for most modes.
- Pipeline total uses `recentApps.length`, not actual total count.

Recommended:

Create these functions:

```ts
buildCoreContext(userId)
buildApplicationContext(userId, applicationId)
buildJDScanContext(userId)
buildTrackerContext(userId)
buildWeeklyContext(userId)
buildPrepContext(userId, applicationId?)
```

Benefits:

- smaller prompts
- better page relevance
- easier debugging
- faster response

## Component Plan

### New Components

```txt
src/components/ai/AIActionPanel.tsx
src/components/ai/ActionPreviewCard.tsx
src/components/ai/JDIntakePanel.tsx
src/components/ai/GeneratedArtifactCard.tsx
src/components/ai/AIActionHistory.tsx
src/components/applications/ApplicationWorkbench.tsx
src/components/applications/ApplicationAIPanel.tsx
src/components/today/TodayActionList.tsx
src/components/today/FollowUpQueue.tsx
src/components/today/PipelinePulse.tsx
```

### Components To Refactor

```txt
src/components/ai/AIChat.tsx
src/components/CommandPalette.tsx
src/components/dashboard/ApplicationDetailModal.tsx
src/components/applications/ApplicationAnalysisSection.tsx
src/components/dashboard/ApplicationFormModal.tsx
src/components/ApplicationForm.tsx
```

### Components To De-emphasize

```txt
src/app/(app)/ai-assistant/page.tsx
```

Keep it for:

- history
- open-ended support
- debugging
- long conversations

But do not make it the primary CTA.

## API Plan

### New Routes

```txt
POST /api/ai/actions/preview
POST /api/ai/actions/apply
POST /api/ai/jobs/extract
POST /api/ai/jobs/apply-proposal
POST /api/ai/artifacts/generate
```

### Existing Routes To Update

```txt
POST /api/ai/chat
POST /api/ai/scan-jd
GET /api/applications
POST /api/applications
PATCH /api/applications/[id]
```

## Action Safety Rules

1. AI can propose any supported action.
2. AI cannot apply destructive actions without explicit confirmation.
3. Server validates all action payloads with Zod.
4. Server re-fetches existing data before update.
5. Server checks user ownership for every entity.
6. UI shows before/after for updates.
7. UI shows warnings for low confidence.
8. Applied actions produce toast + action history entry.
9. Failed actions show exact reason and recovery step.
10. Generated text artifacts are never auto-sent externally.

## Phased Implementation

## Phase 1: Asynchronous JD Intake & Parsing

Goal:

Make Dashboard/Today JD intake create applications instantly and enrich them asynchronously without blocking user UI.

Tasks:

- Create `JDIntakePanel`.
- Create `/api/ai/jobs/extract`.
- Add `textContent` parsing and storage to `Resume` model upload flow.
- Replace Dashboard `Quick Analyze` redirect with inline JD intake.
- Save basic `Application` record optimistically and enrich with `ApplicationAnalysis` in the background.

Success criteria:

- User can paste JD from Dashboard and save immediately.
- AI extracts job details asynchronously in the background.
- Analysis matches against the actual parsed text of the default resume.
- Analysis appears on application detail.

## Phase 2: Application Workbench & Tiered Emailer

Goal:

Make every application detail view feel like a complete work surface with secure, zero-friction outreach tools.

Tasks:

- Create `ApplicationWorkbench`.
- Add `ApplicationAIPanel`.
- Move `ApplicationAnalysisSection` into workbench.
- Refactor modal and full page to share the workbench.
- Add tiered email outreach support: subject/body generator, mailto links, clipboard copy buttons, and manual marking.

Success criteria:

- Opening an application from board/list/table exposes AI actions.
- User can trigger a draft outreach and open their native mail client with one click.
- User does not need to navigate to AI Assistant for application-specific work.

## Phase 3: Command Autocomplete & Suggestion Cards

Goal:

Let users update tracker states safely without fragile NLP processing.

Tasks:

- Add autocomplete command support to `CommandPalette` (e.g. `/status`).
- Support structured AI suggestion cards inside the chat UI (rendering clickable action buttons).
- Support metadata payload tracking on existing models.

Success criteria:

- User can trigger updates via slash commands or suggestions.
- DB updates are applied deterministically through REST APIs.
- Action changes are correctly tracked in the status history timeline.

## Phase 4: Command Palette Upgrade

Goal:

Turn command palette into universal workflow launcher.

Tasks:

- Add AI action suggestions.
- Add natural language action preview.
- Add quick commands:
  - Add job from JD
  - Update application status
  - Draft recruiter reply
  - Prepare interview
  - Review week
- Preserve existing page/application search.

Success criteria:

- `Ctrl+K` can navigate, search, and start AI actions.
- Power users can operate the tracker without opening separate pages.

## Phase 5: Today Page

Goal:

Replace passive dashboard with active daily workflow.

Tasks:

- Rename or reshape Dashboard into Today.
- Add top recommended actions.
- Add follow-up queue.
- Add stale application list.
- Add JD intake.
- Add weekly goal update.
- Keep charts lower on the page.

Success criteria:

- First screen tells user what to do next.
- User can complete at least one meaningful workflow from Today.
- Charts support decisions instead of dominating the page.

## Phase 6: Polish, Accessibility, And Trust

Tasks:

- Loading states for all AI actions.
- Clear AI-not-configured states.
- Keyboard navigation for command palette actions.
- Focus management for preview cards/dialogs.
- Empty states that suggest a next action.
- Reduced motion support.
- Mobile layout for workbench and action panels.
- Toasts with clear result messages.

Success criteria:

- All primary flows work on mobile and desktop.
- AI actions never feel hidden or surprising.
- User always knows what changed.

## Testing Plan

### Unit Tests

- `classifyMode`
- action Zod schemas
- context builders
- proposal validation

### Integration Tests

- JD extract route with mocked AI provider
- apply job proposal creates application + analysis
- action preview for tracker update
- action apply updates application status
- ownership protection

### Component Tests

- `ActionPreviewCard`
- `JDIntakePanel`
- `ApplicationWorkbench`
- command palette AI action state

### Manual QA Scenarios

1. Paste JD from Dashboard and save job.
2. Open saved job from board and view analysis.
3. Draft cover letter from application workbench.
4. Type "I applied to X" in command palette.
5. Reject an AI action proposal.
6. Try low-confidence extraction and edit fields before save.
7. Use app without AI key configured.
8. Mobile: add job from JD.
9. Mobile: open application workbench and run AI action.

## Design Direction

This is a job-search operations app, not a marketing site. The UI should be:

- calm
- dense but readable
- action-oriented
- confidence-building
- focused on next steps

Avoid:

- oversized chatbot empty states as primary UI
- decorative AI sparkle overload
- vague "Ask anything" as main CTA
- chat bubbles for structured work
- hiding important actions behind separate pages

Prefer:

- compact side panels
- inline buttons
- preview cards
- status timelines
- clear before/after diffs
- task queues
- generated artifact cards

## Implementation Priority

Highest ROI order:

1. Dashboard JD intake with save proposal.
2. Application workbench shared between modal and page.
3. AI action preview/apply system.
4. Command palette AI actions.
5. Today page redesign.
6. `/ai-assistant` de-emphasis and chat history cleanup.

## Final Target

The final experience should feel like this:

```txt
User opens app.
Today page says:
  - Follow up with 2 companies.
  - Apply to 1 high-match saved job.
  - Prepare for 1 upcoming interview.

User pastes a JD.
AI extracts, scores, and previews the new job.
User saves it.
Application workbench opens.
AI suggests the next best action.
User drafts cover letter or creates prep plan.
Tracker updates as the work happens.
```

That is the product shift:

> From "chat with an assistant" to "run my job search with an assistant embedded in the workflow."
