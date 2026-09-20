# Opportunities Page Redesign

> Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Redesign Opportunities page: tab filtering, right sidebar with AI Copilot, polished job cards.

**Architecture:** 2-column (list + right sidebar). No API changes.

## Constraints
- rounded-xl for cards
- slate-* palette
- Dark/light mode
- No Sparkles icon

---

## Chunk 1: Tab State + Tab Bar

### Task 1: use-job-discovery.ts
- Add activeTab state
- Add tabCounts useMemo
- Add tabFilteredOpportunities useMemo
- Export from hook
- tsc verify

### Task 2: DiscoveryTabBar.tsx
- Create tab bar component
- tsc verify

## Chunk 2: AI Copilot Sidebar

### Task 3: AICareerCopilotSidebar.tsx
- Create copilot card with quick actions
- tsc verify

## Chunk 3: Job Card

### Task 4: DiscoveryJobCard.tsx
- Create card with avatar, title, match, meta, tags, actions
- tsc verify

### Task 5: DiscoveryJobList.tsx
- Use DiscoveryJobCard instead of row
- tsc verify

## Chunk 4: Page Layout

### Task 6: DiscoveryPage.tsx
- New header with title
- Tab bar + sort
- Two-column layout
- Preserve modals
- tsc verify

## Chunk 5: Verification

### Task 7
- tsc, lint, build
- Visual check dark/light
- Update tracker
