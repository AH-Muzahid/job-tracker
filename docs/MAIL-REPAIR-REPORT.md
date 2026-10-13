# Mail repair — 2026-10-13

## 1. Requirement analysis
Repair the daily briefing shown in the report and audit shared outbound mail paths: daily/weekly digests, interview reminders, outreach API, connected Gmail, and shared HTML rendering. No schema change or live email dispatch is required. Dependencies: user preferences, application/match records, configured AI provider, Resend/Gmail, Inngest memoized steps. Risks: duplicate sends on retries, misleading delivery state, injected content, inconsistent counts, client rendering differences.

## 2. Acceptance criteria
- Briefings use a read-only model call; planner errors never appear as recommendations.
- Missing/failed AI produces actionable recommendations from measured pipeline facts.
- Counts and notifications use the same preference-filtered opportunity shortlist; active applications include interviews.
- All metadata is escaped; external links accept only HTTP(S) without embedded credentials.
- Placeholder salary “Range” is suppressed; unknown locations are not invented as remote.
- Daily, weekly, and interview emails honor the persisted email opt-out.
- Provider failures trigger retry; Resend receives stable idempotency keys.
- Simulation never advances an application or claims a real outreach send; production without delivery configuration fails.
- Outreach API validates payloads, enforces ownership, and hides provider diagnostics.
- Gmail handles Unicode MIME correctly and rejects header injection; connected Gmail failure does not silently change sender identity.
- Email fits mobile and desktop, supports dark/light, and retains readable plain text.

## 3. User journeys / UI protocol
Normal: candidate opens morning email, reads factual priorities, reviews a high-fit job, and opens Discovery (single primary action). New/empty: review applications and job preferences rather than displaying an empty AI response. Returning: existing application/interview data drives recommendations. Edge: provider failure yields factual summary; opted-out users retain in-app notifications; rejected delivery remains retryable; simulated outreach preserves application state. Power: higher match threshold governs jobs and headline together. Interview: explicit Bangladesh time avoids server-timezone ambiguity.

```text
+ CareerTrack / Daily briefing --------+
| Applications | Follow-ups | Matches |
| Today's priorities                  |
| Opportunity / Fit / Review link     |
| [ Open Discovery ]                  |
| Notification preferences            |
+-------------------------------------+
```

## 4. Implementation and dependency trace
`src/lib/ai/briefing.ts` uses existing AI config/provider resolution and telemetry, a bounded 20-second read-only call, and at most 800 output tokens. Daily/weekly workers no longer invoke the operational graph for summaries. `src/lib/email.ts` owns shared validation, content fallback, URL safety, rendering, responsive/dark styles, plain-text conversion, and Resend dispatch. Daily/weekly audit results carry email payloads to separate memoized delivery steps. Interview worker checks accepted delivery before persisting its deduplication marker. `src/lib/gmail.ts` validates headers and encodes the UTF-8 body as base64. Outreach route/tool validate inputs and report delivery truthfully. Discovery tracker records REC-11 changes.

## 5–8. Verification, adversarial QA, user simulation
Automated suites cover malformed payloads, cross-tenant application IDs, script/image metadata, credential-bearing/JavaScript URLs, AI failure/empty results, opt-out, late interview windows, duplicate reminder suppression, rejected delivery, simulated sends, Gmail Unicode/header injection, and direct summary generation without tools. Browser tests cover 375px/1280px in light/dark; screenshots were inspected and a dark-link contrast issue corrected. Initial verification did not dispatch external messages; the user's subsequently authorized live test is recorded below.

Verification results:
- Full repository suite: `npx vitest run --maxWorkers=2 --testTimeout=20000` — 139 files / 948 tests passed. The initial unrestricted run hit an unrelated PDF test timeout and an outdated simulation assertion; the assertion was corrected, and the bounded run passed without changing the PDF test.
- Final mail-focused regression run: 9 files / 71 tests passed, including the four new read-only summary tests and connected-Gmail failure regression added after the full run began.
- Browser E2E: `npx playwright test --config playwright.email.config.ts` — 4 passed; 375px/1280px, light/dark, no horizontal overflow.
- `npx tsc --noEmit` — passed on final source.
- Changed production files ESLint — passed; full `npm run lint` has zero errors and four existing Discovery warnings.
- `npx prisma validate` — passed. Initial generation hit a transient Windows DLL lock while tests ran; retry generated the client successfully.
- `npm run build` — passed, including Prisma generation and all 72 static pages. Final `npx next build` — passed; compiled artifacts confirm the read-only summary and last sender-identity guard.
- `git diff --check` — passed.

