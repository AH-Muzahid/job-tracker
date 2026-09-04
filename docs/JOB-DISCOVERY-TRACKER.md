# 🎯 CareerTrack Job Discovery Living Execution Tracker

> **Source Audit Document**: [`docs/JOB-DISCOVERY-AUDIT.md`](./JOB-DISCOVERY-AUDIT.md)  
> **Initial Audit Date**: September 4, 2026  
> **Status**: Active Living Tracker  
> **Maturity Goal**: Transform Discovery from a scheduled pipeline (28/100 Agentic) into an Autonomous Career Agent (90+/100 Agentic).

---

## ⚠️ MANDATORY RULE FOR ALL AGENTS & DEVELOPERS

```
Whenever ANY change, fix, optimization, or feature is added to the Job Discovery System:
1. Update the status of the corresponding item in this tracker ([ ] -> [/] -> [x]).
2. Record the date and target files.
3. Append a detailed entry to the "Audit Change Log & History" section at the bottom.
4. Keep docs/JOB-DISCOVERY-AUDIT.md and docs/JOB-DISCOVERY-TRACKER.md in sync.
```

---

## 📊 High-Level Metric & Scorecard Tracker

| Milestone | Agentic Maturity | Product Maturity | AI Architecture | Discovery Quality | Target Date | Status |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Baseline Audit (v0.1.0)** | **28 / 100** | **52 / 100** | **61 / 100** | **45 / 100** | Sep 4, 2026 | ✅ Audited |
| **Phase 1: Critical Fixes (P0)** | 40 / 100 | 65 / 100 | 70 / 100 | 65 / 100 | Sep 18, 2026 | 🟡 In Queue |
| **Phase 2: Intelligence & Sources (P1)**| 60 / 100 | 78 / 100 | 80 / 100 | 80 / 100 | Dec 2026 | ⚪ Planned |
| **Phase 3: Agentic Autonomy (P2)** | 80 / 100 | 88 / 100 | 90 / 100 | 90 / 100 | Mar 2027 | ⚪ Planned |
| **Phase 4: Full Multi-Agent OS (P3)** | 95 / 100 | 95 / 100 | 95 / 100 | 95 / 100 | Sep 2027 | ⚪ Planned |

---

## 🚨 Top 20 Action Items & Recommendation Tracker

### Phase 1: Immediate Critical Fixes (P0 — Target: Weeks 1–2)

- [x] **`REC-01` [Trust] Remove / Auto-Expire Hardcoded Static Jobs**
  - **Issue**: 23 hardcoded stale jobs in `src/lib/discovery/scrapers.ts` (`CURATED_SEED_RESERVOIR`, `DAILY_LINKEDIN_SOCIAL_POSTS`, `BD_TECH_AGENCY_JOBS`).
  - **Action**: Move to DB or add `expiresAt` with 30-day TTL and auto-archival to prevent user distrust.
  - **Target Files**: `src/lib/discovery/scrapers.ts`, `prisma/schema.prisma`, `prisma/seed-discovery.ts`
  - **Status**: `Completed`
  - **Owner**: Antigravity AI
  - **Completed At**: 2026-09-04

- [x] **`REC-02` [Performance] Move Cold-Start Scraping Out of Synchronous API Route**
  - **Issue**: First visit to `/discovery` calls `processUserJobBatch` synchronously, fetching 5 external APIs (3.5–4s timeouts) and blocking HTTP for 8–15s (Vercel timeout risk).
  - **Action**: Return instant cached/staged response, trigger asynchronous Inngest event `app/job-batch.trigger` for crawling, stream/notify client when ready.
  - **Target Files**: `src/app/api/jobs/discover/route.ts`, `src/inngest/functions/batch-job-pipeline.ts`
  - **Status**: `Completed`
  - **Owner**: Antigravity AI
  - **Completed At**: 2026-09-04

