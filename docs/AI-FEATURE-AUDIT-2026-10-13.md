# CareerTrack AI feature audit

Audit date: 2026-10-13 (Asia/Dhaka). Decision: **NOT READY**.

Scope: current working tree, including pre-existing uncommitted email changes. This is a code and local automated-check audit, not a production penetration test or a measurement of live model accuracy. No application code, database records, provider settings, or existing changes were modified. The only additions are this report and offline characterization tests in `artifacts/ai-audit-2026-10-13/reproduction.test.ts`.

## Method and acceptance criteria

Applied skill: `.agents/skills/langfuse/SKILL.md`, for evaluation, observability and failure analysis. Read the repository Engineering Operating System in `AGENTS.md`. The separate trace annotation/evaluator setup workflows were not invoked: this request is an audit, not creation of online evaluators or human annotation queues.

Acceptance criteria: inventory the main AI paths; trace authenticated requests through reads/writes; review tenant isolation, tool approval, factual grounding, provider routing, fallbacks, telemetry privacy and costs; run TypeScript, lint, tests and build; reproduce material defects without calling paid models or mutating live data; document evidence, priority, repair criteria and verification limits. No live Langfuse traces or provider generations were sampled, so production quality/latency claims remain unverified.

## Feature map

| Feature | Main path | Assessment |
| --- | --- | --- |
| Contextual Career Copilot | `api/agent/run` → planner → executor → reflector/replanner → responder | Tool schemas, tenant-scoped context and HITL exist; endpoint fails open on session DB errors; no admission rate limit |
| Resume tailoring | `api/resumes/tailor`; `graph/tools/resume-tools.ts` | Two divergent implementations; generated tool resume contains fabricated defaults and lacks Application ownership |
| JD analysis | `api/ai/scan-jd`; `api/discovery/evaluate` | Unified discovery path checks Application ownership; legacy scan path does not |
| Discovery ranking and packages | `discovery/ai-reranker.ts`; `cover-letter-agent.ts`; `squad/orchestrator.ts` | Bounded reranker and structured schema exist; grounding is incomplete and critic failure does not necessarily block outputs |
| Outreach | `applications/[id]/outreach`; `graph/tools/email-tools.ts`; `ai/send-email` | Send tool requires confirmation and is blocked headless; draft defaults and conversion scores can misrepresent evidence |
| Interview coaching and reporting | `ai/mock-interview/report` → `graph/workflows/interview-coach.ts` | Cross-tenant write and invented offline assessment contaminate analysis/memory |
| Study and prep assistant | `ai/study-assistant`; `ai/prep-chat` | Resilient generation exists; study payload uses a TypeScript interface instead of runtime schema |
| Career memory and adaptive learning | `memory.ts`, `knowledge-graph.ts`, `learning-engine.ts` | User scoping and cache exist; evidence verification provenance is weak and some reads are unbounded |
| Background orchestration/follow-ups | Inngest orchestrator, headless graph, proactive daemon | Retries and step execution exist; mutation replay/notification dedup are incomplete |
| Observability | `telemetry.ts`; `graph/telemetry.ts` | Regular generation masks strings; graph tracing does not use that masking path; no production quality gate was identified |

## Findings, ordered by repair priority

### AI-01 — P1: cross-tenant ApplicationAnalysis writes

Evidence: `src/lib/ai/graph/workflows/interview-coach.ts:373`, `:378`, `:383`; `src/app/api/ai/mock-interview/report/route.ts:220`, `:269`; `src/app/api/ai/scan-jd/route.ts:159`, `:165`, `:200`. The report route passes the client Application ID into the graph before its later owned-Application lookup. A failed owned dossier lookup is swallowed; longitudinal tracking then updates/creates analysis using only Application ID. The legacy JD scanner similarly reads/writes supplied IDs without ownership verification. Knowing another user's ID is sufficient to target that record; authentication does not provide authorization.

Reproduced offline: dossier lookup rejects with “Not owned”, yet the graph updates `foreign-application`. Fix: resolve `{ id, userId }` before graph execution or generation and reject absent/foreign records; carry only the verified ID; repeat ownership constraints at mutation boundaries. Acceptance: malicious IDs cause 404/403 and zero analysis, Application or memory writes; normal owned requests still work. Add route integration tests for both endpoints.

### AI-02 — P1: URL scraper SSRF guard can be bypassed

