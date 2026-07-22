# AI Workflow Assistant — Implementation Plan

> Based on `Application-Workflow-Assistant.md` — an 8-mode AI agent for job seekers.
> Targeted at the existing CareerTrack Next.js app (Prisma/Supabase + Clerk).

---

## 1. Dependencies

```json
{
  "ai": "^latest",
  "@ai-sdk/openai": "^latest",
  "@ai-sdk/anthropic": "^latest",
  "@ai-sdk/google": "^latest"
}
```

```bash
npm install ai @ai-sdk/openai @ai-sdk/anthropic @ai-sdk/google
```

---

## 2. Prisma Schema Changes

### Model: `UserProfile` (1:1 with User)

```prisma
model UserProfile {
  id                    String   @id @default(uuid())
  userId                String   @unique
  phone                 String?
  location              String?
  targetRoles           String[]
  workPreference        String?    // remote / onsite / hybrid
  salaryExpectation     String?
  experienceLevel       String?    // fresher / junior / career-switcher
  currentStatus         String?    // actively-looking / employed / studying
  linkedInUrl           String?
  githubUrl             String?
  portfolioUrl          String?
  bestProjects          Json?      // [{ name, stack, liveLink, repoLink, description }]
  strengths             String?
  weaknesses            String?
  weeklyHours           Int?
  bestDays              String?
  noticePeriod          String?
  communicationLevel    String?
  englishLevel          String?
  preferredIndustries   String?
  preferredCompanies    String?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### Model: `WeeklyGoal` (per user per week)

```prisma
model WeeklyGoal {
  id            String   @id @default(uuid())
  userId        String
  weekStart     DateTime   // Monday of the week

  goal1         String     // placement-oriented goal (REQUIRED)
  goal1Target   Int?
  goal1Progress Int?
  goal1Status   String     @default("NotStarted") // NotStarted | InProgress | Achieved | Missed

  goal2         String?    // supports goal1
  goal2Target   Int?
  goal2Progress Int?
  goal2Status   String     @default("NotStarted")

  goal3         String?    // readiness / skill-building
  goal3Target   Int?
  goal3Progress Int?
  goal3Status   String     @default("NotStarted")

  blockers      String?
  notes         String?
  weekReview    Json?      // AI-generated weekly review
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, weekStart])
  @@index([userId])
}
```

### Model: `ApplicationAnalysis` (1:1 with Application)

```prisma
model ApplicationAnalysis {
  id             String   @id @default(uuid())
  applicationId  String   @unique
  matchScore     Int?       // 0–100
  confidence     String?    // High / Medium / Low
  verdict        String?    // Strong Apply | Apply After Minor Tweaks | Stretch Apply | Low ROI / Skip | Likely Scam / Avoid
  jdKeywords     Json?      // extracted keywords from JD
  gapAnalysis    Json?      // { missingKeywords, missingProof, missingTools, stretchAreas, fixableGaps }
  resumeAdvice   Json?      // { emphasize, addIfTruthful, foregroundProjects, needsCustomVersion, linkedInTweak }
  applyStrategy  Json?      // { bestPath, outreachNeeded, contactTarget, timing, angle }
  redFlags       String?
  finalRecommendation String?
  rawJd          String?    // original JD text pasted by user
  rawAnalysis    String?    // full AI response for reference
  analyzedAt     DateTime @default(now())

  application Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)
}
```

### Models: `ChatSession` & `ChatMessage`

```prisma
model ChatSession {
  id        String   @id @default(uuid())
  userId    String
  mode      String?    // profile | jd-scan | application | tracker | response | interview | weekly | recovery
  title     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user     User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages ChatMessage[]

  @@index([userId])
}

model ChatMessage {
  id        String   @id @default(uuid())
  sessionId String
  role      String     // user | assistant | system
  content   String
  metadata  Json?      // mode info, tool calls, structured data
  createdAt DateTime @default(now())

  session ChatSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([sessionId])
  @@index([sessionId, createdAt])
}
```

### Migration

```bash
npx prisma migrate dev --name add_ai_features
```

---

## 3. API Key Management

**Strategy:** Encrypted HTTP-only cookie.

**How it works:**

1. User enters API key + selects provider + optionally sets base URL and model in Settings.
2. `PUT /api/settings/ai-key` encrypts the config with AES-256-GCM using a server-side secret (`AI_KEY_ENCRYPTION_SECRET`) and sets an `httpOnly`, `Secure`, `SameSite=Strict` cookie.
3. On every AI request, the server reads the cookie, decrypts it, instantiates the provider.
4. `DELETE /api/settings/ai-key` clears the cookie.

**Cookie payload (encrypted):**
```json
{
  "providerType": "openai" | "anthropic" | "google" | "custom-openai",
  "apiKey": "sk-...",
  "baseUrl": "https://api.openrouter.ai/v1",        // only for custom-openai
  "model": "deepseek-chat"                           // only for custom-openai
}
```

This way users can use any OpenAI-compatible third-party provider: OpenRouter, Groq, Together, DeepSeek, Mistral, Perplexity, xAI, etc.

| Method | Route | Purpose |
|---|---|---|---|
| `PUT` | `/api/settings/ai-key` | Encrypt + store config (providerType, apiKey, baseUrl, model) in httpOnly cookie |
| `DELETE` | `/api/settings/ai-key` | Remove the cookie |
| `GET` | `/api/settings/ai-key` | Returns `{ hasKey: boolean, providerType: string, baseUrl?: string, model?: string }` (never exposes key) |

**.env additions:**

```env
AI_KEY_ENCRYPTION_SECRET="your-32-char-secret-here"
```

---

## 4. AI Service Layer

```
src/lib/ai/
├── client.ts
├── context-builder.ts
├── mode-router.ts
├── structured-output.ts
└── prompts/
    ├── system-base.ts
    ├── profile.ts
    ├── jd-scan.ts
    ├── application.ts
    ├── tracker.ts
    ├── response.ts
    ├── interview.ts
    ├── weekly.ts
    └── recovery.ts