## 9. Technical debt and performance review
No migration or speculative fields. Shared email styling avoids repeating theme/mobile behavior. Existing application ownership indexes (`userId`, `userId/status`) and match query indexes remain applicable. Daily query count is unchanged, job/stale/staged shortlists remain bounded to five, and summary generation drops the multi-call planner/tool graph to one model request. Digest HTML is bounded by the sender's 200 KB validation cap; shortlists keep normal payloads far below it. Browser output has no horizontal overflow; no React state/re-render changes. No persistent client listeners or new server caches. Read path remains tenant-scoped; write path changes only notification/application records; existing retention applies.

Remaining limitations: Resend idempotency lasts for the provider retention window; durable cross-event deduplication would require a dispatch ledger. Interview reminders still rely on an existing notification marker and do not model appointment rescheduling separately. The independent interview-alert switch is stored locally in the existing settings UI; persisted global `notifyEmail` is enforced by workers. Global scheduler queries still need cursor pagination at large scale. Native Gmail/Outlook CSS behavior can differ from browser previews. Follow-up/staged lists are capped at five, so those counts represent the reviewed shortlist. The outreach note/status write still spans multiple statements. These are documented existing or architectural follow-ups, not concealed delivery guarantees.

## 10. Release Readiness Report
- **Architecture Score**: 90
- **Security Score**: 92
- **Performance Score**: 90
- **Maintainability Score**: 90
- **Potential Risks**: Native inbox/provider behavior has not been live-tested; appointment rescheduling and cross-event deduplication need a durable ledger.
- **Potential Bottlenecks**: Global scheduler scans; provider rate limits; existing pre-briefing discovery refresh.
- **Technical Debt Introduced**: Shared wrapper infers semantic classes from legacy inline styles; explicit template tokens would be cleaner in a later template migration.
- **Future Scaling Concerns**: Cursor-paginated dispatchers, durable email outbox, notification retention, appointment-specific deduplication.

**Decision**: READY FOR REVIEW (Resend delivery and Gmail Inbox placement verified; direct-Gmail sending and live full AI briefing generation remain unverified).

Documentation consulted: [Resend send-email API](https://resend.com/docs/api-reference/emails/send-email), [LangChain standalone models](https://docs.langchain.com/oss/javascript/langchain/models), [Langfuse prompt management](https://langfuse.com/docs/prompt-management/overview). Existing provider/telemetry packages are reused without SDK upgrades.

## Authorized live test — 2026-10-13
- Recipient: the uniquely identified AH Muzahid account, `ahmuzahid40@gmail.com`.
- Subject: `[Live Test] CareerTrack Daily Briefing — 13 Oct 2026`.
- Sent once using the repaired `sendEmail` / `formatDailyOpportunityDigestHtml` path and a stable idempotency key. No application, follow-up, or notification records were mutated.
- Real database snapshot: 6 active applications, 6 stale applications, and 5 preference-filtered published matches. HTML payload: 15,141 bytes.
- Initial live summary generation returned unavailable; the factual fallback was used. A separate, bounded AI provider health call subsequently returned a non-empty response, so provider access is functional; successful live full-briefing generation is not claimed.
- Resend accepted the message at **2026-10-13 03:39:16 Asia/Dhaka** and reported **delivered** at **03:39:27**. Provider response confirmed recipient, subject, non-empty plain text, and absence of the planner failure message. This confirms recipient-server delivery, not inbox placement or human viewing.
- Connected-Gmail mailbox lookup failed because Gmail API is disabled/not enabled for the configured OAuth project. No Gmail API settings were changed. Enable it in the [Google Cloud API console](https://console.developers.google.com/apis/api/gmail.googleapis.com/overview?project=978880655444) to verify Inbox/Spam placement and direct-Gmail send behavior.
- Evidence: `artifacts/email/live-result.json`; actual sent HTML: `artifacts/email/live-digest.html`. Helper: `artifacts/email/live-check.ts`.

### Gmail API activation follow-up — 2026-10-13
After the user enabled Gmail API, the same targeted mailbox check succeeded. Connected Gmail returned the exact live-test subject with the `INBOX` label and without the `SPAM` label. The prior Gmail API blocker is resolved. No second email was sent; mailbox evidence was saved to `artifacts/email/live-result.json`.
