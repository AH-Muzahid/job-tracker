<div align="center">
  <h1>🚀 CareerTrack</h1>
  <p><strong>The Autonomous AI-Powered Career Copilot & Job Application Intelligence Platform</strong></p>
  
  [![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)
  [![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
  [![Upstash Redis](https://img.shields.io/badge/Upstash-Redis-00E599?style=for-the-badge&logo=redis)](https://upstash.com/)
  [![Inngest](https://img.shields.io/badge/Inngest-Durable%20Workflows-5A67D8?style=for-the-badge)](https://inngest.com/)
  [![Clerk](https://img.shields.io/badge/Auth-Clerk-6C47FF?style=for-the-badge&logo=clerk)](https://clerk.com/)
</div>

<br />

**CareerTrack** is a production-grade, full-stack career copilot and job application operating system. It features **autonomous agentic workflows**, **vectorless Career Knowledge Graphs (Graph-RAG)**, **ChatGPT-style persistent semantic memory**, **zero-latency Redis caching**, and **durable background automation**.

---

## ✨ System Architecture & Key Capabilities

```mermaid
flowchart TD
    User([User / Browser]) <--> NextApp[Next.js 15 App Router]
    
    subgraph AgenticLayer [🤖 Autonomous Agentic Core]
        AI[AI Copilot / Multi-Model Stream]
        Tools[Autonomous Tools: Knowledge Graph / JD Scan / Scrape / Status / Email Draft / Memory]
        Inngest[Inngest Background Automations]
    end

    subgraph MemoryLayer [🧠 Fast LTM & Knowledge Graph]
        Redis[(Upstash Redis 0-2ms Cache)]
        Prisma[(PostgreSQL Database via Prisma)]
        Graph[Career Knowledge Graph: Domains -> Skills -> Projects -> Metrics]
        UserMemories[UserMemory Table & Cross-Session Injection]
    end

    NextApp <--> AgenticLayer
    AgenticLayer <--> MemoryLayer
```

---

## 🌟 Comprehensive Feature Set

### 🌳 1. Vectorless Career Knowledge Graph & Graph-RAG Engine

```mermaid
graph TD
    User([User Career Root]) --> Domain1[Frontend Architecture]
    User --> Domain2[Backend & Distributed Systems]
    User --> Domain3[DevOps & Cloud]

    Domain2 --> Skill1[Go / Golang]
    Domain2 --> Skill2[PostgreSQL & Redis]
    Domain2 --> Skill3[Kafka / Messaging]

    Skill1 --> Proj1[Project: High-Throughput Ingestion Engine]
    Skill2 --> Proj1
    Proj1 --> Metric1[Impact: 50k req/s & 40% Latency Drop]
    Proj1 --> Evidence1[Resume Section: Senior Engineer 2024-2026]

    Skill1 --> PrepQ1[Interview Q: Go Concurrency & Channels]
    
    JD([Target JD: Tech Lead]) -.->|Requires| Skill1
    JD -.->|Requires| Skill2
    JD -.->|Matches via Graph Traversal| Proj1
```

- **Hierarchical Career Graph** — Structures your professional background into connected nodes (`Domain`, `Skill`, `Project`, `Metric`, `Role`) and edges (`APPLIED_IN`, `PROVEN_BY`, `BELONGS_TO`, `REQUIRES`).
- **Canonical Skill Normalization** — Zero-overhead canonical aliasing (`golang` ➔ `go`, `k8s` ➔ `kubernetes`, `ts` ➔ `typescript`, `psql` ➔ `postgresql`) prevents keyword mismatch without expensive float embeddings.
- **Deterministic Subgraph Traversal** — Traverses `Skill ➔ Project ➔ Metric` paths against any JD to calculate exact **Graph Match Scores (0–100%)** and extract verified proof paths with zero hallucinations.
- **Autonomous Graph Tools** — AI Copilot utilizes `queryCareerKnowledgeGraph` and `syncCareerKnowledgeGraph` to retrieve project proofs on demand.
- **Interactive Graph Visualizer** — Embedded `CareerGraphVisualizer` component displays verified competencies, evidence paths, and interview gap alerts.

### 🤖 2. Autonomous Agentic AI & Copilot
- **Multi-Provider AI Engine** — Connect OpenAI, Anthropic Claude, Google Gemini, Groq, or DeepSeek with client-side encrypted AES-256-GCM keys.
- **Autonomous Tool Execution** — AI reads job URLs, parses JD/PDF resumes, triggers status updates, and drafts recruiter communications.
- **Interactive Email Outreach Workflow** — Generates personalized cold emails & follow-up drafts directly in chat with interactive review cards and 1-click dispatching.
- **8 Contextual Modes** — `profile`, `jd-scan`, `application`, `tracker`, `response`, `interview`, `weekly`, `recovery`.

### 🧠 3. Persistent Semantic Memory & Fact Extraction
- **Continuous Knowledge Retention** — AI automatically extracts and saves user constraints, salary targets, tech stack preferences, and notice periods across sessions.
- **Memory Tools** — `saveUserMemory`, `forgetUserMemory`, `getUserMemories`.
- **Interactive Memory Manager UI** — Integrated directly into `/settings` for full user transparency and 1-click memory deletion.
- **Prompt Prefix Caching** — Optimized token layouts maximize provider-level prompt caching for 50–80% lower inference costs and lightning-fast TTFT.

### ⚡ 4. High-Speed LTM with Upstash Redis
- **0–2ms Context Fetching** — User profile, default resume, knowledge graph, and persistent memories are cached in serverless Redis.
- **Automated Cache Invalidation** — Writes to resumes, profiles, or memories instantly purge stale Redis cache keys.
- **Resilient Fallback** — Automatic graceful degradation to PostgreSQL when Redis keys are not provided.

### ⏱️ 5. Durable Background Automation (Inngest)
- **Daily Job Hunt Briefing (`daily-job-hunt`)** — Automatically scans pipeline for stale applications (>7 days without update) and dispatches action summaries.
- **Weekly Goal Accountability Digest (`weekly-goal-digest`)** — Reviews weekly targets, logs progress, and provides strategy advice.

### 📋 6. Core Pipeline & Career Tracking
- **Interactive Kanban Board & Table Views** — Drag-and-drop pipeline powered by `@hello-pangea/dnd`.
- **Application Analytics** — Per-job AI match score (0–100), gap analysis, keyword extraction, and red flags.
- **Company & Resume Hub** — Organization hub with multi-version resume management and default resume context.
- **Interview Question Bank** — Categorized question repository with difficulty ratings and answers.
- **Weekly Goals & Progress** — Weekly target tracker with status indicators.
- **CSV Data Export & Calendar** — 1-click CSV download and visual application timeline.

---

## 💻 Tech Stack

| Category | Technology |
| :--- | :--- |
| **Framework** | Next.js 15 (App Router), React 19 |
| **Language** | TypeScript 5 |
| **Database & ORM** | PostgreSQL (Supabase), Prisma 6 |
| **Knowledge Graph** | Custom Vectorless Graph-RAG Engine with Canonical Aliasing |
| **Caching & LTM** | Upstash Redis (`@upstash/redis`) |
| **Background Automation** | Inngest (`inngest`) |
| **Email Dispatch** | Resend (`resend`) with simulation mode |
| **Authentication** | Clerk (`@clerk/nextjs`) |
| **Styling & UI** | Tailwind CSS v4, shadcn/ui, Radix UI, Framer Motion, Lucide Icons |
| **AI Integration** | Vercel AI SDK (`ai`), `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google` |
| **Testing** | Vitest (`vitest`) with 32 passing unit tests |

---

## 🚀 Quickstart & Setup

### 1️⃣ Clone and Install

```bash
git clone https://github.com/AH-Muzahid/job-tracker.git
cd career-track
npm install
```

### 2️⃣ Environment Configuration

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in the required environment variables:

```env
# Database (Supabase PostgreSQL)
DATABASE_URL="postgresql://postgres.[ref]:[pass]@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[ref]:[pass]@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."

# Security
AI_KEY_ENCRYPTION_SECRET="your-32-char-random-secret"

# Redis Cache (Upstash Redis)
UPSTASH_REDIS_REST_URL="https://[endpoint].upstash.io"
UPSTASH_REDIS_REST_TOKEN="[token]"

# Email Dispatch (Resend - Optional, falls back to simulation mode)
RESEND_API_KEY="re_..."
RESEND_FROM_EMAIL="CareerTrack <onboarding@resend.dev>"
```

### 3️⃣ Database Migration

```bash
npx prisma generate
npx prisma db push
```

### 4️⃣ Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the application.

---

## 🧪 Testing & Verification

Run the comprehensive unit test suite:

```bash
npm test
```

Run linter and build checks:

```bash
npm run lint
npm run build
```

---

## 📡 API Reference Overview

<details>
<summary><strong>Explore Available Endpoints</strong></summary>

### 🌳 Knowledge Graph & AI
- `POST /api/ai/chat` — Context-aware streaming copilot with Knowledge Graph traversal tools
- `POST /api/ai/scan-jd` — Job description parser with Graph-RAG verification & match scoring
- `POST /api/ai/send-email` — Recruiter email dispatcher
- `GET/POST /api/user/memories` — List and create persistent facts
- `DELETE /api/user/memories/[id]` — Delete specific memory fact

### 📋 Applications & Stats
- `GET/POST /api/applications` — Applications CRUD & filtering
- `GET /api/applications/[id]/analysis` — Retrieve AI analysis for a job
- `GET /api/dashboard/stats` — Metrics, trends, and recent applications
- `GET /api/applications/export` — Export pipeline to CSV

### ⚙️ Automation & Webhooks
- `POST /api/inngest` — Inngest background event receiver
- `POST /api/webhooks/clerk` — Clerk user lifecycle synchronizer

</details>

---

<div align="center">
  <p>Crafted with precision for modern software engineers and ambitious professionals.</p>
</div>
