# CareerTrack Engineering & Design Rules

## 1. Iconography & Visual Style Rules
- **STRICT PROHIBITION: NEVER use the Sparkles icon (lucide-react or SVG) anywhere in this codebase or landing page.**
- **Preferred Alternatives**: Use intentional, functional icons such as Layers, Zap, BrainCircuit, Briefcase, Cpu, Bot, Grid, or minimalist status dots.

## 2. Design System & Layout Principles
- **Grid Architecture**: Follow the architectural linear blueprint layout with FullWidthDivider lines and DecorIcon (+) corner crosshairs.
- **Theme Support**: Every component and visual must seamlessly support both Dark and Light modes.

## 3. Job Discovery System Audit & Execution Tracker Rule
- **LIVING TRACKER FILE**: Whenever ANY modification, enhancement, bug fix, scraper update, or refactor is made to the Job Discovery pipeline (`src/lib/discovery/`, `src/inngest/functions/batch-job-pipeline.ts`, `src/app/api/jobs/discover/`, `src/components/discovery/`, or discovery DB schemas), **YOU MUST IMMEDIATELY UPDATE `docs/JOB-DISCOVERY-TRACKER.md`**.
- Mark corresponding action items as Completed (`[x]`) or In Progress (`[/]`), record the date, files modified, and append an entry to the Audit Change Log table in `docs/JOB-DISCOVERY-TRACKER.md`.

## 4. CareerTrack Engineering Operating System & Mandatory 10-Step Workflow

### Mandatory Pre-Task Rule
Before writing code for any feature, bug fix, refactor, or enhancement:
1. Read the Engineering Operating System.
2. Follow all mandatory workflow steps.
3. Do not skip verification.
4. Do not declare success after implementation.
5. Produce a Release Readiness Report at the end.

### The 10-Step Mandatory Execution Workflow
- **STEP 1: REQUIREMENT ANALYSIS** (Goal, Scope, Impacted modules, Dependencies, Risks, Edge cases)
- **STEP 2: DEFINE ACCEPTANCE CRITERIA** (Measurable checklist)
- **STEP 3: CREATE USER JOURNEYS** (Normal, edge, agent, etc. before coding)
- **STEP 4: IMPLEMENT** (Only after Steps 1, 2, 3)
- **STEP 5: STATIC ANALYSIS** (TypeScript, ESLint, Build Verification)
- **STEP 6: TEST GENERATION** (Unit, Integration, E2E tests for all new behavior. If tests missing, feature is NOT complete)
- **STEP 7: BREAK THE FEATURE (Malicious QA Engineer)** (Search for missing states, invalid transitions, empty states, race conditions, refresh bugs, navigation bugs, data loss, stale cache, mobile, a11y, permissions, loading, errors)
- **STEP 8: USER SIMULATION** (Normal, Power, New, Returning, Edge Case Users. Document failures, fix, retest)
- **STEP 9: TECHNICAL DEBT REVIEW** (Dead code, duplicate code, orphaned components, unused APIs/fields, over/under-engineering)
- **STEP 10: RELEASE READINESS REVIEW** (Architecture, UX, Performance, Reliability, Maintainability. Assigned: `NOT READY`, `READY FOR REVIEW`, `RELEASE READY`)

### Permitted Status Vocabulary
Never say: "Done", "Completed", "Implemented Successfully" unless Release Readiness Review passes.
Allowed statuses:
- `Implementation Finished - Verification Pending`
- `Implementation Finished - Issues Found`
- `Release Ready`

### 5. Pragmatic Tiered Execution Protocol (Speed & Quality Balance)
To prevent analysis paralysis, token bloat, and shipping delays while maintaining uncompromising engineering excellence:

- **TIER 1: Architectural & Multi-Module Features (Full 10-Step Deep Track)**:
  - **Triggers**: DB schema migrations, new API endpoints, agent workflows, state machines, pipeline integrations, and all roadmap items (`CAG-01` to `CAG-16`).
  - **Execution**: Full rigorous execution of Steps 1 through 10. Every step is documented with dense, actionable precision (no fluff).
- **TIER 2: Surgical Fixes & UI Tweaks (Fast-Track Quality Protocol)**:
  - **Triggers**: Isolated CSS/layout alignment, typography/label tweaks, single-file bug fixes without API/schema changes.
  - **Execution**: Compact scope statement -> Surgical implementation -> Compulsory automated verification (TypeScript + Lint + Build) -> Fast Release. No multi-page bureaucracy for a 3-line fix.
