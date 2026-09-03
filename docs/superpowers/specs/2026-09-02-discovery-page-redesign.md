# Discovery Page Redesign — Design Spec

## Overview

Redesign the Job Discovery page from a monolithic card grid to a **dense list + persistent filter sidebar** layout with **bento stat cards** at the top. Goal: better scan-ability, clear visual hierarchy, clean UI, top-notch UX matching the existing architectural blueprint design language.

**Scope:** UI-only. No API changes, no polling, no background refresh. Defer auto-refresh to a future iteration.

---

## Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│  [Stat: Total Found] [Stat: Avg Score] [Stat: New] [Stat: Saved] │  ← Bento stat row
├────────────┬────────────────────────────────────────────┤
│  FILTERS   │  🔍 Search bar ──────────────── [Sort ▼]  │
│            │                                            │
│  Source    │  ┌──────────────────────────────────────┐  │
│  ● All     │  │ [SQ] Senior React Dev · Stripe · Remote │  │
│  ○ RemoteOK│  │      92% Match · React, TypeScript      │  │
│  ○ Arbeit  │  └──────────────────────────────────────┘  │
│  ○ Adzuna  │  ┌──────────────────────────────────────┐  │
│            │  │ [VB] Full Stack Eng · Vercel · Remote   │  │
│  Location  │  │      87% Match · Next.js, React         │  │
│  ● All     │  └──────────────────────────────────────┘  │
│  ○ Remote  │           ... more rows ...                 │
│  ○ Hybrid  │                                            │
│            │  ── 18 positions found ──                   │
│  Tags      │                                            │
│  [React]   │                                            │
│  [Python]  │                                            │
└────────────┴────────────────────────────────────────────┘
```

**Breakpoints:**
- `lg` (1024px+): Sidebar + list side by side
- `md` (768-1023px): Sidebar collapses to horizontal filter chips above list
- `sm` (<768px): Full-width list, filters in a bottom sheet drawer triggered by a `Filter` button in the search bar. Drawer uses `@radix-ui/react-dialog` with `direction: bottom`, slides up with `framer-motion`, includes all filter groups + "Apply Filters" button (`bg-primary text-primary-foreground h-10 w-full rounded-none`). Sharp corners (`rounded-none`).

---

## Section 1: Bento Stat Row

4 stat cards in a single row, matching the `BentoStatGrid` pattern from the dashboard.

### Cards

| Card | Value | Sub-label | Spark color |
|---|---|---|---|
| Total Found | `opportunities.length` | "all sources" | `#3b82f6` (blue) |
| Avg Fit Score | `Math.round(avg)` | "top match {max}%" | `#a855f7` (purple) |
| New Today | count of jobs fetched in current session (client-side tracking) | "just now" | `#06b6d4` (cyan) |
| Saved | `savedJobs.size` | "to tracker" | `#10b981` (green) |

### Styling