Evidence: `src/lib/ssrf.ts:13`; `src/app/api/ai/scrape-url/route.ts:21`, `:28`, `:44`. The guard examines hostname strings only, accepts IPv4-mapped IPv6 loopback, does not resolve DNS, and fetch follows redirects without revalidating destinations. Header-only size checks permit an oversized chunked body to be fully allocated before truncation.

Reproduced offline: `http://[::ffff:127.0.0.1]/` is accepted. Redirect/DNS exploitation was not exercised against internal services. Fix: normalize IPs including mapped addresses, validate resolved addresses and every redirect hop, apply egress restrictions, and cap streamed bytes. Acceptance: mapped loopback, private DNS targets, private redirect targets and bodies over the cap are rejected before internal access or unbounded allocation.

### AI-03 — P1: fabricated resumes and outreach are presented as candidate facts

Evidence: `src/lib/ai/graph/tools/resume-tools.ts:159`, `:177`, `:184`, `:192`, `:221`, `:246`; `src/lib/ai/graph/tools/email-tools.ts:73`; `src/app/api/resumes/tailor/route.ts:161`, `:252`. The agent resume tool builds deterministic achievements, skills, projects and education even with no resume/profile. It checks no grounding audit. It reads nonexistent profile shapes (`recentRoles`, `projects`, `education`, `university`) through `any`, pushing normal users toward invented defaults. The draft email tool substitutes a project and default stack and claims the candidate built them. The separate resume endpoint places a fake phone in the prompt and accepts model JSON by type assertion rather than validating facts and structure.

Reproduced offline: with no profile/resume, the tool succeeds and saves TypeScript, experience and a project. Fix: require verified source evidence, omit missing sections, bind claims to source facts, and validate output before preview/save. Do not replace missing accomplishments with templates asserting accomplishments. Acceptance: empty evidence yields an actionable missing-data state; every employer/date/credential/technology/metric is supported by candidate sources.

### AI-04 — P1: provider outages create false interview results and persistent weaknesses

Evidence: `src/lib/ai/graph/workflows/interview-coach.ts:268`, `:271`, `:276`, `:348`; `src/app/api/ai/mock-interview/report/route.ts:34`, `:82`, `:263`, `:291`. The graph's offline score uses answer length, clamps it to 60–92 and invents strengths, STAR evidence and knowledge gaps. The route's last fallback always returns “Hire”, 78 overall, 80 technical and 76 clarity. These outputs are persisted and may feed future advice as if evaluated.

Reproduced offline: “I do not know” with the provider offline still receives positive technical strengths and writes gap memory. Fix: return an explicit evaluation-unavailable state, preserve transcript for retry, and prevent synthetic scores/gaps from updating analysis/memory. Acceptance: outages and malformed model output never manufacture an assessment; only validated successful evaluations enter longitudinal memory.

### AI-05 — P1: factual grounding allows unsupported claims

Evidence: `src/lib/ai/factual-grounding.ts:96`, `:261` and metric validation following `:340`. The validator extracts a technical vocabulary and selected numeric patterns; it does not verify employment, duration, degree or company claims. Unsupported percentages below 80 and modest numeric claims can escape. Large-scale checks compare against a default maximum of 10,000 even when no evidence exists. A result can therefore announce 100% grounding with no factual support.

Reproduced offline: “I worked at Acme for five years and reduced latency by 35%.” with `{}` returns `isFullyGrounded: true`. Fix: verify all factual claim categories against explicit evidence; unknown means unverified; keep formatting heuristics separate from factual verification. Acceptance: the reproduced statement is rejected, and verified statements with source references pass. Never label vocabulary checks “100% factual grounding”.

### AI-06 — P1: session ownership protection fails open on DB errors

Evidence: `src/app/api/agent/run/route.ts:70`, `:113`, `:270`, `:277`. A successful lookup rejects foreign sessions, but its broad catch logs errors and continues. Checkpoint threads use the client session ID alone. A resumed command relies on checkpoint state rather than supplying/rechecking authenticated ownership. Under an ownership lookup failure, this removes the authorization barrier to an existing checkpoint. The separate lookup/upsert also permits a race on a shared newly created ID.