- **Reality Over Theory Rule**:
  - Verification must always be backed by real command executions (`vitest`, `build`, Prisma checks), not just conversational assumptions.

## 6. Product Design & UX Architecture Rules (Linear / Stripe Standard)

### Mandatory Pre-UI Protocol
Before implementing or modifying any UI component or screen:
1. Explain the user journey.
2. Explain why this screen exists (job-related outcome).
3. Explain the single primary action.
4. Explain the desired user outcome.
5. Draw an ASCII wireframe.
6. Only then write code.

### Core UX Laws
- **Design Identity**: Career Operating System (feels like Linear, Cursor, Notion, Stripe Dashboard). NOT an admin panel, CRM, or chatbot wrapper.
- **UI Hierarchy**: Action ↓ Outcome ↓ Insight ↓ Details. (Never show analysis or raw logs before actionable items).
- **One Primary Action Rule**: Every screen must have exactly ONE primary action (e.g. `[ Package & Stage ]`).
- **No Empty AI Chat Rule**: Never create a page that only contains an empty chat box. AI must be contextually attached to work (`Opportunity + Copilot`, `Application + Copilot`, `Interview + Copilot`).
- **Page Purpose Rule**: Every page must answer: "What job-related outcome is achieved here?" If unclear, page must not exist.
- **Progressive Disclosure**: Essential first, advanced hidden. Never dump 20 filters or raw data on initial view.
- **Actionable Cards Rule**: Every card must contain: 1. Title, 2. Status, 3. Next Action. Never show info without an action.
- **Agent Results Rule**: Users see Outcomes (e.g. *"3 Opportunities Staged"*), NOT agent nodes, workflow logs, or LangGraph execution details.
- **Cognitive Load Rule**: Any screen requiring > 5 seconds to understand must be redesigned.
- **Table vs Cards**: Tables are for management (Applications). Cards are for decisions (Discovery, Interview Prep).
- **Color Discipline**: Color is for meaning, never decoration. Green = Positive, Yellow = Attention, Red = Risk, Blue = Information.
- **Real Metrics Only**: Applications, Interviews, Response Rate, Offers. Never vanity metrics (AI messages, tokens, agent runs).
- **AI Output Transformation**: Never dump raw LLM text. Convert into Cards, Checklists, Recommendations, and Actions.
- **Mobile Usability**: 100% usable without hover, right-click, or wide screens.
- **Design Release Blockers**: Inconsistent UI, confusing navigation, >1 primary action, visible agent logs, missing empty/loading states, broken mobile = NOT RELEASE READY.

## 7. Security Rules & Zero-Trust Protocol
- **Never Trust**: User input, query params, headers, cookies.
- **Validation**: Validate everything. Use Zod everywhere for API payloads and internal mutations.
- **Never Expose**: Internal IDs, secret keys, environment variables, full stack traces, JWT/OAuth tokens to client.
- **Endpoint Triad**: Every API endpoint strictly requires: 1. Authentication, 2. Authorization, 3. Input Validation.
- **Tenant Isolation**: Always check `userId` ownership before reading or mutating any record (`withDbRetry` + `where: { id, userId }`).
- **Attack Prevention**: Actively guard against SQL injection (Prisma parameterized queries only), XSS, CSRF, SSRF (sanitize scraped URLs), and Prompt Injection.
- **Code Execution Ban**: Strictly NO `eval()`, NO `Function()` constructor, NO raw `dangerouslySetInnerHTML` or `innerHTML` without sanitization.

## 8. Performance & Optimization Rules
- **Anti-Pattern Detection**: Strictly prevent N+1 queries, duplicate sequential queries, overfetching columns, and unnecessary re-renders.
- **Traffic Patterns**: Prefer pagination (`take`, `skip`, cursor), Redis caching (`getCachedJson`), and batching (`Promise.allSettled`, Inngest fanouts).
- **Payload Discipline**: Avoid fetching entire unindexed tables, avoid transmitting unbounded JSON blobs, avoid deep component trees (>5 levels without memo).
- **Mandatory Feature Review Metrics**: Every feature review must evaluate:
  1. DB Impact (indexes used, query count)
  2. Network Impact (payload size in KB, round trips)
  3. Render Impact (re-render count, layout shifts)
  4. Memory Impact (client/server leak potential)