- Container: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3`
- Each card: `rounded-none border border-border/70 bg-card/60 backdrop-blur-xl p-4 relative` with `DecorIcon` at `top-right` and `bottom-left`
- Label: `text-[11px] font-mono font-medium tracking-tight text-zinc-400 group-hover:text-zinc-200`
- Value: `text-2xl font-semibold tracking-tight text-foreground font-sans`
- Badge: `text-[11px] font-mono text-muted-foreground`
- Sub-label: `text-[10px] font-mono text-zinc-500`
- Sparkline: SVG at bottom right, 120×32px
- Hover: `hover:border-zinc-700 hover:bg-card/90`, ArrowUpRight icon fades in
- Each card has `DecorIcon` at `top-right` and `bottom-left` positions
- "Saved" card is clickable → navigates to `/applications?status=Saved`

---

## Section 2: Search + Sort Bar

Full-width bar below stat row.

### Search Input

- `h-11` height, `pl-10` for icon padding
- `Search` icon at left, `X` clear button at right (when query non-empty)
- Placeholder: "Search roles, companies, or tech stack..."
- On submit → triggers `refetch()` with query params
- Debounced typing (300ms) → also triggers refetch

### Sort Dropdown

- Right-aligned in the search bar row
- Button: `h-8 rounded-none border border-border px-2.5 text-xs font-medium`
- Icon: `ArrowUpDown` + "Sort" label
- Dropdown: `bg-popover p-1 shadow-lg backdrop-blur-xl rounded-none border border-border`
- Options: Fit Score (highest), Fit Score (lowest), Salary (highest), Salary (lowest), Newest
- Sort is client-side only (no re-fetch)

---

## Section 3: Filter Sidebar

Persistent sidebar, ~240px wide, left side.

### Container

- `w-60 shrink-0 border-r border-border/60 pr-5 relative` with `DecorIcon` at `top-right`
- Scrollable independently on overflow

### Filter Groups

**Source** (radio group)
- All Sources (default)
- RemoteOK — `bg-indigo-500/10 text-indigo-600` dot
- Arbeitnow — `bg-emerald-500/10 text-emerald-600` dot
- Adzuna — `bg-violet-500/10 text-violet-600` dot

**Location** (radio group)
- All Locations (default)
- Remote
- Hybrid / On-site

**Match Score** (radio group)
- All Scores (default)
- 85%+ (Strong Match) — green indicator
- 70-84% (Good Match) — blue indicator
- Below 70% — amber indicator

**Tech Tags** (toggle chips)
- React, Python, Go, TypeScript, AI, Next.js, Node.js, Remote
- Same style as current `QUICK_TAGS` pills
- Default: `bg-muted/40 text-muted-foreground border-border/60`
- Active: `bg-primary text-primary-foreground border-primary`

### Clear All

- `text-xs text-muted-foreground hover:text-foreground underline cursor-pointer`
- Only visible when any filter is non-default

### Styling

- Group label: `text-[10px] font-mono uppercase tracking-wider text-muted-foreground/80`
- Radio dot: custom `size-3.5 rounded-full border border-foreground/40` with inner dot when selected (sharp corners don't apply to circular elements)
- Section spacing: `space-y-4`

---

## Section 4: Dense Job List

Right side, flex-1. Vertical stack of rows.

### Row Layout (Collapsed)

```
┌──────────────────────────────────────────────────────────────────┐
│ [CompanyInitials] Job Title              Company    Location  $$$│
│                  FitScore% Match · Tag1, Tag2, Tag3              │
│                  AI rationale snippet (line-clamp-1)             │
└──────────────────────────────────────────────────────────────────┘
```

**Row anatomy:**

1. **Company initials badge** — `size-8 rounded-none bg-muted flex items-center justify-center font-bold text-xs text-foreground shrink-0 border border-border`
2. **Job title** — `text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors`
3. **Company name** — `text-xs text-muted-foreground`
4. **Location** — `MapPin` icon + text, `text-[11px] text-muted-foreground`
5. **Salary** — `text-[11px] font-mono text-emerald-600 dark:text-emerald-400`
6. **Fit score badge** — colored pill:
   - ≥85%: `bg-emerald-500/10 text-emerald-600 border-emerald-500/30`
   - ≥70%: `bg-sky-500/10 text-sky-600 border-sky-500/30`
   - <70%: `bg-amber-500/10 text-amber-600 border-amber-500/30`
7. **Source badge** — `Globe` icon + label, `text-[10px]`
8. **Tags** — `text-[10px] px-1.5 py-0 bg-muted/70 rounded` pills
9. **AI rationale** — `text-[11px] text-muted-foreground line-clamp-1`

**Row container:**
- Default: `border-b border-border/40 py-3 px-4 cursor-pointer hover:bg-muted/30 transition-colors`
- Expanded: `bg-card border border-border/60 rounded-none my-1 shadow-xs` with `DecorIcon` at `top-right` and `bottom-left`

### Row Layout (Expanded)

When clicked, row expands inline to show full details:

```
┌──────────────────────────────────────────────────────────────────┐
│ [SQ] Senior React Dev              Stripe         Remote   $160k│
│      92% Match · React, TypeScript, Next.js                     │
│      High conversion match on proven skills (react, typescript) │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  AI Rationale                                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ High conversion match on proven skills (react, typescript) │  │
│  │ Your profile strength in React aligns with Stripe's core  │  │
│  │ frontend stack. Historical win rate for similar roles: 78%│  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Tags  [react] [typescript] [nextjs] [postgresql] [redis]       │
│                                                                  │
│  Source  RemoteOK · Listed 2 days ago                             │
│                                                                  │
│  ┌────────────────┐  ┌────────────────────────────┐              │
│  │ Save to Tracker│  │ View on RemoteOK     ↗     │              │
│  └────────────────┘  └────────────────────────────┘              │
└──────────────────────────────────────────────────────────────────┘
```

**Expanded content:**
- **AI Rationale block**: `bg-muted/30 rounded-none p-3 border border-border/60`
  - Header: `Zap` icon + "AI Rationale" in `text-xs font-semibold`
  - Body: full `matchRationale` text, no clamp
- **Tags row**: all tags displayed (not truncated)
- **Source row**: `Globe` icon + source label + "Listed X days ago"
- **Action buttons**:
  - "Save to Tracker" — `bg-primary text-primary-foreground h-8 text-xs px-4 rounded-none`
  - "View on {source}" — `variant="outline" h-8 text-xs px-3 rounded-none` with `ExternalLink` icon
- **Close**: clicking row again or pressing `Escape` collapses
- **Animation**: `framer-motion` `AnimatePresence` with `motion.div` height animation, 200ms ease-out

---

## Section 5: Empty State

Shown when `opportunities.length === 0` after loading.

```
┌─────────────────────────────────────────────┐
│           [Briefcase icon]                  │
│     No matching opportunities found         │
│                                             │
│  We couldn't find roles matching            │
│  "xyz". Try broader keywords or adjust      │
│  your filters.                              │
│                                             │
│  Try searching: [React] [Backend] [AI]      │
│                                             │
│  [Browse All]  [Refresh Feed]               │
└─────────────────────────────────────────────┘
```

- Container: `border-dashed border-border rounded-none p-10 text-center bg-card relative` with `DecorIcon` at `top-right` and `bottom-left`
- Icon: `Briefcase` in `size-12 rounded-none bg-primary/10 border border-primary/20`
- Quick suggestion buttons: `variant="outline" size="sm" h-7 text-xs rounded-none`
- Action buttons: "Browse All" (default) + "Refresh Feed" (outline)

---

## Section 6: Loading Skeleton

6 skeleton rows while loading:

```
┌──────────────────────────────────────────────────────────────────┐
│ [░░] ░░░░░░░░░░░░░░░░  ░░░░░░░░  ░░░░░  ░░░░░                   │
│      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░                       │
└──────────────────────────────────────────────────────────────────┘
```

- `animate-pulse` on all placeholder elements
- `bg-muted/40` for bars, `rounded-none`, `rounded-none`, `rounded-none`, `rounded-none`, `rounded-none`, `rounded-none`
- Title bar: `h-4 w-2/5`
- Company bar: `h-3 w-1/6`
- Tags bar: `h-3 w-3/5`

---

## File Structure

```
src/components/discovery/
├── types.ts                   ← shared types (FilterState, SortOption, etc.)
├── DiscoveryPage.tsx           ← page shell, state owner, layout
├── DiscoveryStatRow.tsx        ← 4 bento stat cards with sparklines
├── DiscoveryFilterSidebar.tsx  ← persistent sidebar with all filter groups
├── DiscoveryJobList.tsx        ← list container + empty/loading states
├── DiscoveryJobRow.tsx         ← single row + inline expanded state
└── DiscoverySortDropdown.tsx   ← sort control

