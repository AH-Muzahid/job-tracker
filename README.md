# CareerTrack — Job Application Tracker

A full-stack job search tracker with an integrated AI assistant, built for managing every stage of the application lifecycle — from first save to final offer.

---

## Table of Contents

- [Features](#features)
- [Live Links](#live-links)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Test Login](#test-login)
- [API Endpoints](#api-endpoints)
- [Project Structure](#project-structure)
- [AI Assistant](#ai-assistant)
- [Screenshots](#screenshots)
- [AI Tools Used](#ai-tools-used)
- [Challenges & Limitations](#challenges--limitations)
- [Future Improvements](#future-improvements)

---

## Features

### Core
- **Application Tracking** — CRUD operations for job applications with company, title, source, status, notes, and URL
- **Kanban Board** — Drag-and-drop board view (using `@hello-pangea/dnd`) alongside table and list views
- **Dashboard Analytics** — Real-time stats, monthly trend charts (AreaChart), status distribution (PieChart), and source breakdown (BarChart)
- **Search & Filter** — Filter by status, source, tag, and free-text search across company names and titles
- **CSV Export** — Export filtered applications to CSV with one click

### Organization
- **Companies** — Track companies with website, industry, notes, and linked applications
- **Tags** — Assign tags to applications for custom categorization
- **Resumes** — Manage multiple resume versions, mark a default resume
- **Calendar** — Visual calendar of application dates

### Interview Prep
- **Prep Questions** — Question bank with answers, categories, and difficulty levels
- **Prep Notes** — Linked notes tied to specific applications

### AI-Powered
- **AI Chat Assistant** — Streaming chat with contextual modes (profile, JD scan, tracker, interview, weekly, response)
- **JD Scanner** — Paste a job description for structured analysis: match score, gap analysis, resume advice, apply strategy, red flags
- **Application Analysis** — Per-application AI analysis stored in the database
- **Multi-Provider Support** — OpenAI, Anthropic, Google, or any OpenAI-compatible API (with encrypted API key storage)

### Productivity
- **Weekly Goals** — Set up to 3 weekly targets with progress tracking and status
- **User Profile** — Detailed profile (target roles, salary, notice period, strengths/weaknesses) that the AI uses as context
- **Dark Mode** — Full dark mode toggle with system preference detection

### Security & Auth
- **Clerk Authentication** — Sign-in, sign-up, and session management
- **Webhook Sync** — Clerk webhooks auto-create/update/delete user records in the database
- **Middleware Protection** — All app routes and API routes are protected by Clerk middleware
- **Row-Level Security** — Database queries are always scoped to the authenticated user
- **Encrypted AI Keys** — AES-256-GCM encryption for user-provided AI API keys stored in httpOnly cookies

---

## Live Links

| Service | URL |
|---|---|
| **Frontend** | https://career-track-delta.vercel.app |
| **API** | https://career-track-delta.vercel.app/api/health |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 15 (App Router) |
| **Language** | TypeScript 5 |
| **Auth** | Clerk |
| **Database** | PostgreSQL via Supabase (Prisma ORM) |
| **AI SDK** | Vercel AI SDK (`ai`) |
| **UI Components** | shadcn/ui + Radix UI |
| **Styling** | Tailwind CSS v4 |
| **Charts** | Recharts |
| **Drag & Drop** | @hello-pangea/dnd |
| **State** | Zustand |
| **Data Fetching** | TanStack React Query |
| **Validation** | Zod |
| **Markdown** | react-markdown + remark-gfm |
| **Deployment** | Vercel |
| **CI** | GitHub Actions |
| **Containerization** | Docker + Docker Compose (local Postgres) |

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- A [Clerk](https://clerk.com) account (free tier works)
- A [Supabase](https://supabase.com) project (or Docker for local Postgres)

### Option A — Supabase (Recommended)

1. Create a Supabase project and grab your connection strings from Settings → Database.

### Option B — Local Docker Postgres

```bash
docker compose up -d
```

This starts Postgres 16 on `localhost:5433`. Then set `DATABASE_URL` and `DIRECT_URL` to:

```
postgresql://postgres:postgres@localhost:5433/career-track
```

### Install

```bash
# Clone
git clone <repo-url>
cd career-track

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your keys

# Generate Prisma client & run migrations
npx prisma migrate dev

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | Source |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk Dashboard → API Keys |
| `CLERK_SECRET_KEY` | Clerk Dashboard → API Keys |
| `CLERK_WEBHOOK_SIGNING_SECRET` | Clerk Dashboard → Webhooks |
| `DATABASE_URL` | Supabase Settings → Database → Connection string (pooler) |
| `DIRECT_URL` | Supabase Settings → Database → Connection string (direct) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase Dashboard → Project Settings → API (anon/public key) |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` for local, or your deployed URL |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | `/` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | `/` |
| `AI_KEY_ENCRYPTION_SECRET` | Any 32+ character random string (used for AES-256-GCM encryption of AI keys) |

---

## Test Login

This project uses **Clerk** for authentication. There are no hardcoded test credentials.

1. Start the dev server (`npm run dev`)
2. Navigate to `/sign-up` to create a new account
3. Verify via Clerk's email or phone flow
4. You'll be redirected to the dashboard

> **Tip:** Clerk's free tier allows unlimited test users.

---

## API Endpoints

All API routes require Clerk authentication. Returns `401 Unauthorized` if not authenticated.

### Applications

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/applications` | List applications (query: `search`, `status`, `source`, `tag`, `sort`, `page`, `pageSize`) |
| `POST` | `/api/applications` | Create application |
| `GET` | `/api/applications/[id]` | Get application detail |
| `PUT` | `/api/applications/[id]` | Update application |
| `DELETE` | `/api/applications/[id]` | Delete application |
| `GET` | `/api/applications/[id]/analysis` | Get AI analysis for application |
| `GET` | `/api/applications/export` | Export applications as CSV (query: `status`) |

### Dashboard

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/dashboard/stats` | Aggregated stats, trends, recent applications, source breakdown |

### Companies

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/companies` | List companies (query: `search`) |
| `POST` | `/api/companies` | Create company |
| `PUT` | `/api/companies/[id]` | Update company |
| `DELETE` | `/api/companies/[id]` | Delete company |

### Tags

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/tags` | List all tags |
| `POST` | `/api/tags` | Create tag |
| `DELETE` | `/api/tags?id=` | Delete tag |

### Resumes

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/resumes` | List resumes |
| `POST` | `/api/resumes` | Add resume metadata |
| `PUT` | `/api/resumes/[id]` | Update resume |
| `DELETE` | `/api/resumes/[id]` | Delete resume |

### Interview Prep

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/prep-questions` | List questions (query: `category`, `search`) |
| `POST` | `/api/prep-questions` | Create question |
| `PUT` | `/api/prep-questions/[id]` | Update question |
| `DELETE` | `/api/prep-questions/[id]` | Delete question |
| `GET` | `/api/prep-notes` | List notes |
| `POST` | `/api/prep-notes` | Create note |
| `PUT` | `/api/prep-notes/[id]` | Update note |
| `DELETE` | `/api/prep-notes/[id]` | Delete note |

### Weekly Goals

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/weekly-goals` | List recent weekly goals (last 12 weeks) |
| `POST` | `/api/weekly-goals` | Create or update current week's goals |
| `PUT` | `/api/weekly-goals/[id]` | Update a specific week's goals |
| `DELETE` | `/api/weekly-goals/[id]` | Delete a week's goals |

### User Profile

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/user/profile` | Get user profile |
| `PUT` | `/api/user/profile` | Update user profile |
| `POST` | `/api/user/profile/onboard` | Complete onboarding |

### AI Assistant

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/ai/chat` | Streaming chat (body: `message`, `sessionId?`, `mode?`, `model?`) |
| `POST` | `/api/ai/scan-jd` | Analyze a job description (body: `jdText`, `applicationId?`) |
| `POST` | `/api/ai/test-connection` | Test AI provider connection |
| `GET` | `/api/ai/sessions` | List chat sessions |
| `GET` | `/api/ai/sessions/[id]` | Get session with messages |

### Settings

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/settings/ai-key` | Check if AI key is configured |
| `PUT` | `/api/settings/ai-key` | Save AI key (body: `providerType`, `apiKey`, `baseUrl?`, `model?`) |
| `DELETE` | `/api/settings/ai-key` | Remove AI key |

### System

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/webhooks/clerk` | Clerk webhook receiver |

---

## Project Structure

```
src/
├── app/
│   ├── (app)/                    # Authenticated routes
│   │   ├── dashboard/page.tsx    # Main dashboard with charts & stats
│   │   ├── applications/         # Applications CRUD + detail + edit
│   │   ├── companies/            # Company management
│   │   ├── ai-assistant/         # AI chat interface
│   │   ├── interview-prep/       # Prep questions & notes
│   │   ├── resumes/              # Resume management
│   │   ├── calendar/             # Calendar view
│   │   ├── weekly-goals/         # Weekly goal setting
│   │   ├── profile-setup/        # User profile onboarding
│   │   └── settings/             # AI key configuration
│   ├── api/                      # API routes (see table above)
│   ├── sign-in/                  # Clerk sign-in
│   ├── sign-up/                  # Clerk sign-up
│   ├── layout.tsx                # Root layout with ClerkProvider
│   └── page.tsx                  # Landing page
├── components/
│   ├── dashboard/                # BoardView, TableView, ListView, FilterBar, etc.
│   ├── weekly-goals/             # WeeklyGoalsWidget, WeeklyGoalForm, WeeklyReviewCard
│   ├── applications/             # ApplicationDetailsCard, AnalysisSection
│   ├── ui/                       # shadcn/ui primitives
│   └── Shell.tsx, Sidebar.tsx, Navbar.tsx, etc.
├── lib/
│   ├── ai/                       # AI client, prompts, context builder, mode router
│   ├── hooks/use-ai-chat.ts      # Chat streaming hook
│   ├── auth.ts                   # getInternalUserId helper
│   ├── prisma.ts                 # Prisma client singleton
│   ├── api.ts                    # React Query hooks
│   ├── store.ts                  # Zustand UI store
│   ├── encryption.ts             # AES-256-GCM encrypt/decrypt
│   └── utils.ts                  # cn() helper
└── middleware.ts                  # Clerk auth middleware
prisma/
├── schema.prisma                 # 12 models
└── migrations/
```

---

## AI Assistant

The AI assistant supports multiple providers and modes:

### Supported Providers

| Provider | Default Model | Package |
|---|---|---|
| OpenAI | `gpt-4o-mini` | `@ai-sdk/openai` |
| Anthropic | `claude-3-haiku-20240307` | `@ai-sdk/anthropic` |
| Google | `gemini-1.5-flash` | `@ai-sdk/google` |
| Custom OpenAI-compatible | User-specified | `@ai-sdk/openai` with custom base URL |

### Chat Modes

The AI auto-detects the intent of your message and routes to the appropriate mode:

| Mode | Purpose |
|---|---|
| `profile` | Help build or improve your user profile |
| `jd-scan` | Analyze a pasted job description |
| `application` | Advice on specific applications |
| `tracker` | General tracker usage help |
| `response` | Help draft cover letters or responses |
| `interview` | Interview preparation guidance |
| `weekly` | Weekly goal review and planning |
| `recovery` | Help recovering from rejections |

### JD Scanner Output

The JD scanner returns a structured JSON analysis with:
- Match score (0–100)
- Confidence level
- Verdict (Apply / Maybe / Skip)
- Missing keywords vs. your profile
- Gap analysis
- Resume tailoring advice
- Application strategy
- Red flags
- Final recommendation

---

## Screenshots

> Add screenshots here by placing images in the `public/` folder and referencing them.

```
<!-- ![Dashboard](public/screenshots/dashboard.png) -->
<!-- ![Board View](public/screenshots/board-view.png) -->
<!-- ![AI Assistant](public/screenshots/ai-assistant.png) -->
<!-- ![Application Detail](public/screenshots/application-detail.png) -->
```

---

## AI Tools Used

This project was built with the assistance of the following AI tools:

| Tool | Usage |
|---|---|
| **Claude (Anthropic)** | Architecture planning, code generation, debugging, and documentation via opencode CLI |
| **Vercel AI SDK** | Streaming chat, structured object generation (`streamText`, `generateObject`) |
| **OpenAI API** | Runtime AI provider (user-configurable) |
| **Supabase MCP** | Database schema management, migrations, and project configuration |

---

## Challenges & Limitations

### Challenges
- **Multi-provider AI abstraction** — Unifying OpenAI, Anthropic, and Google behind a single interface required careful handling of different model naming and API patterns
- **Streaming + persistence** — Saving chat messages after streaming completes required `onFinish` callbacks rather than saving during the stream
- **Encrypted key storage** — AI API keys needed to be stored securely (httpOnly cookies with AES-256-GCM) without server-side persistence
- **Clerk ↔ Prisma sync** — Webhook-based user synchronization had to handle create, update, and delete events reliably
- **Board view drag-and-drop** — Cross-column status updates via drag-and-drop required optimistic UI updates with React Query invalidation

### Known Limitations
- **No real-time sync** — Changes require page refresh or React Query refetch; no WebSocket/live updates
- **Resume file upload** — Resumes are stored as metadata only; actual file upload to Supabase Storage is not yet implemented
- **Calendar is read-only** — Displays application dates but doesn't support drag-to-reschedule
- **AI key per-session** — AI configuration is stored in cookies, so switching browsers or clearing cookies loses the key
- **No team/collaboration features** — Single-user only; no shared workspaces
- **No email integration** — Applications must be added manually; no email parsing or auto-import
- **Rate limiting** — No API rate limiting beyond Clerk's built-in auth throttling

---

## Future Improvements

- [ ] **Supabase Storage** for resume file uploads (PDF parsing, version history)
- [ ] **Email integration** — Parse forwarded job emails to auto-create applications
- [ ] **Real-time updates** via Supabase Realtime or WebSockets
- [ ] **Mobile app** — PWA or React Native companion
- [ ] **Browser extension** — One-click "Save this job" from any job board
- [ ] **Team workspaces** — Share applications and notes with a job search buddy
- [ ] **API rate limiting** — Protect AI endpoints from abuse with upstash/ratelimit
- [ ] **Accessibility audit** — Full WCAG 2.1 AA compliance
- [ ] **E2E tests** — Playwright or Cypress test suite
- [ ] **Job board API integrations** — LinkedIn, Indeed, and others for auto-import
- [ ] **AI-powered cover letter generation** from profile + JD analysis
- [ ] **Analytics dashboard** — Response rates, time-to-interview, source ROI

---

## License

MIT