- [x] **`REC-03` [Security] Implement Rate Limiting on Discovery Endpoints**
  - **Issue**: `GET /api/jobs/discover?refresh=true` and `POST /api/jobs/discover` have no rate limiting, allowing denial-of-service / API quota exhaustion.
  - **Action**: Add Upstash Redis sliding window rate limiter (e.g., 10 req/min per user for discovery).
  - **Target Files**: `src/app/api/jobs/discover/route.ts`, `src/lib/rate-limit.ts`
  - **Status**: `Completed`
  - **Owner**: Antigravity AI
  - **Completed At**: 2026-09-04

- [x] **`REC-04` [Trust] Implement Scam & Fraud Detection Layer**
  - **Issue**: Scraped listings have zero fraud checks (phishing URLs, fake recruiters, unrealistic salaries).
  - **Action**: Implement heuristic rule-checks (disposable domains, payment requests, missing company profile, telegram-only contact). Flag with `scamScore`.
  - **Target Files**: `src/lib/discovery/matching.ts`, `src/lib/discovery/types.ts`
  - **Status**: `Completed`
  - **Owner**: Antigravity AI
  - **Completed At**: 2026-09-04

- [x] **`REC-05` [Learning] Capture Dismiss Reasons for Feedback Loops**
  - **Issue**: Dismissing a job currently gives zero signal back to the AI (wasted learning opportunity).
  - **Action**: Add dismiss modal/dropdown (`wrong_role`, `wrong_location`, `bad_salary`, `bad_company`, `unqualified`) and feed into `penalizedSkills` / `dislikedPatterns`.
  - **Target Files**: `src/components/discovery/DiscoveryJobRow.tsx`, `src/app/api/jobs/discover/route.ts`, `prisma/schema.prisma`
  - **Status**: `Completed`
  - **Owner**: Antigravity AI
  - **Completed At**: 2026-09-04

---

### Phase 2: Intelligence, Quality & Sources (P1 — Target: 1–3 Months)

- [x] **`REC-06` [Accuracy] Expand Match Score Range to 1–99%**
  - **Issue**: Artificial 50–88% compression causes clustering between 65–78%, blinding users to truly great vs mediocre jobs.
  - **Action**: Recalibrate formula with uncompressed soft scoring and transparent factor breakdowns.
  - **Target Files**: `src/lib/ai/graph/tools/discovery-tools.ts`
  - **Status**: `Completed`
  - **Completed At**: 2026-09-04

- [x] **`REC-07` [Coverage] Integrate Greenhouse & Lever API Ingestion**
  - **Issue**: Missing direct ATS integration where 50%+ of high-quality tech startups hire.
  - **Action**: Add direct boards endpoints (`boards-api.greenhouse.io`, `api.lever.co`).
  - **Target Files**: `src/lib/discovery/scrapers.ts`
  - **Status**: `Completed`
  - **Completed At**: 2026-09-04

- [x] **`REC-08` [Observability] End-to-End Analytics & Metric Tracking**
  - **Issue**: Zero telemetry for `batch_published`, `job_viewed`, `job_saved`, `job_applied`.
  - **Action**: Implement event logger tracking North Star and funnel conversions.
  - **Target Files**: `src/lib/telemetry.ts`, `src/app/api/jobs/discover/route.ts`
  - **Status**: `Completed`
  - **Completed At**: 2026-09-04

- [ ] **`REC-09` [Intelligence] Implicit Preference Learning Engine**
  - **Issue**: Macro-learning engine only reads from `Application` status changes, not in-feed discovery interactions.
  - **Action**: Infer user taste from click-through rates, time spent viewing JD, and save/unsave patterns.
  - **Target Files**: `src/lib/ai/learning-engine.ts`, `src/lib/ai/graph/tools/discovery-tools.ts`
  - **Status**: `Pending`
  - **Completed At**: —

- [ ] **`REC-10` [Intelligence] Company Profile Enrichment**
  - **Issue**: Company names have no context (funding round, team size, culture, employee sentiment).
  - **Action**: Integrate company metadata enrichment (funding stage, headcount, Glassdoor/LinkedIn rating).
  - **Target Files**: `src/lib/discovery/types.ts`, `prisma/schema.prisma`
  - **Status**: `Pending`
  - **Completed At**: —