src/app/(app)/discovery/
└── page.tsx                    ← existing page (minimal changes, just wraps new component)
```

---

## State Management

All state lives in `DiscoveryPage.tsx`:

```typescript
interface DiscoveryFilters {
  source: "" | "remoteok" | "arbeitnow" | "adzuna"
  location: "" | "remote" | "hybrid"
  minScore: "" | "85" | "70" | "0"
  tags: string[]
}

type SortOption = "score-desc" | "score-asc" | "salary-desc" | "salary-asc" | "newest"
```

- `searchQuery: string` — search input value
- `filters: DiscoveryFilters` — all filter sidebar values
- `sortBy: SortOption` — sort dropdown selection
- `expandedRowId: string | null` — which row is expanded
- `savedJobs: Set<string>` — locally tracks saved job IDs

### Data Flow

```
DiscoveryPage
├── useQuery(["discovery", searchQuery, filters]) → fetches from /api/jobs/discover
├── Derived: filteredOpportunities (client-side filter by source/location/score/tags)
├── Derived: sortedOpportunities (client-side sort)
├── Derived: statValues (total, avgScore, newToday, savedCount)
│
├── DiscoveryStatRow ← statValues
├── DiscoveryFilterSidebar ← filters, onFilterChange
├── SearchBar + DiscoverySortDropdown ← searchQuery, sortBy
├── DiscoveryJobList ← sortedOpportunities, isLoading
│   └── DiscoveryJobRow[] ← each row, expandedRowId, onToggleExpand
└── saveMutation → POST /api/jobs/discover (existing endpoint)
```

---

## Design Language Compliance

- **Zero round corners** — all components use `rounded-none` (sharp corners, no border-radius). Matches the architectural blueprint aesthetic across the app.
- **DecorIcon (+) corner crosshairs** — `DecorIcon` on stat row cards, empty state container, filter sidebar container, and expanded row. Positions: `top-left`, `top-right`, `bottom-left`, `bottom-right` as appropriate.
- **No Sparkles icon** — use `Compass`, `Layers`, `BrainCircuit`, `Zap` per AGENTS.md
- **DashboardCard** wrapper for stat cards and expanded row
- **Dark/light mode** — all colors use Tailwind `dark:` variants or semantic tokens
- **Typography**: `font-mono` for labels/badges, `font-sans` for values, `text-[10px]`-`text-xs` for small text
- **Borders**: `border-border/60` for subtle dividers, `border-border` for cards
- **Shadows**: `shadow-xs` for cards, `shadow-lg` for dropdowns
- **FullWidthDivider** lines between major sections (stat row → search bar → list area)

---

## What's NOT in Scope

- Auto-refresh / polling (deferred to future iteration)
- API changes (existing endpoint used as-is)
- New data fields (uses existing `ExternalJobOpportunity` shape)
- Saved jobs view (already exists on `/applications` page)
- Batch actions (save multiple at once)
- Job comparison view