## 9. Database Rules
- **Indexing & Scaling**: Every new feature must document required indexes, query patterns, and expected scale.
- **Normalization & Zero Duplication**: Never duplicate data across models without explicit denormalization rationale. Never add speculative fields.
- **Path Review**: Explicitly review: 1. Read path, 2. Write path, 3. Growth/Archival path (TTL).

## 10. CareerTrack Core Domain Rules
- **Discovery Hub Naming**: Retain `/discovery` as the unified Discovery & Evaluation Hub (contains both autonomous sourcing and external JD evaluation).
- **Asset Ownership**: All application assets (tailored resumes, cover letters, outreach drafts) must belong to an `Application` record and have user ownership.
- **Single Opportunity Model**: Discovery jobs and evaluated external JDs share the `CanonicalJob` / `UserJobMatch` / `Application` domain models; no duplicate storage.
- **Anti-Hallucination Guardrail**: Resume tailoring and cover letter agents may NEVER invent experience, metrics, or technologies not present in verified `UserMemory` / `CareerKnowledgeGraph`.
- **Background Resiliency**: Background jobs must be idempotent; Inngest functions must support automatic retries and exponential backoff.

## 11. Mandatory Release Report Template
For any feature declaring completion, the following report must be produced:
```markdown
### Release Readiness Report
- **Architecture Score**: [0-100]
- **Security Score**: [0-100]
- **Performance Score**: [0-100]
- **Maintainability Score**: [0-100]

- **Potential Risks**: [Documented risks]
- **Potential Bottlenecks**: [Documented bottlenecks]
- **Technical Debt Introduced**: [None or documented]
- **Future Scaling Concerns**: [Documented scaling path]

**Decision**: NOT READY | READY FOR REVIEW | RELEASE READY
```

## 12. Stripe Design System & Systemwide Component Architecture (MANDATORY)

### Core Directives
1. **STRICT PROHIBITION ON GRADIENT COLORS**: NEVER use gradient backgrounds or text gradients (`bg-gradient-*`, `from-* to-*`, etc.). All surfaces must be solid, crisp, and architectural (Stripe clean financial standard).
2. **ZERO DUPLICATE CODE (DRY)**:
   - NEVER copy-paste card borders, padding, or headers across components or pages.
   - ALWAYS use systemwide reusable primitives from `@/components/primitives`:
     - `<PageContainer>`: Wraps every route layout with standardized max-width, horizontal gutters, and vertical spacing.
     - `<PageHeader>`: Enforces standardized page title, description, badge/overline, and the single primary action rule.
     - `<KPIStrip>`: Unified 4-stat metric strip with 1px architectural hairline grid.
     - `<BlueprintCard>` (or `<StripeCard>`): Standardized card with 1px border, 6px radius, semantic tokens, and header/content/footer slots.
     - `<StatusBadge>`: Dynamic status badge powered by centralized status definitions. NEVER re-declare local `getStatusStyle` functions.
     - `<EmptyState>`: Standardized actionable empty state component.
3. **DYNAMIC SEMANTIC TOKENS ONLY**:
   - Strictly NO hardcoded arbitrary colors (`bg-white dark:bg-slate-900`, `border-slate-200/80`, `text-slate-500`, etc.).
   - Use CSS variables & semantic tokens: `bg-background`, `bg-card`, `bg-muted`, `border-border`, `text-foreground`, `text-muted-foreground`, `text-primary`.
4. **STRIPE GEOMETRY & TYPOGRAPHY SPECIFICATIONS (`docs/design.md`)**:
   - **Border Radius**: Buttons and form inputs: `4px` (`rounded-sm`). Cards and surfaces: `6px` (`rounded-md` or `rounded-[6px]`). Badges: `2px` (`rounded-xs`) or `4px` (`rounded-sm`). Never use generic bubbly `rounded-xl` or `rounded-2xl` on cards.
   - **Borders**: Thin `1px` hairlines (`border border-border`).
   - **Spacing Base**: Multiples of 8px (`gap-2` = 8px, `gap-4` = 16px, `gap-6` = 24px, `space-y-6` = 24px).
   - **Buttons**: Primary CTA fill `#533AFD` (solid), 4px radius, white text, flat without drop shadow. Secondary/Outline: 1px border with transparent background.
   - **Metrics**: Always use `.tabular-nums` on numbers, salaries, and metrics to prevent layout shifts.
5. **AGENT SCAFFOLDING HANDBOOK**:
   - Before building or editing any page, agents MUST read and follow the standardized templates in [`docs/DESIGN-PATTERNS.md`](./docs/DESIGN-PATTERNS.md).
