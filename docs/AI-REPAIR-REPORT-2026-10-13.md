# AI audit repair execution record

Date: 2026-10-13 (Asia/Dhaka). Status: READY FOR REVIEW. AI-01 through AI-12 have repairs and passing verification evidence.

## 1. Requirements
Repair AI-01 through AI-12 in the audit, plus visible execution logs. Preserve existing email work. Scope includes shared SSRF, AI helpers, graph, routes, Inngest, result UI and regression tests. Risks: consumer contracts, provider failure behavior, missing candidate facts, multi-worker concurrency and checkpoint lifecycle. No deployment or destructive data repair.

## 2. Acceptance criteria
- Foreign/missing Application and session IDs and failed ownership lookups cause zero model/tool writes.
- Public fetch validates DNS, redirect hops, mapped IPs and caps streamed body bytes.
- Empty evidence never fabricates resume, outreach or interview results; all numeric claims require evidence.
- Native Anthropic uses native transport; tracing exports only sanitized content.
- Unknown quality has no invented conversion/ATS probability.
- Durable packages belong to an owned Application; previews are transient.
- Concurrent agent sessions reject overlap; application creation and follow-up notification retries are idempotent.
- Bounded reads/context and recoverable durable checkpoint initialization prevent unbounded growth.
- Unit/integration/E2E regression checks, tsc, lint and build execute before readiness review.

## 3. User journeys and UI protocol
Normal: select owned Application, use verified candidate facts, generate/preview/save a package. New user: missing evidence prompts profile/resume setup. Provider outage: preserve interview transcript for retry with evaluation unavailable and no invented score. Returning user: durable session resumes only under same authenticated owner. Power user: concurrent/replayed requests cause one effect. Malicious user: foreign IDs/private redirects/injected payloads are rejected. User stops viewing a response: copy explicitly states work may continue rather than promising cancellation.

Purpose: help a user prepare an honest application package. Primary action: Generate package. Outcome: verified materials and clear next action. Wireframe:
```text
[Application + candidate evidence]
[Generate package]
[Preview / Evaluation unavailable]
[Next action]
```

## 4. Implementation and audit closure map

| Finding | Repair | Evidence / regression surface |
| --- | --- | --- |
| AI-01: foreign Application writes | Shared owner check before model work, reads and writes in JD scan, interview and resume paths | Tenant isolation, interview ownership and repair tests |
| AI-02: SSRF bypasses | DNS-pinned HTTP(S), public-address validation at every redirect, ports 80/443, deadline and 2 MB streamed body limit | `safe-public-fetch.test.ts`; mapped IPv6, mixed DNS, redirect, content-length and streaming cases |
| AI-03: invented candidate facts | Shared resume builder copies supplied facts; removed fabricated work/education/metrics and outreach defaults; legacy synthetic resumes cannot become evidence | Resume, outreach, package and grounding regressions |
| AI-04: fake interview fallback | Validated model reports; unavailable provider produces an unevaluated transcript with null score and retry information | Report outage and conversation regressions; assistant/user roles preserved |
| AI-05: weak factual gate | Unsupported numbers, employment, duration, credentials and accomplishments blocked; learning goals/weaknesses excluded from positive evidence; Bengali numeric claims covered | Factual grounding, squad and repair regressions |
| AI-06: session fail-open | Database errors deny access; ownership rechecked after create; owner-prefixed checkpoint threads; native pending approval required, approved edits validated | Session DB-failure, foreign-owner and approval-edit tests |
| AI-07: Anthropic transport | Native `ChatAnthropic` for Anthropic endpoints; bounded retries/timeouts | Actual model-class construction regression, no paid live generation |
| AI-08: private traces | Recursive free-text redaction at manual spans and SDK export boundary; raw automatic graph callbacks removed | Unit test plus emitted observation read through Langfuse CLI; private seed absent |
| AI-09: fabricated scores | Unknown fit/quality stays null; 0 stays 0; skill overlap labelled honestly; legacy unproven quality hidden | Resume, evaluator, package and UI tests |
| AI-10: detached/lost assets | Durable assets require owned Application; transient previews stay transient; atomic owner-checked JSONB patch preserves independent assets; saved resume review available | Persistence tests and execution of production SQL in isolated PostgreSQL-compatible PGlite |
| AI-11: duplicate/costly execution | Distributed agent quota, per-user DB execution lease, bounded graph execution; application-create lock, notification marker transaction and delivery receipt deduplication; stop-viewing copy describes behavior accurately | Lock, quota/tenant, retry, approval, notification and delivery tests |
| AI-12: growing memory/checkpoints | Bounded reads and model context; fail-closed durable checkpoint setup with retry; settled threads retain two snapshots per namespace and referenced blobs; headless graphs do not persist checkpoints | Learning/context tests; actual retention SQL exercised against isolated tables |

The corresponding source files are under `src/lib/ai`, the affected AI/application/resume routes, `src/lib/discovery/cover-letter-agent.ts`, the proactive daemon and result components. Existing mail repairs remain intact. No schema migration, customer-data cleanup or deployment was performed.

## 5–6. Static analysis and automated verification

Final command evidence is recorded below. Logs, regression reproductions, synthetic trace receipt and browser screenshots live under `artifacts/ai-audit-2026-10-13`.