- [ ] **`REC-11` [Engagement] Daily Personalized Opportunity Digest Email**
  - **Issue**: Daily Inngest briefing only audits stale applications; it never includes fresh high-fit discovered jobs.
  - **Action**: Inject top 3–5 newly matched jobs (≥75% fit) into the daily briefing email with 1-click apply links.
  - **Target Files**: `src/inngest/functions/daily-job-hunt.ts`, `src/lib/email.ts`
  - **Status**: `Pending`
  - **Completed At**: —

- [ ] **`REC-12` [Intelligence] Visa Sponsorship & Work Auth Extraction**
  - **Issue**: International candidates cannot filter jobs requiring US/UK citizenship vs offering sponsorship.
  - **Action**: Parse JD text for visa sponsorship signals (`H-1B`, `Visa Sponsorship Available`, `Must be authorized`).
  - **Target Files**: `src/lib/discovery/matching.ts`
  - **Status**: `Pending`
  - **Completed At**: —

---

### Phase 3: UX & Search Infrastructure (P2 — Target: 3–6 Months)

- [ ] **`REC-13` [UX] Instant Search with PostgreSQL Full-Text Search / pg_trgm**
  - **Issue**: Discovery search is done in-memory on client slice, missing historical database records.
  - **Action**: Implement server-side search using `pg_trgm` or Meilisearch for sub-50ms search across descriptions.
  - **Target Files**: `src/app/api/jobs/discover/route.ts`, `prisma/schema.prisma`
  - **Status**: `Pending`
  - **Completed At**: —

- [x] **`REC-14` [UX] "Top Picks" Hero Carousel & Visual Hierarchy**
  - **Issue**: Flat list view causes decision fatigue; 85%+ matches look visually identical to 60% matches.
  - **Action**: Add a spotlight "Top 3 High-Probability Matches" section with prominent styling and direct apply prompts.
  - **Target Files**: `src/components/discovery/DiscoveryTopPicks.tsx`, `src/components/discovery/DiscoveryDismissModal.tsx`, `src/components/discovery/DiscoveryJobList.tsx`, `src/components/discovery/DiscoveryPage.tsx`
  - **Status**: `Completed`
  - **Completed At**: 2026-09-04

- [ ] **`REC-15` [Quality] Posted Date & Freshness Tracking**
  - **Issue**: Jobs lack origin publish timestamps; older jobs receive the same priority as 2-hour-old postings.
  - **Action**: Extract `postedAt` timestamp from scrapers and incorporate freshness decay into ranking.
  - **Target Files**: `src/lib/discovery/types.ts`, `src/lib/discovery/scrapers.ts`
  - **Status**: `Pending`
  - **Completed At**: —

- [ ] **`REC-16` [Agentic] Cover Letter Agent Trigger on Save**
  - **Issue**: Saving a job to the tracker requires the user to manually draft application materials elsewhere.
  - **Action**: Proactively draft a tailored cover letter and resume bullet highlights whenever a job is saved.
  - **Target Files**: `src/lib/ai/graph/tools/job-tools.ts`, `src/features/applications/`
  - **Status**: `Pending`
  - **Completed At**: —

- [ ] **`REC-17` [Architecture] Semantic Vector Matching (pgvector Embeddings)**
  - **Issue**: Matching relies purely on exact canonical string comparison and regexes.
  - **Action**: Embed job descriptions and match against candidate profile embeddings for semantic serendipity.
  - **Target Files**: `src/lib/ai/memory-search.ts`, `src/lib/discovery/matching.ts`
  - **Status**: `Pending`
  - **Completed At**: —

---

### Phase 4: Autonomous Agentic Ecosystem (P3 — Target: 6–12 Months)

- [ ] **`REC-18` [Agentic] True Autonomous Discovery Agent (LangGraph Plan-and-Execute)**
  - **Issue**: System runs fixed cron pipelines rather than goal-directed agent loops.
  - **Action**: Build goal-aware discovery agent that evaluates yield, changes query vectors, adjusts scraping frequency, and self-corrects.
  - **Target Files**: `src/lib/ai/graph/nodes/discovery-planner.ts`, `src/inngest/`
  - **Status**: `Pending`
  - **Completed At**: —

