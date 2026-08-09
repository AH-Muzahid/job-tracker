# AI Agentic Workflow Roadmap 🚀

This document outlines the architecture and phased implementation plan to transform the career-track application into a Fully Autonomous Job Hunting System.

## 🏗️ Architectural Stack (TypeScript-First)
- **Frontend & API:** Next.js (App Router)
- **Agent Logic:** Vercel AI SDK (Tool Calling & Core Logic)
- **Database:** PostgreSQL (Prisma)
- **Durable Execution (Background Jobs):** Inngest or Trigger.dev (Ensures tasks survive server restarts)
- **Web Scraping:** Jina Reader API or Cheerio (To read job links and extract data)
- **Email Integration:** Gmail API (To read and send official emails)

---

## 🗺️ Phase-by-Phase Implementation Plan

### Phase 1: Web Data Extraction (Current Phase)
Give the AI the ability to "read the internet".
- **Task:** Create a `scrapeJobLink` tool.
- **Outcome:** The user provides a job link. The AI browses the link, reads the job description, matches it with the user's profile, and updates the tracker.
- **Tech:** Jina Reader API (https://r.jina.ai/) for clean Markdown extraction.

### Phase 2: Communication Layer (Email Integration)
Give the AI the ability to speak on behalf of the user.
- **Task:** Integrate Gmail API or Resend and create a `sendEmail` tool.
- **Outcome:** The AI drafts a cover letter and prepares the email. The user clicks "Approve" in the UI, and the AI automatically dispatches the email.

### Phase 3: Background Automation (Durable Execution)
Allow the system to work in the user's absence.
- **Task:** Setup Inngest or Trigger.dev.
- **Outcome:** Every morning, the system autonomously searches specific job boards, filters the best matches, drafts cover letters, and saves them to the database. The user only needs to log in and approve.

### Phase 4: Full Multi-Agent Autonomy & Reply Handling
The Ultimate Goal.
- **Task:** Add Gmail Webhooks and build a state machine (potentially using LangGraph JS).
- **Outcome:** When a recruiter replies, the system reads the email, determines if it's an interview invite or a rejection, drafts a context-aware reply (checking calendar availability), and notifies the user.