- Full Vitest suite: **979 passed, zero failed, 144 files**, exit 0. Command: `npx vitest run --maxWorkers=2 --reporter=json --outputFile=artifacts/ai-audit-2026-10-13/release-verified-tests.json`.
- ESLint: zero errors, four existing warnings in DiscoveryPage, use-job-discovery and scoring.
- Production build: `npm run build` **exit 0**, Prisma generation and optimized Next.js build passed, 72 pages generated. Final log: `verified-build.log`.
- TypeScript: `npx tsc --noEmit` **exit 0**, executed after build and again after browser checks; log: `verified-tsc.log`.
- Browser: `npx playwright test --config=playwright.ai-audit.config.ts` **four passed**, desktop light/mobile dark with explicit theme assertions. Mocked auth and agent stream against the real UI; log: `verified-browser.log`. Screenshots visually inspected in both themes.
- `git diff --check`: exit 0; existing Windows line-ending notices are informational.
- Actual PostgreSQL-compatible SQL execution: asset merges preserve resume/outreach/follow-up fields, deny foreign-owner writes; retention preserves current referenced blobs and leaves another thread untouched.
- Actual exported Langfuse observation inspection: two synthetic observations checked; redaction verified; raw private seed absent. No real candidate data was used.

## 7. Adversarial QA

Rejected foreign/missing Application IDs, database ownership failures, overlapping runs, forged approval metadata, oversized context, malformed report/resume schemas, unsupported numeric achievements, mapped/private IPs, mixed DNS answers, private redirect targets and oversized streamed pages. Provider outage keeps a retryable unevaluated interview rather than creating skills/weaknesses from an invented assessment. Ambiguous email dispatch retains its receipt and requires sent-mail inspection instead of risking a duplicate send. No recruiter email was sent during verification.

## 8. User simulation and UI review

New users without evidence receive an actionable setup error. Returning users can resume only their own saved session. Application users can review their saved resume package, with no hard-coded ATS percentage. Concurrent users receive a busy response without a second action. Approved payload edits reach the tool rather than silently reverting to the original proposal. AI cards show useful outcomes and next actions, with raw graph plans/reasoning removed. Stream disconnection stops viewing; requested server-side actions may continue, as explicitly labelled.

Browser checks use real rendered components with mocked identity/API responses; they do not establish live provider accuracy, production authorization configuration or cross-worker throughput. Theme selection is explicitly asserted. Shared primitives, semantic tokens and existing geometry were retained; no prohibited icon or gradient was introduced.

## 9. Technical debt and performance review

- DB read path: learning history capped at 200 records, memory retrieval at 30, narrow selected fields and database aggregates replace unbounded count reads. Ownership uses existing Application/user identity queries. No new indexes required by these changes; production query plans were not benchmarked.
- DB write path: parameterized SQL merges assets under the existing unique ApplicationAnalysis applicationId constraint. Advisory locks coordinate workers; notification and marker update share a transaction.
- Network: public fetch maximum 2 MB; resume JD limit 30,000 characters; asset patches maximum 150,000 characters; model context maximum 96,000 characters/16,000 estimated tokens and output budget 4,096 tokens. Character limits are not claims about measured compressed network KB.
- Render: removed execution/reasoning UI; saved resume preview is loaded on demand. Mobile overflow checked in browser. Production build reports 402 kB first-load JS for `/ai-assistant`, 353 kB for `/applications/[id]`, 202 kB shared. Re-render counts and real-user layout-shift metrics were not profiled; bundle size remains a future optimization target.
- Memory/growth: checkpoint snapshots bounded per settled thread, referenced blobs retained, delivery receipts expire after 24 hours; dev receipt map bounded at 1,000 entries. Old inactive threads remain until deleted; no historic customer state was destructively purged.
- Maintainability: common owner check, resume schema/builder, asset merge, bounded fetch, telemetry redactor and execution/delivery helpers replace duplicated unsafe behavior. Tests enforce behavioral boundaries rather than assuming provider success.
- Debt introduced: per-user stream lease occupies a Prisma connection for up to 150 seconds; deployment pool sizing and cross-worker load testing remain necessary. An ambiguous send is intentionally not retried automatically. Factual checks are conservative and may reject honest paraphrases; they do not establish the truth of user-supplied facts.

## 10. Release readiness review

All twelve audit findings have source repairs and passing regression verification. Architecture, UX, reliability and maintainability review supports **READY FOR REVIEW**. Production load/provider-quality verification and baseline dependency triage remain outstanding, so this report does not assert production-wide release readiness. Scores below are engineering judgments of this repair scope, not measured benchmarks.

### Release Readiness Report
- **Architecture Score**: 88/100
- **Security Score**: 86/100
- **Performance Score**: 80/100
- **Maintainability Score**: 87/100

- **Potential Risks**: User-provided facts need user review; regex grounding is not a formal guarantee. Raw-text resumes do not infer experience/education sections. Native Anthropic transport was verified without a paid live response. Existing dependency vulnerabilities and four lint warnings remain outside the twelve audit findings.
- **Potential Bottlenecks**: Connection occupancy for execution leases, provider latency and conservative factual rejection.
- **Technical Debt Introduced**: Transaction-backed stream lease requires pool-capacity review; existing Langfuse SDK v3 needs a separately tested migration as upstream legacy read APIs retire.
- **Future Scaling Concerns**: Cross-worker load tests, pool monitoring, inactive-session retention policy and provider-quality evaluation on real approved datasets.

**Decision**: READY FOR REVIEW