- [ ] **`REC-19` [Coverage] Universal Company Career Page Crawler**
  - **Issue**: Locked to public aggregators; misses direct unlisted roles on company career subdomains.
  - **Action**: Generic ATS crawler capable of scraping Greenhouse/Lever/Ashby/Workday career portals.
  - **Target Files**: `src/lib/discovery/crawlers/`
  - **Status**: `Pending`
  - **Completed At**: —

- [ ] **`REC-20` [Ecosystem] Cross-Agent Orchestration Bus**
  - **Issue**: Discovery Agent, Resume Agent, Interview Agent, and Application Agent are disconnected silos.
  - **Action**: Implement shared memory and event bus where discovery data informs resume tailoring, interview prep, and application execution.
  - **Target Files**: `src/lib/ai/graph/workflow.ts`, `src/lib/ai/agent-bus.ts`
  - **Status**: `Pending`
  - **Completed At**: —

---

## 🗄️ Database Architecture Migration Tracker

Tracking schema additions for the recommended canonical data model:

| Entity Name | Description | Status | Migration File |
|:---|:---|:---:|:---|
| `JobSource` | Monitors crawler source health, failure rates, and configs | ⚪ Not Started | — |
| `CanonicalJob` | Source-agnostic normalized job catalog with dedup fingerprinting | 🟢 Completed | `prisma/schema.prisma` |
| `UserJobMatch` | Per-user multi-dimensional scores, ATS metrics, and dismiss reasons | 🟢 Completed | `prisma/schema.prisma` |
| `UserDiscoveryPreference` | Explicit and behaviorally learned preference weights | ⚪ Not Started | — |
| `DiscoveryEvent` | High-frequency telemetry stream for user interaction tracking | 🟢 Completed | `prisma/schema.prisma` |

---

## 📝 Audit Change Log & History

*Record every update here chronologically.*