```

### `client.ts` — AI Provider Factory

- Reads config from the encrypted cookie (via request context).
- Decrypts using `AI_KEY_ENCRYPTION_SECRET`.
- Instantiates the correct provider based on user's `providerType`.
- Supports standard providers + any OpenAI-compatible third-party provider via `baseURL`.

```typescript
interface AIProviderConfig {
  providerType: "openai" | "anthropic" | "google" | "custom-openai"
  apiKey: string
  baseUrl?: string   // required for custom-openai
  model?: string     // optional model override
}

function getProvider(config: AIProviderConfig) {
  switch (config.providerType) {
    case "openai":
      return { instance: createOpenAI({ apiKey: config.apiKey }), defaultModel: "gpt-4o-mini" }
    case "anthropic":
      return { instance: createAnthropic({ apiKey: config.apiKey }), defaultModel: "claude-3-haiku-20240307" }
    case "google":
      return { instance: createGoogle({ apiKey: config.apiKey }), defaultModel: "gemini-1.5-flash" }
    case "custom-openai":
      return {
        instance: createOpenAI({ baseURL: config.baseUrl, apiKey: config.apiKey }),
        defaultModel: config.model || "gpt-4o-mini",
      }
  }
}
```

This works with any OpenAI-compatible provider:

| Provider | Base URL |
|---|---|
| OpenRouter | `https://openrouter.ai/api/v1` |
| Groq | `https://api.groq.com/openai/v1` |
| Together | `https://api.together.xyz/v1` |
| DeepSeek | `https://api.deepseek.com` |
| Mistral | `https://api.mistral.ai/v1` |
| Perplexity | `https://api.perplexity.ai` |
| xAI (Grok) | `https://api.x.ai/v1` |
| Fireworks | `https://api.fireworks.ai/inference/v1` |
| Any OpenAI-compatible endpoint | user-defined |

### `context-builder.ts` — User Context Assembly

Builds a rich context string to inject into the system prompt:

```typescript
export async function buildFullContext(userId: string, mode: AIMode): Promise<string>
```

Context includes:
- `UserProfile` fields (skills, location, experience, links)
- Top 3 projects (title, stack, description, live/repo links)
- Default resume (title + file info)
- Recent applications (last 10 with status)
- Application tracker stats (total by stage)
- Current weekly goals if in weekly mode
- Pending follow-ups if in tracker mode

### `mode-router.ts` — Intent Classification

Classifies user messages into 1 of 8 modes:

| Trigger | Mode |
|---|---|
| Paste contains "requirements", "responsibilities", "qualifications" + job-like text | `jd-scan` |
| User says "I want to apply", "generate cover letter", "write email" | `application` |
| User says "I applied", "got rejected", "received task", "got interview" | `tracker` |
| User pastes recruiter email/DM/message | `response` |
| User says "I have an interview", "coding task", "take home" | `interview` |
| User says "weekly goals", "set goals", "this week" | `weekly` |
| User expresses rejection, burnout, frustration | `recovery` |
| User uploads resume, updates profile | `profile` |

Uses a lightweight approach: keyword heuristics for common triggers, falling back to a quick LLM classification call for ambiguous messages.

### `structured-output.ts` — Zod Schemas

Defines structured output schemas for non-chat AI calls:

```typescript
export const JDAnalysisSchema = z.object({
  roleSnapshot: z.object({ ... }),
  matchScore: z.number().min(0).max(100),
  confidence: z.enum(["High", "Medium", "Low"]),
  verdict: z.enum(["Strong Apply", "Apply After Minor Tweaks", "Stretch Apply", "Low ROI / Skip", "Likely Scam / Avoid"]),
  whyThisScore: z.array(z.string()),
  missingGaps: z.object({ ... }),
  resumeAdvice: z.object({ ... }),
  applyStrategy: z.object({ ... }),
  redFlags: z.string().optional(),
  finalRecommendation: z.string(),
})

export const CoverLetterSchema = z.object({ ... })
export const TrackerUpdateSchema = z.object({ ... })
export const MessageClassificationSchema = z.object({ ... })
```

### `prompts/` — Mode Instructions

Each file exports a function that returns the mode-specific system prompt. The prompts are derived directly from `Application-Workflow-Assistant.md`:

- `system-base.ts` — `<ROLE>`, `<MISSION>`, `<CORE_OPERATING_PRINCIPLES>`, `<OUTPUT_STYLE_RULES>`, `<ANTI_HALLUCINATION_RULES>`, `<EMOTIONAL_INTELLIGENCE_RULES>`, `<DECISION_RULES>`
- `profile.ts` — Profile mode instructions + intake checklist
- `jd-scan.ts` — JD scan output template + scoring logic + verdict options
- `application.ts` — Application execution rules + T-format + email rules
- `tracker.ts` — Tracker update logic + table columns + summary stats
- `response.ts` — Message classification + response drafting
- `interview.ts` — Interview prep plan + technical areas
- `weekly.ts` — Weekly goal structure + review template
- `recovery.ts` — Recovery analysis + improvement planning

---

## 5. API Routes

### AI Chat (Streaming)

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/ai/chat` | Main streaming chat endpoint (SSE) |

**Request:**
```json
{
  "message": "I found a React Developer role at Acme Corp...",
  "sessionId": "uuid-or-null",
  "mode": "jd-scan",       // optional mode override
  "model": "deepseek-chat"  // optional model override (otherwise uses user's default from config)
}
```

**Response:** Server-Sent Events stream.

**Flow:**
1. Authenticate via Clerk → get `userId`
2. Read + decrypt API config from cookie
3. If no `sessionId`, create new `ChatSession` with classified mode
4. Build system prompt: `system-base` + mode instructions + user context
5. Save user's `ChatMessage`
6. Call `streamText()` with Vercel AI SDK using user's provider + model
7. Stream tokens back as SSE
8. On completion, save assistant `ChatMessage`
9. If structured data detected (e.g., JD analysis), parse and optionally persist to `ApplicationAnalysis`

### Non-Streaming AI Calls

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/ai/scan-jd` | Direct JD analysis without chat flow |

**Request:**
```json
{
  "jdText": "Full job description text...",
  "applicationId": "optional-uuid"
}
```

**Response:** Structured `JDAnalysis` object, optionally linked to application.

### User Profile

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/user/profile` | Get current user's profile |
| `PUT` | `/api/user/profile` | Upsert profile (partial update) |
| `POST` | `/api/user/profile/onboard` | First-time setup (batch save all fields) |

### Weekly Goals

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/weekly-goals` | List goals (current week + history) |
| `POST` | `/api/weekly-goals` | Create goals for current week |
| `PATCH` | `/api/weekly-goals/[id]` | Update goal progress/status |
| `DELETE` | `/api/weekly-goals/[id]` | Delete a weekly goal entry |

### Application Analysis

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/applications/[id]/analysis` | Get AI analysis for an application |
| `PUT` | `/api/applications/[id]/analysis` | Save/update analysis |
| `DELETE` | `/api/applications/[id]/analysis` | Remove analysis |

### Sessions

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/ai/sessions` | List user's chat sessions |
| `POST` | `/api/ai/sessions` | Create new session |
| `PATCH` | `/api/ai/sessions/[id]` | Update session (title, mode) |
| `DELETE` | `/api/ai/sessions/[id]` | Delete session + messages |

---

## 6. UI — Pages & Routes

### New Pages