Static finding; no live checkpoint attack attempted. Fix: fail closed, atomically establish owned sessions, use user-bound checkpoint namespaces, and verify checkpoint user before resume. Acceptance: DB failure returns 503 with zero graph invocations; foreign/replayed resume requests cannot access state or run tools.

### AI-07 — P1: native Anthropic configuration uses the wrong agent adapter

Evidence: `src/lib/ai/graph/llm.ts:49`. Both Anthropic variants instantiate `ChatOpenAI`; native Anthropic with no proxy URL therefore uses the OpenAI endpoint with an Anthropic key and Claude model name. An OpenAI-compatible proxy is a separate configuration case. This path does not call the application's resilient provider cascade.

Static finding, not a paid live provider call. Fix: use a native Anthropic adapter for native keys and the OpenAI adapter only for explicitly compatible gateways; bound request timeouts and test transport routing. The native Claude contract uses `/v1/messages`: [official API reference](https://platform.claude.com/docs/en/api/overview).

### AI-08 — P2: graph traces bypass telemetry PII masking

Evidence: `src/lib/ai/graph/telemetry.ts:94`, `:160`, `:161`; compare `src/lib/ai/telemetry.ts:42`. Graph callbacks trace model inputs automatically, and manual spans forward raw input/output. Profile names, notes, email/tool payloads and memory content can reach observability through this separate path even though ordinary generation traces recursively mask strings. Whether production tracing is enabled was not verified.

Fix: apply a common recursive redaction policy to spans and callbacks, define sensitive fields, retention and consent; verify with a fake exporter. Acceptance: seeded emails/phones/secrets never appear in emitted events. [Langfuse masking documentation](https://langfuse.com/docs/observability/features/masking) describes the supported privacy control.

### AI-09 — P2: generated scores imply quality that was not evaluated

Evidence: `src/lib/ai/evaluator-optimizer.ts:273`, `:285`, `:311`; `src/app/api/applications/[id]/outreach/route.ts:534`; `src/app/api/resumes/tailor/route.ts:134`. A missing or failed semantic judge can still produce `passed: true` and a fabricated conversion score of 88/82; outreach also defaults to 92/88. A no-overlap/no-tag resume path has a positive match floor rather than an unknown or zero-evidence score. These are not calibrated hiring probabilities.

Reproduced offline: thrown judge error → passed true, score 88, no judge result. Fix: mark quality unavailable on judge failure; use a separately named heuristic score when there is actual evidence; calibrate against labeled outcomes. Acceptance: no evaluation → no conversion score, and deterministic fit reflects its evidence and uncertainty.

### AI-10 — P2: tailored assets are not consistently Application-owned

Evidence: `src/lib/ai/graph/tools/tool-manifest.ts:129`; `src/lib/ai/graph/tools/resume-tools.ts:246`; `prisma/schema.prisma:127`. The agent's tailoring input has no Application ID and creates a standalone user Resume. It cannot satisfy the repository rule that application assets belong to an Application. The parallel API returns a preview without establishing Application asset ownership.

Fix: require an owned Application for durable tailored assets and persist through its analysis/asset relation; keep a clearly transient preview mode if needed. Acceptance: downloading/removing an Application package follows that Application's ownership and lifecycle, with no orphaned package assets.

### AI-11 — P2: execution admission, cancellation and replay are incomplete

Evidence: `src/app/api/agent/run/route.ts:21`, `:304`, `:520`; `src/components/ai/AIChat.tsx:806`; `src/lib/ai/graph/tools/job-tools.ts:27`; `src/inngest/functions/agent-proactive-daemon.ts:63`, `:75`. Main agent requests have no rate-limit import/admission quota or per-session execution lock. UI stop aborts the client stream while server graph execution continues by design, including mutations. CreateApplication uses read-then-create without a uniqueness constraint; repeated concurrent calls can duplicate records. A stale application with no analysis gets a notification without saving a draft/dedup marker and will be notified again on subsequent runs.

Fix: distributed quotas/concurrency, explicit server job cancel/state semantics, atomic mutation idempotency and durable notification dedup. Acceptance: concurrent identical actions produce one effect; retries do not send or stage twice; stop clearly distinguishes stopping display from cancelling work; missing-analysis follow-ups remain usable and deduplicated.

### AI-12 — P2: unbounded reads and fragile checkpoint degradation limit scale

Evidence: `src/lib/ai/learning-engine.ts:60`; `src/lib/ai/graph/tools/profile-tools.ts` (`executeGetUserMemories`); `src/lib/ai/graph/checkpointer.ts:74`. Learning reads every user's application with complete analysis/company/status history; the memory tool returns all matching memories including embeddings. The graph checkpointer caches MemorySaver permanently after a setup failure, with no recovery path or durable resume warning. No checkpoint cleanup/TTL path was identified in inspected code.

Fix: aggregate/select/limit queries; exclude embeddings from normal tool results; cap prompt bytes/tokens before generation; retry durable checkpoint initialization safely; track degradation and enforce retention. Acceptance: bounded response/context sizes for a 10,000-application fixture; restart/resume tests verify durable state and explicit unavailable behavior.

## Verification evidence

| Check | Observed result |
| --- | --- |
| `npx tsc --noEmit` (initial tree and final post-build tree) | Both pass, exit 0 |
| `npm run lint` | Pass, exit 0; four existing warnings in DiscoveryPage, use-job-discovery and discovery/scoring |
| `npm test -- --reporter=dot` | 139 files pass / 1 fails; 952 tests pass / 1 PDF layout test times out at 5 seconds |
| Isolated PDF rerun plus first four reproductions | 7/7 pass; PDF test takes ~897ms. Initial timeout is not reproduced in isolation; full-suite instability remains recorded |
| `npx vitest run artifacts/ai-audit-2026-10-13/reproduction.test.ts --reporter=verbose` | 5/5 pass; these confirm existing defects and deliberately assert unsafe current behavior, not release acceptance |
| `npm run build` | Fails during Prisma generation: Windows EPERM renaming query engine DLL; no code failure established by this command |
| `npx next build` | Pass, exit 0; compiled, checked types/lint, generated 72 static pages and collected build traces using existing Prisma client |

A second TypeScript run overlapped Next's deletion/regeneration of `.next/types` and produced TS6053 missing generated-file errors. This is a verification scheduling artifact; final TypeScript verification is run after the build. Do not parallelize this repository's standalone tsc with a build that rewrites `.next/types`.

## User journeys and adversarial QA

| User/scenario | Intended outcome | Actual evidence |
| --- | --- | --- |
| New user, no verified resume | Upload/confirm facts before tailoring | Reproduction saves an invented resume |
| Normal user, provider outage during interview | Transcript preserved; retry evaluation | Positive synthetic score/gaps can be persisted |
| Returning user, foreign Application ID | Request rejected before reads/writes | Mocked graph updates foreign analysis; scanner has same ownership gap |
| Power user, parallel tool turns/retry | One action and stable session | Missing locking/atomic uniqueness is a static race risk |
| User stops response | Understand whether work stops | Client aborts; server deliberately continues |
| Malicious user, mapped local URL | Reject before fetch | URL guard accepts mapped loopback |
| User expects judged outreach quality | Validated score or unavailable state | Judge exception yields synthetic 88 score |

These are code simulations and mocked tests. Browser mobile/light-dark/accessibility, real refresh/HITL resume, production provider output and Inngest retry delivery were not exercised. UI code includes contextual sidebar, structured result components, accessible send/stop labels, and responsive sizing; this is insufficient evidence for a full visual UX pass. `src/components/ai/ChatMessage.tsx:1391` renders “Agent Execution Plan” and `:1379` renders reasoning when present, conflicting with the repository's outcomes-first/no-visible-agent-logs requirement; use outcome summaries and disclose technical detail only outside the main user journey.

## Performance, persistence and technical debt review

- **DB impact:** useful tenant/status/time indexes exist on Application, memories and matches. The learning and memory read paths are still unbounded; rows/index usage were not measured with EXPLAIN. Ownership checks must precede all writes. ApplicationAnalysis's unique Application ID does not enforce tenant authorization.
- **Network impact:** production build reports First Load JS of 401 kB for `/ai-assistant`, 382 kB for `/interview-prep` and 369 kB for `/discovery`; shared JS is 202 kB. These are build bundle sizes, not measured API responses. Graph endpoint serializes every node update and final interrupt state, while tool outputs can include full records. No production API payload KB measurements exist; record P50/P95 bytes and cap tool/SSE payloads. Model cascade can multiply provider round trips; main graph lacks equivalent cascade/budget controls.
- **Render impact:** chat batches token display through requestAnimationFrame and uses context-specific results. Re-render counts, CLS, screen-reader behavior and mobile usability were not measured.
- **Memory impact:** complete history/analysis/embedding reads, full scraped body allocation, and MemorySaver checkpoint accumulation are growth risks. Persistent checkpoint retention and deletion on session/account lifecycle need explicit verification.
- **Existing debt:** duplicated resume/JD/telemetry execution paths; extensive `any` hides nonexistent profile fields; synthetic fallbacks are mixed with real assessments; quality scoring and tracing exist without an identified labeled-data regression gate.
- **Introduced debt:** no runtime changes. Reproduction tests are audit characterization artifacts and must be replaced/updated when defects are repaired; they must not be treated as acceptance tests.

## Recommended repair sequence and release gates

1. Close AI-01 and AI-06 tenant boundaries, then AI-02 outbound fetch boundaries. Add unauthorized/foreign-ID/DB-failure integration tests.
2. Close AI-03/04/05 factual integrity: evidence-required materials, validated schemas, no synthetic assessments, and no unverified memory writes.
3. Repair native provider routing, telemetry privacy and truthful quality signals (AI-07/08/09).
4. Consolidate owned asset persistence; add atomic idempotency, concurrency/cancellation semantics and bounded reads (AI-10/11/12).
5. Create a labeled regression set for empty evidence, contradictory facts, Bangla/Banglish intents, prompt injection, malformed JSON, provider outages and tenant boundaries. Measure unsupported-claim rate, task success, invalid-write rate, approval bypasses, degradation disclosure, P95 latency/cost and candidate outcome usefulness. Calibrate any LLM judge against human labels before using it as a release gate.

## Engineering workflow record

1. Requirement analysis: AI feature audit, current tree, read-only runtime scope; external/model access intentionally excluded from local reproductions.
2. Acceptance criteria: documented above; findings require code evidence and repair criteria.
3. Journeys: normal/new/returning/power/adversarial cases mapped above.
4. Implementation: audit artifacts only; production fixes are outside this audit request.
5. Static analysis: actual tsc/lint/build executions recorded.
6. Tests: full existing suite plus five isolated mocked defect reproductions; no new feature behavior introduced.
7. Break-feature QA: foreign IDs, outage, empty evidence, judge error and mapped loopback tested/reviewed.
8. User simulation: offline scenarios documented; live-browser/model journeys remain unverified.
9. Technical debt: duplicate paths, loose types, unbounded reads and dishonest fallbacks documented.
10. Release review: blocker findings prevent release readiness regardless of compilation success.

### Release Readiness Report

Scores are audit judgments of inspected code, not benchmark results.

- **Architecture Score**: 61/100
- **Security Score**: 35/100
- **Performance Score**: 55/100
- **Maintainability Score**: 52/100
- **Potential Risks**: cross-tenant writes/checkpoint access under DB failure; SSRF; invented candidate facts/assessments; unmasked graph telemetry.
- **Potential Bottlenecks**: unbounded application/memory reads, sequential provider retries, repeated graph payloads and persistent checkpoint growth.
- **Technical Debt Introduced**: no application changes; characterization artifacts need updating as defects are repaired.
- **Future Scaling Concerns**: distributed admission and locking, atomic side-effect dedup, bounded aggregates/context, durable checkpoint recovery/retention and evidence-based quality gates.

**Decision**: NOT READY

### Final verification update

`npx next build` passed with the existing Prisma client. `npm run build` remains blocked at Prisma regeneration by the Windows DLL lock; these outcomes are distinct. Final standalone `npx tsc --noEmit` passed after build completion, including the audit test artifact. Audit reproductions also pass `npx eslint --no-ignore artifacts/ai-audit-2026-10-13/reproduction.test.ts` with no findings. Production code blockers remain unresolved by design: this request was an audit.

### Repair follow-up — 2026-10-13
The findings above describe the pre-repair code and remain a historical audit record. AI-01 through AI-12 now have source repairs and regression evidence: 979 unit/integration tests passed, four browser checks passed, TypeScript/lint/production build passed (four existing lint warnings). See [AI repair and release review](./AI-REPAIR-REPORT-2026-10-13.md) for the repair matrix, verification artifacts, remaining production validation limits and READY FOR REVIEW decision. The previous Prisma DLL-lock limitation was resolved in the repair verification: `npm run build` passed.