| Date | Item ID | Changes Made & Impact | Files Modified | Author / Agent |
|:---|:---:|:---|:---|:---:|
| 2026-09-04 | `INIT` | Initialized comprehensive Job Discovery Audit (`docs/JOB-DISCOVERY-AUDIT.md`) and living tracker (`docs/JOB-DISCOVERY-TRACKER.md`). | `docs/JOB-DISCOVERY-AUDIT.md`, `docs/JOB-DISCOVERY-TRACKER.md` | Staff AI Architect & PM Team |
| 2026-09-04 | `REC-01`, `REC-02`, `REC-05`, `DB-MIG` | Replaced legacy `DiscoveredJob` with clean normalized `CanonicalJob` & `UserJobMatch` data model. Decoupled scraping from synchronous HTTP request flow to background Inngest crawler and seed script. Enabled sub-50ms non-blocking cold-start with `syncing: true` response. Implemented remote-aware, punctuation-cleaned SHA-256 fingerprint deduplication. Added dismiss reason tracking in schema & POST route. | `prisma/schema.prisma`, `src/lib/discovery/matching.ts`, `src/lib/discovery/scrapers.ts`, `prisma/seed-discovery.ts`, `src/inngest/functions/batch-job-pipeline.ts`, `src/app/api/jobs/discover/route.ts`, `src/lib/ai/graph/tools/discovery-tools.ts`, `src/app/api/inngest/route.ts`, `src/__tests__/batch-job-pipeline.test.ts` | Antigravity AI |
| 2026-09-04 | `REC-03`, `REC-04` | Implemented Upstash Redis distributed sliding window rate limiting on GET /api/jobs/discover (45 req/min), manual refresh (5 req/min), and POST mutations (30 req/min). Built heuristic rule-based scam & fraud detection engine (`evaluateJobScamRisk`) identifying advance fees, anonymous messengers, phishing shorteners, and absurd salaries; persisted `scamScore` and automatically disqualified listings with `scamScore >= 0.6`. | `src/lib/discovery/matching.ts`, `src/lib/discovery/types.ts`, `src/lib/discovery/scrapers.ts`, `src/lib/ai/graph/tools/discovery-tools.ts`, `src/app/api/jobs/discover/route.ts`, `src/__tests__/scam-detection.test.ts` | Antigravity AI |
| 2026-09-04 | `REC-06`, `REC-08`, `DB-MIG` | Recalibrated match score formula from compressed 50-88% to uncompressed 1-99% using balanced 100-point rubric (Skills 40, Role 25, Location 20, Seniority 15) with transparent factor breakdown in match rationale. Updated frontend score badge thresholds (90%+ Emerald Top Pick, 75-89% Sky Strong, 50-74% Amber Moderate, <50% Zinc Low) and filter boundaries. Added `DiscoveryEvent` model in database. Implemented non-blocking fire-and-forget telemetry (`logDiscoveryEvent`) across discovery pipeline and added conversion funnel analytics (`getDiscoveryFunnelMetrics` & GET `/api/jobs/discover/analytics`). | `src/lib/ai/graph/tools/discovery-tools.ts`, `src/lib/discovery/types.ts`, `src/components/discovery/types.ts`, `src/components/discovery/DiscoveryFilterSidebar.tsx`, `src/components/discovery/DiscoveryPage.tsx`, `prisma/schema.prisma`, `src/lib/discovery/telemetry.ts`, `src/lib/telemetry.ts`, `src/app/api/jobs/discover/route.ts`, `src/app/api/jobs/discover/analytics/route.ts`, `src/inngest/functions/batch-job-pipeline.ts`, `src/__tests__/discovery-telemetry.test.ts`, `docs/JOB-DISCOVERY-TRACKER.md` | Antigravity AI |
| 2026-09-04 | `REC-07` | Integrated direct Greenhouse (`boards-api.greenhouse.io`) and Lever (`api.lever.co`) unauthenticated public JSON endpoints into Discovery ingestion. Implemented strict `TECH_ROLE_FILTER_REGEX` to filter out non-engineering/HR/sales clutter, multi-word tag extraction with Knowledge Graph canonicalization, and resilient error/timeout handling. Connected into both multi-board live query search (`fetchMultiBoardOpportunities`) and catalog deep crawler (`ingestGlobalJobsToCatalog`). Added UI source filter badges and options for Greenhouse & Lever. Created comprehensive unit test suite (`src/__tests__/greenhouse-lever.test.ts`). | `src/lib/discovery/types.ts`, `src/components/discovery/types.ts`, `src/components/discovery/DiscoveryFilterSidebar.tsx`, `src/lib/discovery/scrapers.ts`, `src/lib/ai/knowledge-graph.ts`, `src/__tests__/greenhouse-lever.test.ts`, `docs/JOB-DISCOVERY-TRACKER.md` | Antigravity AI |
| 2026-09-04 | `REC-05`, `REC-14` | Implemented "Top Picks" spotlight showcase (`DiscoveryTopPicks.tsx`) with linear architectural blueprint layout, DecorIcon (+) crosshairs, Zap icon badges, and graceful degradation (cleanly omitted when no 90%+ match exists). Implemented interactive 1-click dismissal modal (`DiscoveryDismissModal.tsx`) with 6 structured rejection reasons (`wrong_role`, `wrong_location`, `bad_salary`, `bad_company`, `unqualified`, `not_interested`), optimistic UI updates, 5-second Sonner undo toast, and server undismiss syncing. Zero Sparkles icons used. Added test suite `src/__tests__/discovery-ui-dismiss.test.ts`. | `src/components/discovery/DiscoveryDismissModal.tsx`, `src/components/discovery/DiscoveryTopPicks.tsx`, `src/components/discovery/DiscoveryJobList.tsx`, `src/components/discovery/DiscoveryPage.tsx`, `src/__tests__/discovery-ui-dismiss.test.ts`, `docs/JOB-DISCOVERY-TRACKER.md` | Antigravity AI |