| Route | Component | Description |
|---|---|---|
| `/ai-assistant` | `AIChatPage` | Full chat interface with session sidebar + mode badges + result panels |
| `/profile-setup` | `ProfileSetupWizard` | Multi-step onboarding wizard (maps to doc's intake protocol) |
| `/weekly-goals` | `WeeklyGoalsPage` | Weekly goal management with history + AI review |

### Modifications to Existing Pages

| File | Changes |
|---|---|
| `src/components/Sidebar.tsx` | Add "AI Assistant" nav item with `Bot` icon before Settings |
| `src/app/(app)/dashboard/page.tsx` | Add AI widgets: weekly goals card, follow-up reminders, quick-analyze input |
| `src/app/(app)/applications/[id]/page.tsx` | Add AI Analysis tab: match score ring, verdict, gap analysis, action buttons |
| `src/app/(app)/interview-prep/page.tsx` | Add "Generate from JD" and "Suggest Answer" AI buttons |
| `src/app/(app)/settings/page.tsx` | Add AI Configuration section: provider type selector, API key input, base URL field (for Custom), model selector, test connection |

---

## 7. UI — Components

### AI Chat Components (`src/components/ai/`)

| Component | Description |
|---|---|
| `AIChat.tsx` | Main chat container — message list, input bar, session management, streaming state |
| `ChatMessage.tsx` | Single message bubble — supports streaming text, markdown rendering, code blocks |
| `ModeBadge.tsx` | Colored badge showing active mode (JD Scan = blue, Tracker = green, etc.) |
| `ModeSelector.tsx` | Dropdown to manually switch/override mode |
| `QuickActions.tsx` | Action chips: "Paste a JD", "Generate Cover Letter", "Analyze Message", "Set Weekly Goals" |
| `AnalysisResult.tsx` | Structured display of JD scan: score ring, verdict badge, gap list, strategy cards |
| `CoverLetterResult.tsx` | Display generated cover letter / email with copy + download buttons |
| `TrackerUpdateResult.tsx` | Shows tracker changes with confirm/reject buttons to apply |
| `InterviewPrepResult.tsx` | Display AI-generated questions with expandable answers |
| `ResponseResult.tsx` | Shows recruiter message classification + draft reply with copy button |
| `AISettings.tsx` | Provider type dropdown (OpenAI / Anthropic / Google / Custom OpenAI-compatible), API key input, base URL field (shown only for Custom), model name input, test connection button |

### Weekly Goals Components (`src/components/weekly-goals/`)

| Component | Description |
|---|---|
| `WeeklyGoalsWidget.tsx` | Compact card for dashboard — shows 3 goals with progress bars |
| `WeeklyGoalForm.tsx` | Modal/form to set up 3 goals for the week |
| `WeeklyReviewCard.tsx` | AI-generated weekly review display |

---

## 8. State Management

### Zustand Store Additions (`src/lib/store.ts`)

```typescript
interface AIState {
  // Chat state
  activeSessionId: string | null
  sessions: ChatSession[]
  messages: ChatMessage[]
  isStreaming: boolean
  currentMode: AIMode | null

  // Actions
  setActiveSession: (id: string) => void
  addMessage: (msg: ChatMessage) => void
  appendToLastMessage: (token: string) => void
  setStreaming: (v: boolean) => void
  setMode: (mode: AIMode) => void
}
```

### TanStack Query Hooks (`src/lib/api.ts` additions)

```typescript
export function useAISessions()
export function useAIChat(sessionId: string | null)
export function useUserProfile()
export function useWeeklyGoals(weekStart?: string)
export function useApplicationAnalysis(applicationId: string)
```

---

## 9. The 8 Modes — Detailed Behavior

### Mode 1: Profile Mode

**Trigger:**
- User starts the AI assistant for the first time
- User says "update my profile" / "fill my profile"
- User uploads resume content

**AI Behavior:**
- Guides user through intake questions (from doc's `FIRST_TIME_ONBOARDING_PROTOCOL`)
- Builds/updates `UserProfile` record
- Summarizes strengths and gaps
- Suggests priority fixes

**Output:** Profile summary + missing items checklist.

### Mode 2: JD Scan Mode

**Trigger:**
- User pastes a job description
- User pastes a job posting URL + text

**AI Behavior:**
- Analyzes JD against user's profile, skills, projects, and resume
- Calculates match score across 8 dimensions
- Produces structured output per doc's template

**Output:**
```
[Role Snapshot]     Company, Role, Experience, Stack, Setup
[Match Score]       0–100 + Confidence (High/Medium/Low)
[Verdict]           Strong Apply / Apply After Minor Tweaks / Stretch / Skip / Avoid
[Why This Score]    3–6 precise reasons
[Gap Analysis]      Missing keywords, tools, proof; stretch areas
[Resume Advice]     Keywords to add, projects to foreground, custom version needed
[Apply Strategy]    Best path, outreach needed, contact target, timing
[Red Flags]         Warnings if any
[Final Action]      Apply now / Apply after tweaks / Stretch / Skip
```

**Integration:** User can click "Save to Application" → pre-fills application form + links analysis.

### Mode 3: Application Execution Mode

**Trigger:**
- User says "I want to apply" / "generate cover letter" / "write an outreach email"

**AI Behavior:**
- Determines best format (T-format cover letter, short note, professional email, cold DM, founder outreach)
- Generates the application package

**Output:**
```
1. Recommended format + why
2. Final email / application note
3. Cover letter or T-format version
4. Short alternate version
5. Subject line options
6. Resume tweak checklist
```

### Mode 4: Tracker Mode

**Trigger:**
- User says "I applied to X" / "got rejected from Y" / "received a task from Z"

**AI Behavior:**
- Updates or adds a row to the application tracker
- Suggests next best action
- Recommends follow-up timing

**Output:**
```
[Tracker Update]    Added/Updated row for Company
[Current Pipeline]  Summary stats (applied, response, interview, offer)
[Next Action]       Recommended follow-up + timing
```

**Integration:** User confirms → directly updates `Application` in DB.

### Mode 5: Response Interpretation Mode

**Trigger:**
- User pastes a recruiter email, LinkedIn DM, WhatsApp message, or interview invite

**AI Behavior:**
- Classifies message type (generic rejection, soft rejection, screening request, interview invitation, etc.)
- Explains tone and likely intent
- Drafts the best professional response

**Output:**
```
[Classification]    Message type + tone analysis
[Draft Response]    Ready-to-send reply
[Next Step]         Recommended action + tracker update
```

### Mode 6: Task & Interview Support Mode

**Trigger:**
- User says "I have a coding task" / "I have an interview" / "help me prepare"

**AI Behavior:**
- Analyzes what the company is actually testing
- Generates likely questions based on JD + role
- Creates prep plan
- Grills the student if requested

**Output:**
```
[Assessment]        What the company is testing + success criteria
[Prep Plan]         Focus areas + timeline
[Likely Questions]  Technical + behavioral + project deep-dive
[Resources]         Specific topics to review
```

### Mode 7: Weekly Goal Mode

**Trigger:**
- Start of the week
- User says "set goals" / "weekly goals" / "my week"

**AI Behavior:**
- Guides user to set exactly 3 goals (following doc's rules)
- Tracks progress through the week
- Generates weekly review at end of week

**Output:**
```
[Weekly Goals]      3 goals with targets
  Goal 1: Placement-oriented
  Goal 2: Supports goal 1 (applications, outreach, resume)
  Goal 3: Readiness (practice, study, mock interviews)
[Progress]          Status of each goal
[Blockers]          Identified obstacles
```

**Integration:** Goals persist to `WeeklyGoal` model. Dashboard shows goal widget.

### Provider Configuration

**Settings UI (`AISettings.tsx`):**

```
─────────────────────────────────────
  AI Provider Configuration
─────────────────────────────────────
  Provider Type:  [OpenAI         ▼]
                  OpenAI
                  Anthropic
                  Google
                  Custom (OpenAI-compatible)

  API Key:        [••••••••••••••••••••]

  Base URL:       [https://api.openrouter.ai/v1]   ← visible only for Custom
  Model:          [deepseek-chat                   ]  ← visible only for Custom
─────────────────────────────────────
  [Test Connection]  [Save]
─────────────────────────────────────
```

**Validation:**
- If `Custom` selected, `baseUrl` + `model` are required.
- "Test Connection" button sends a minimal prompt to verify the key + endpoint work.
- Error messages shown inline for invalid keys, unreachable endpoints, or unsupported models.

### Mode 8: Recovery & Improvement Mode

**Trigger:**
- User says "I got rejected" / "I feel stuck" / "no responses" / "burnout"

**AI Behavior:**
- Helps user recover emotionally (without fake positivity)
- Distinguishes between fit issue, resume issue, communication issue, timing/luck
- Produces actionable improvement plan

**Output:**
```
[Analysis]          Likely cause of rejection/ghosting
[Improvement Plan]  2–3 concrete changes
[Updated Strategy]  What to do differently going forward
[Motivation]        Honest encouragement + next application target
```

---

## 10. Data Flow Examples

### JD Scan → Save to Application

```
User pastes JD in AI Chat
        │
        ▼
mode-router.ts → "jd-scan"
        │
        ▼
System prompt = system-base + jd-scan.md + user context (profile, skills, projects)
        │
        ▼
streamText() → streaming response with structured data embedded
        │
        ▼
Chat UI renders AnalysisResult component from streamed JSON
        │
        ▼
User clicks "Save to Application"
        │
        ▼
POST /api/applications with pre-filled data
  + PUT /api/applications/[id]/analysis with structured analysis
```

### Cover Letter Generation

```
User says "I want to apply to Senior Dev at Google" (linked to existing application)
        │
        ▼
mode-router.ts → "application"
        │
        ▼
System prompt = system-base + application.md
  + application context (JD text from analysis, resume, projects)
        │
        ▼
streamText() → Cover letter + email + subject lines
        │
        ▼
CoverLetterResult component with copy/download buttons
```

---

## 11. Agent Read/Write Capability

### Read (Automatic — Server-Side DB Access)

Agent jokhon AI call kore, `context-builder.ts` `buildFullContext()` function **direct Prisma query** kore user er sob data fetch kore and system prompt e inject kore. Kono manual input lagbe na.

| Entity | What Agent Reads | Usage in Prompt |
|---|---|---|
| **Applications** | Recent 20: companyName, jobTitle, status, source, date, tags, notes | JD scan comparison, tracker stats, follow-up detection |
| **Status Changes** | Timeline of each application | Response interpretation, recovery analysis |
| **User Profile** | Skills, location, experience, target roles, work preference | Match scoring, resume advice, strategy |
| **Projects** | Name, stack, description, links | Cover letter evidence, interview prep |
| **Resumes** | Title, fileName, isDefault | Resume targeting advice |
| **Companies** | Name, industry, website | JD scan context |
| **Prep Questions** | All questions + answers | Avoid duplicate generation, mock interview |
| **Weekly Goals** | Current week goals + progress | Weekly review, goal tracking |
| **Chat Sessions** | Recent 10 messages | Context continuity across messages |

Agent er **kono limitation nei** — full DB read access. Ei data automatically build hoye jay prottek AI request er age.

### Write (Two Modes — User Configurable)

Agent structured JSON return kore, and server sei JSON ke DB write e convert kore.

**Settings toggle:** `Settings → AI → Auto-apply actions: ON / OFF`

#### Option A: Auto Mode (Default — Recommended)

```
User: "I applied to Google for Senior Frontend role"
  │
  ▼
Agent → { 
  action: "update", 
  entity: "application", 
  filter: { companyName: "Google" },
  data: { status: "Applied", notes: "Applied via LinkedIn" }
}
  │
  ▼
Server directly writes to DB via Prisma
  │
  ▼
UI: Toast — "✅ Updated Google → Applied"
  Agent reply: "Done! Google moved to Applied. Follow up in 7 days."
```

#### Option B: Confirm Mode

Same flow, but UI te ekta confirmation card show kore:

```
┌─────────────────────────────────────┐
│  🔄 AI wants to update:             │
│  Google → Senior Frontend Developer │
│  Status: Saved → Applied            │
│                                      │
│  [✓ Confirm]  [✗ Reject]           │
└─────────────────────────────────────┘
```

### Write Actions — Complete Matrix

| Entity | Create | Update Status | Update Fields | Delete |
|---|---|---|---|---|
| **Application** | ✅ Auto (JD scan → save) | ✅ Auto / Confirm | ✅ Auto / Confirm | ❌ Always Confirm |
| **ApplicationAnalysis** | ✅ Auto (after JD scan) | ✅ Auto | ❌ N/A | ❌ Always Confirm |
| **Company** | ✅ Auto (from JD) | ✅ Auto | ✅ Auto | ❌ Always Confirm |
| **Tag** | ✅ Auto | ❌ N/A | ❌ N/A | ❌ Always Confirm |
| **PrepQuestion** | ✅ Auto (interview prep) | ❌ N/A | ✅ Auto / Confirm | ❌ Always Confirm |
| **PrepNote** | ✅ Auto | ❌ N/A | ✅ Auto / Confirm | ❌ Always Confirm |
| **WeeklyGoal** | ✅ Auto (weekly mode) | ✅ Auto (progress) | ✅ Auto | ❌ Always Confirm |
| **UserProfile** | ✅ Auto (onboarding) | ❌ N/A | ✅ Auto / Confirm | ❌ N/A |

### Data Flow: Message → DB Write

```
User Message
    │
    ▼
/api/ai/chat route handler
    │
    ├── 1. Clerk auth → userId
    ├── 2. Decrypt AI config from cookie
    ├── 3. context-builder → fetch all user data from DB
    ├── 4. Build system prompt (base + mode + context)
    ├── 5. streamText() → AI response (may include structured action JSON)
    │
    ▼
Response Handler (after stream completes)
    │
    ├── Check for structured action block in response
    │   ├── If "action": "none" → display only
    │   ├── If "action": "create" | "update" | "delete"
    │   │       ├── Check user's auto-apply setting
    │   │       │   ├── ON  → execute Prisma write immediately
    │   │       │   └── OFF → send structured data to client for confirmation
    │   │       └── Log action in ChatMessage.metadata
    │   └── If no action block → display only
    │
    ▼
UI Update
    ├── TanStack Query invalidation → UI refresh
    └── Toast notification with action result
```

### Safety Rules

| Rule | Implementation |
|---|---|
| **No auto-delete** | Delete actions always require user confirmation dialog |
| **Undo support** | TanStack Query `onMutate` captures previous state for rollback |
| **Rate limit writes** | Max 10 AI-triggered writes per minute per user |
| **Audit trail** | Every write action logged in `ChatMessage.metadata` with before/after snapshot |
| **Validation** | Server validates all AI-returned data against Zod schemas before writing |
| **User override** | Any AI-generated write can be manually corrected from the UI |

### Impact Summary

| Metric | Before | After |
|---|---|---|
| Application data entry | Manual form fill (5 min) | JD paste → auto-create (30 sec) |
| Status updates | Manual dropdown change | "I applied" → auto-update |
| Cover letter generation | Skip or 30 min writing | One click → ready copy |
| Interview prep | Google search (1 hr) | One click → 20 questions |
| Follow-up tracking | Forgotten | Auto-reminder + draft |
| Weekly reporting | Never done | Auto-generated |

---

## 12. Context Management Strategy

### Problem Statement

AI agent er **personalization er jonno context essential**, but uncontrolled context size gele 3 ta problem hoy:
1. **Token limit hit** — slow response + truncated output
2. **Cost explosion** — prottek extra 1K token = ~$0.00015 (gpt-4o-mini)
3. **Noise degrades quality** — irrelevant data confuse the model

### Solution: Tiered Context System

Data k 3 tier e divide kora hoyeche — shudhu relevant tier ei request e pathano hoy.

```
                    ┌─────────────────────────┐
                    │    Core Context          │  ~300 tok
                    │  (always present)        │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │    Mode-Specific Context │  ~500-1500 tok
                    │  (per-mode, selective)   │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │    On-Demand Context     │  ~0-3000+ tok
                    │  (only when asked)       │
                    └─────────────────────────┘
```

#### Tier 1: Core Context (Every Request)

Fixed, small, always included — kharoch negligible.

```typescript
interface CoreContext {
  // Identity
  userName: string
  targetRoles: string[]       // e.g. ["Frontend Developer", "React Developer"]
  experienceLevel: string     // e.g. "junior", "fresher"

  // Skills (top 5)
  topSkills: string[]         // e.g. ["React", "TypeScript", "Node.js"]

  // Pipeline summary
  totalApplications: number
  pendingFollowUps: number
  currentWeekGoals: string    // "2/3 goals in progress"

  // Session continuity
  lastUserMessage: string
  assistantLastResponse: string
}
```

**Always present, always small (~300 tokens).**

#### Tier 2: Mode-Specific Context (Per-Mode)

Shudhu oi mode er jonno relevant data pathano hoy.

| Mode | What Gets Fetched | Approx Tokens |
|---|---|---|
| **Profile** | UserProfile all fields + projects + resume | ~800 |
| **JD Scan** | Best 3 projects + default resume + recent 5 apps | ~1000 |
| **Application** | JD analysis (if exists) + resume + best 3 projects | ~1200 |
| **Tracker** | Recent 10 apps + pipeline stats + pending follow-ups | ~1500 |
| **Response** | Application details + recent status changes | ~500 |
| **Interview** | JD analysis + prep questions (same category) + project details | ~1200 |
| **Weekly** | Current goals + last week review + recent app stats | ~700 |
| **Recovery** | Last 5 status changes + recent rejections + current pipeline | ~600 |

#### Tier 3: On-Demand Context (Explicit Request Only)

Jokhon user specifically bole tokhon e data load hoy:

```
User: "analyze all my failed applications this year"
  → Server queries 6 months of data
  → Builds summary stats + trend
  → Sends compressed context (~1500 tok)

User: "show me which companies I applied to most"  
  → Server groups by companyName
  → Returns aggregated data (~200 tok)
  → Not per-row data
```

**On-demand triggers:**
- `"analyze all..."`, `"show me every..."`, `"compare..."` keywords detect korle
- Mode router on-demand flag set kore
- Extra DB query execute hoy
- Response e aggregation/compression kore pathano hoy

### Token Budget Management

Protttek request er age budget check kora hoy:

```
Request Start
    │
    ▼
Calculate estimate:
  ├── System prompt (mode + base)        ~1500 tok
  ├── Core context                        ~300 tok
  ├── Mode-specific context               ~1200 tok (avg)
  └── On-demand context (if triggered)    ~1000 tok (avg)
    │
    ▼
Total: ~4000 tok per request
Remaining: ~124K tok (GPT-4o-mini, 128K limit)
    │
    ▼
If total > 8000 tok → compress mode context:
  ├── Reduce recent apps from 10 → 5
  ├── Truncate project descriptions from 200 → 100 chars
  └── Remove last chat messages beyond 2
```

**Budget thresholds:**

| Threshold | Action |
|---|---|
| < 4K tok | Normal — full context |
| 4K–8K tok | Light compression — reduce list sizes |
| 8K–16K tok | Heavy compression — summaries instead of full text |
| > 16K tok | On-demand context only, no mode-specific data |

### Context Assembly Pipeline

```
User Message
    │
    ▼
mode-router.ts → determines mode
    │
    ▼
context-builder.ts
    │
    ├── 1. Read CoreContext from DB (fast query)
    │     └── UserProfile pipeline summary
    │
    ├── 2. Read ModeContext from DB (targeted queries)
    │     └── Depends on mode (table above)
    │
    ├── 3. Check for on-demand keywords in message
    │     ├── Found → execute extra query + compress
    │     └── Not found → skip
    │
    ├── 4. Apply token budget check
    │     └── Compress if needed (truncate lists, summarize)
    │
    └── 5. Build final context string
          └── Inject into system prompt
```

### Storage — Kothay Ki Thakbe?

| Data Type | Storage | Persistence | Why |
|---|---|---|---|
| **Chat history** | `ChatMessage` table (PostgreSQL) | Forever | User resume conversation, audit trail |
| **Tier 1 Core** | **Nowhere** — fresh fetch per request | Ephemeral | Always current, no stale cache risk |
| **Tier 2 Mode** | **Nowhere** — fresh fetch per request | Ephemeral | Users update apps constantly |
| **Tier 3 On-demand** | **Nowhere** — computed per request | Ephemeral | Heavy queries, no reason to cache |
| **Token usage** | `ChatMessage.metadata.tokenCount` | Forever | Cost tracking, debugging |
| **Context snapshots** | `ChatMessage.metadata.contextSnapshot` | Optional (debug mode) | Development debugging only |

**Kono context persistent cache e thake na** — DB theke fresh fetch kore shomoy moto data. Ei approach e 2 ta advantage:

1. **Stale data risk zero** — user app status update korle porer request e reflect hoye jay
2. **No cache invalidation logic needed** — implementation simple

### Performance Optimization

| Technique | What It Does | Impact |
|---|---|---|
| **Prisma select projection** | Shudhu needed fields fetch kore, `SELECT *` na | 3-5x faster queries |
| **Batch queries** | `Promise.all()` diye parallel fetch | 2x faster context build |
| **Connection pooling** | Prisma connection pool reuse | ~10ms per query |
| **Gzip context strings** | Large on-demand context compress kore → AI still decompresses | 4x smaller network payload |
| **Streaming overlap** | AI streaming start + context building parallel e kora jay (pipeline) | Zero wait time |

### Realistic Token Cost Estimate

Protttek request er jonno monthly cost:

```
Context per request:       ~4,000 tok (input)
Response per request:      ~1,000 tok (output)
Total per request:         ~5,000 tok

GPT-4o-mini cost:
  Input:  4K × $0.15/M  = $0.0006
  Output: 1K × $0.60/M  = $0.0006
  Total:                ~$0.0012 per request

Monthly usage:
  200 requests/day × 30 days = 6,000 requests
  Monthly cost: 6,000 × $0.0012 = ~$7.20/month
```

Heavy user hole (500 req/day): ~$18/month.
Context size bole gela **cost e minimal impact** — 4K vs 8K context e difference ~$0.001 per request.

### Key Takeaways

1. **Context system tiered** — never send all data, only what's needed
2. **No persistent context cache** — fresh fetch per request, zero stale data
3. **Context never written to DB** — `ChatMessage` only saves the final AI response, not the context
4. **Token budget enforced** — hard limit at 8K tok per request (comfortably within 128K limit)
5. **Cost controlled** — even at 8K context, cost per request remains ~$0.002

---

## 13. Testing Strategy

| Layer | Tool | What to Test |
|---|---|---|
| **Unit** | Vitest | `mode-router.ts` — classify intent correctly |
| **Unit** | Vitest | `context-builder.ts` — correct data assembly |
| **Unit** | Vitest | `structured-output.ts` — zod schema validation |
| **Unit** | Vitest | API key encryption/decryption |
| **Integration** | Vitest + fetch | AI routes with mocked provider |
| **Integration** | Vitest + fetch | Profile + weekly goals CRUD |
| **Component** | RTL + Vitest | Chat message rendering, streaming display |
| **Component** | RTL + Vitest | AnalysisResult, CoverLetterResult display |
| **Component** | RTL + Vitest | Profile setup wizard multi-step flow |

---

## 14. File Manifest

### New Files (~42)

```
prisma/migrations/20260722_add_ai_features/
  migration.sql

src/lib/ai/
  client.ts
  context-builder.ts
  mode-router.ts
  structured-output.ts
  prompts/
    system-base.ts
    profile.ts
    jd-scan.ts
    application.ts
    tracker.ts
    response.ts
    interview.ts
    weekly.ts
    recovery.ts

src/lib/hooks/
  use-ai-chat.ts

src/app/api/ai/
  chat/route.ts
  scan-jd/route.ts
  sessions/route.ts
  sessions/[id]/route.ts

src/app/api/user/
  profile/route.ts
  profile/onboard/route.ts

src/app/api/weekly-goals/
  route.ts
  [id]/route.ts

src/app/api/applications/
  [id]/analysis/route.ts

src/app/api/settings/
  ai-key/route.ts

src/app/(app)/
  ai-assistant/
    page.tsx
    loading.tsx
    error.tsx
  profile-setup/
    page.tsx
    loading.tsx

src/components/ai/
  AIChat.tsx
  ChatMessage.tsx
  ModeBadge.tsx
  ModeSelector.tsx
  QuickActions.tsx
  AnalysisResult.tsx
  CoverLetterResult.tsx
  TrackerUpdateResult.tsx
  InterviewPrepResult.tsx
  ResponseResult.tsx
  AISettings.tsx

src/components/weekly-goals/
  WeeklyGoalsWidget.tsx
  WeeklyGoalForm.tsx
  WeeklyReviewCard.tsx
```

### Modified Files (~10)

```
prisma/schema.prisma           — add 5 new models
src/lib/store.ts               — add AI state slice
src/lib/api.ts                 — add AI hooks
src/components/Sidebar.tsx     — add AI Assistant nav item
src/app/(app)/dashboard/page.tsx     — add AI widgets
src/app/(app)/applications/[id]/page.tsx — add AI Analysis tab
src/app/(app)/interview-prep/page.tsx  — add AI buttons
src/app/(app)/settings/page.tsx       — add AI Configuration section
src/app/(app)/layout.tsx              — add AI context provider
.env.example                         — add AI config vars
```

---

## 15. Implementation Order

| Phase | Steps | Effort |
|---|---|---|
| **Phase 1: Foundation** | 1. Install dependencies<br>2. Add Prisma models + migration<br>3. Create `src/lib/ai/` service layer<br>4. Create API key management route<br>5. Add `AI_KEY_ENCRYPTION_SECRET` to env | ~2 days |
| **Phase 2: Chat Engine** | 1. Build `/api/ai/chat` streaming route<br>2. Build mode-router + all 8 prompts<br>3. Build context-builder<br>4. Create Chat UI components<br>5. Create `/ai-assistant` page | ~3 days |
| **Phase 3: Profile + Goals** | 1. Create `/api/user/profile` routes<br>2. Build ProfileSetupWizard page<br>3. Create `/api/weekly-goals` routes<br>4. Build weekly goals components<br>5. Dashboard widget integration | ~2 days |
| **Phase 4: Embedded AI** | 1. Application detail AI Analysis tab<br>2. Application form JD paste → auto-analyze<br>3. Interview prep AI generate buttons<br>4. Settings AI configuration page<br>5. Sidebar nav update | ~2 days |
| **Phase 5: Polish** | 1. Loading/error/empty states<br>2. Streaming UX refinements<br>3. Mobile responsiveness<br>4. Tests<br>5. Edge case handling | ~1 day |

**Total estimated effort: ~10 working days**

---

## 16. Key Architectural Principles

1. **API key never touches the client** — encrypted HTTP-only cookie; JS cannot read it.
2. **Provider-agnostic** — supports OpenAI, Anthropic, Google, plus any OpenAI-compatible third-party provider (OpenRouter, Groq, DeepSeek, Mistral, etc.) via custom base URL. Vercel AI SDK abstracts the interface.
3. **Streaming-first** — all AI responses use `streamText()` for real-time token rendering.
4. **Context-rich prompts** — every AI call is augmented with the user's profile, resumes, projects, and recent apps.
5. **Structured output** — non-chat AI calls use Zod schemas for parseable, type-safe results.
6. **Mode classification** — the router determines context from the message content, reducing user friction.
7. **Persistent sessions** — chat history is saved; users can resume conversations.
8. **Non-blocking** — streaming UI shows progress; no loading spinners for AI calls.
