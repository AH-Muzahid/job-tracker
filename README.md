<div align="center">
  <h1>🚀 CareerTrack</h1>
  <p><strong>The Ultimate AI-Powered Job Application Tracker</strong></p>
  
  [![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)
  [![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
  [![Clerk](https://img.shields.io/badge/Auth-Clerk-6C47FF?style=for-the-badge&logo=clerk)](https://clerk.com/)
</div>

<br />

A full-stack job search tracker with an **integrated AI assistant**, built for managing every stage of the application lifecycle — from first save to final offer. 

---

## ✨ Comprehensive Feature Set

### 📋 Core Application Tracking
- **Kanban Board & Lists** — Intuitive drag-and-drop board view (via `@hello-pangea/dnd`) alongside detailed table and list views.
- **Status Tracking** — Granular history of status changes for every application.
- **Advanced Filtering** — Filter by status, source, tags, or free-text search across companies and roles.
- **CSV Export** — Export your filtered applications to CSV with a single click.
- **Calendar View** — Visual calendar of application dates.

### 🏢 Organization & Prep
- **Companies & Tags** — Track companies with notes and industry info, and use custom tags for categorization.
- **Resume Management** — Manage multiple resume versions and mark a default resume.
- **Interview Prep** — A built-in question bank with answers, categories, and difficulty levels, plus prep notes linked to specific applications.

### 🤖 AI-Powered Assistant & Analysis
- **Multi-Provider Support** — Choose between OpenAI, Anthropic, or Google Gemini (with AES-256 encrypted API key storage).
- **JD Scanner** — Paste a job description to get a match score, gap analysis, resume tailoring advice, and red flags.
- **Application Analysis** — Per-application AI analysis stored directly in the database.
- **Contextual Chat Modes** — Streaming AI chat tailored for interview prep, profile review, weekly planning, and rejection recovery.

### 📊 Dashboard & Productivity
- **Real-time Analytics** — Visualize your progress with monthly trend charts, status distributions, and source breakdowns using Recharts.
- **Weekly Goals** — Set and track up to 3 weekly targets to maintain momentum with progress tracking.
- **Detailed User Profile** — Store target roles, salary, notice period, and strengths/weaknesses to give the AI context.
- **Dark Mode** — Full dark mode toggle with system preference detection.

### 🔒 Enterprise-Grade Security
- **Clerk Authentication** — Secure sign-in, sign-up, and session management.
- **Webhook Sync** — Automated database synchronization via Clerk Webhooks (`svix`).
- **Row-Level Security** — All database queries are strictly scoped to the authenticated user.
- **Encrypted Storage** — AES-256-GCM encryption for user-provided AI API keys stored in httpOnly cookies.

---

## 💻 Tech Stack

| Category | Technology |
| :--- | :--- |
| **Framework** | Next.js 15 (App Router), React 19 |
| **Language** | TypeScript 5 |
| **Database & ORM** | PostgreSQL (Supabase), Prisma 6 |
| **Authentication** | Clerk |
| **Styling & UI** | Tailwind CSS v4, shadcn/ui, Radix UI, Framer Motion, Lenis |
| **State & Data** | Zustand, TanStack React Query |
| **AI Integration** | Vercel AI SDK (`ai`), pdf-parse |
| **Charts & DND** | Recharts, `@hello-pangea/dnd` |

---

## 🚀 Getting Started

> [!IMPORTANT]
> **Prerequisites:** Make sure you have Node.js 20+, npm, a [Clerk](https://clerk.com) account, and a [Supabase](https://supabase.com) project (or Docker for local Postgres) before starting.

### 1️⃣ Clone and Install

```bash
git clone <repo-url>
cd career-track
npm install
```

### 2️⃣ Environment Setup

Copy the example environment file and configure your keys:

```bash
cp .env.example .env.local
```

> [!NOTE]
> Ensure you have your Clerk API Keys, Supabase Database URLs (`DATABASE_URL` and `DIRECT_URL`), and a random 32+ character string for `AI_KEY_ENCRYPTION_SECRET`.

### 3️⃣ Database Setup

**Option A (Supabase - Recommended):** Use your Supabase connection strings.
**Option B (Local Docker):** Start Postgres 16 locally using `docker compose up -d`.

Generate the Prisma client and run migrations:

```bash
npx prisma generate
npx prisma migrate dev
```

### 4️⃣ Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📡 Core API Endpoints

All API routes require Clerk authentication and are protected by middleware.

<details>
<summary><strong>View Detailed API Endpoints</strong></summary>

### Applications & Dashboard
- `GET /api/applications` — List applications (with query filters)
- `POST /api/applications` — Create application
- `GET /api/applications/[id]/analysis` — Get AI analysis for application
- `GET /api/dashboard/stats` — Aggregated stats, trends, and recent applications
- `GET /api/applications/export` — Export as CSV

### AI Assistant
- `POST /api/ai/chat` — Streaming chat with specific modes
- `POST /api/ai/scan-jd` — Analyze a job description
- `GET /api/ai/sessions` — List chat sessions

### Organization & Prep
- `GET/POST /api/companies` — Manage companies
- `GET/POST /api/resumes` — Manage resumes
- `GET/POST /api/prep-questions` — Manage interview prep questions
- `GET/POST /api/weekly-goals` — Manage weekly goals
- `GET/PUT /api/user/profile` — Manage user profile context

</details>

---

## 📁 Project Structure

<details>
<summary><strong>View Directory Structure</strong></summary>

```
src/
├── app/
│   ├── (app)/                    # Authenticated routes (Dashboard, Kanban, etc.)
│   ├── api/                      # Protected API routes
│   ├── sign-in/                  # Clerk sign-in
│   └── sign-up/                  # Clerk sign-up
├── components/
│   ├── dashboard/                # Views: Board, Table, List
│   ├── applications/             # Detail cards, AI analysis sections
│   ├── weekly-goals/             # Goal widgets
│   └── ui/                       # shadcn/ui components
├── lib/
│   ├── ai/                       # AI client, prompts, context builder
│   ├── prisma.ts                 # Prisma singleton
│   ├── store.ts                  # Zustand UI store
│   └── encryption.ts             # AES-256-GCM logic
└── middleware.ts                 # Clerk auth protection

prisma/
└── schema.prisma                 # Database models (User, Application, PrepQuestion, etc.)
```

</details>

---

## 🧠 AI Assistant Features

### JD Scanner Output
The JD scanner returns a structured JSON analysis containing:
- Match score (0–100) & Confidence level
- Verdict (Apply / Maybe / Skip)
- Missing keywords & Gap analysis
- Resume tailoring advice & Apply strategy
- Red flags

### Chat Modes
- `profile`: Build your contextual profile
- `jd-scan`: Analyze job descriptions
- `application`: Advice on specific applications
- `tracker`: General app usage help
- `response`: Draft emails or cover letters
- `interview`: Mock interview guidance
- `weekly`: Goal planning
- `recovery`: Coping with rejections

---

## 🚧 Challenges & Known Limitations

- **Multi-Provider AI Abstraction:** Unifying OpenAI, Anthropic, and Google required handling different API patterns.
- **Streaming + Persistence:** Saving chat messages required `onFinish` callbacks rather than saving during the stream.
- **Encrypted Key Storage:** API keys are stored securely (httpOnly cookies with AES-256) without server-side database persistence.
- **Optimistic UI:** Cross-column drag-and-drop required React Query invalidation and optimistic updates.
- **Resume Uploads:** Resumes are currently stored as metadata; actual file uploads to Supabase Storage are pending.

---

## 🔮 Future Improvements

- [ ] **Supabase Storage** for resume PDF uploads and parsing.
- [ ] **Email Integration** to auto-parse forwarded job emails.
- [ ] **Real-time Updates** via Supabase Realtime or WebSockets.
- [ ] **E2E Testing** suite implementation using Playwright.
- [ ] **Job Board API Integrations** for auto-importing (LinkedIn, Indeed).
- [ ] **Browser Extension** for one-click job saving.

---

<div align="center">
  <p>Built with ❤️ for job seekers everywhere.</p>
</div>
