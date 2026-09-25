# CareerTrack Design Patterns & Architectural Handbook
> **Design Language**: Stripe Enterprise Standard ([`docs/design.md`](./design.md))  
> **Status**: Mandatory Systemwide Architectural Standard  
> **Target Audience**: All Engineering Agents and Human Contributors  

---

## 1. Core Philosophy & Architectural Laws

CareerTrack is an **Autonomous Career Operating System** (modeled after Stripe Dashboard, Linear, and Cursor). It is **NOT** a casual CRM, blog, or raw chatbot wrapper.

### The Four Non-Negotiable Directives:
1. **DRY Mandate (Zero Duplicate Code)**: Never duplicate card border structures, 4-stat metric blocks, page containers, or status tag styles. Always use systemwide primitives from `@/components/primitives` and `@/components/StatusBadge`.
2. **Zero Gradients Rule**: Strictly **NO** `bg-gradient-*`, `from-*`, `via-*`, or `to-*` anywhere in the app layout, cards, badges, or buttons. All surfaces must be solid, crisp, and architectural.
3. **Dynamic Semantic Tokens Only**: Never use hardcoded colors (`slate-*`, `blue-50`, `zinc-900`). Always use semantic Tailwind CSS variables: `bg-background`, `bg-card`, `bg-muted`, `text-foreground`, `text-muted-foreground`, `border-border`, and `bg-primary`.
4. **Stripe Tight Geometry**:
   - **Buttons & Inputs**: `rounded-[4px]` (`rounded-sm` = 4px).
   - **Cards & Bento Tiles**: `rounded-[6px]` (`rounded-md` / `rounded-[6px]`).
   - **Dialogs & Modals**: `rounded-[8px]`.
   - **Borders & Dividers**: `1px` crisp hairline (`border border-border`).
   - **Numbers**: Always enforce `.tabular-nums` on metrics to prevent layout shifts.

---

## 2. Systemwide Reusable Primitives Directory (`@/components/primitives`)

Every page in CareerTrack must be constructed using these standardized primitives:

### 1. `PageContainer`
Standardizes viewport max-width, horizontal gutters, vertical spacing, and responsive padding.
```tsx
import { PageContainer } from "@/components/primitives"

export default function MyPage() {
  return (
    <PageContainer>
      {/* Content here */}
    </PageContainer>
  )
}
```
- **Geometry**: `max-w-7xl mx-auto space-y-6 pb-12 w-full min-w-0 max-w-full overflow-x-hidden`.
- **Props**: `className`, `children`.

---

### 2. `PageHeader`
Standardizes the page title, category overline, description, and primary CTA. Enforces the **One Primary Action Rule**.
```tsx
import { PageHeader } from "@/components/primitives"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

<PageHeader
  overline="TRACKING"
  title="Job Applications"
  description="Manage and track active opportunities through every stage of your pipeline."
  action={
    <Button size="sm" className="h-9 px-4 rounded-[4px] font-semibold gap-1.5 shadow-xs">
      <Plus className="size-4" /> Add Application
    </Button>
  }
/>
```
- **Skeleton mode**: `<PageHeader skeleton />` automatically renders balanced pulse blocks.

---

### 3. `KPIStrip`
Standardizes all top metric summaries. Replaces 60–80 lines of duplicate grid/card markup.
Supports two variants:
- `variant="grid"`: 1px continuous architectural hairline blueprint grid with corner crosshairs (`DecorIcon`).
- `variant="cards"`: Individual Stripe-style solid cards with 6px radius.

```tsx
import { KPIStrip, type KPIItem } from "@/components/primitives"
import { Briefcase, CheckCircle2, Clock, Award } from "lucide-react"

const kpiItems: KPIItem[] = [
  { id: "active", label: "Active Pipeline", value: 14, delta: 12, deltaLabel: "vs last month", icon: Briefcase },
  { id: "interviews", label: "Interviews", value: 3, badge: { text: "2 Upcoming", isPositive: true }, icon: Clock },
  { id: "offers", label: "Offers", value: 1, badge: { text: "Action req.", isPositive: true }, icon: Award },
  { id: "response-rate", label: "Response Rate", value: "32%", subtext: "top 5% of applicants", icon: CheckCircle2 },
]

// Hairline Grid Style:
<KPIStrip items={kpiItems} columns={4} variant="grid" />

// Floating Cards Style:
<KPIStrip items={kpiItems} columns={4} variant="cards" />

// Loading Skeleton:
<KPIStrip isLoading columns={4} variant="grid" items={[]} />
```

---

### 4. `BlueprintCard` (Alias: `StripeCard`)
Standardized solid container with 1px border, 6px radius, hover states, and optional crosshairs.
```tsx
import { BlueprintCard, BlueprintCardHeader, BlueprintCardContent, BlueprintCardFooter } from "@/components/primitives"

<BlueprintCard withDecor position="top-left">
  <BlueprintCardHeader
    title="Executive Briefing"
    subtitle="AI-synthesized tactical priorities for today"
    action={<Button variant="ghost" size="sm">Dismiss</Button>}
  />
  <BlueprintCardContent>
    <p className="text-sm text-foreground">Content goes here...</p>
  </BlueprintCardContent>
  <BlueprintCardFooter>
    <span className="text-xs text-muted-foreground font-mono">Updated 10m ago</span>
  </BlueprintCardFooter>
</BlueprintCard>
```

---

### 5. `EmptyState`
Consistent, actionable zero-data placeholder.
```tsx
import { EmptyState } from "@/components/primitives"
import { FileText } from "lucide-react"

<EmptyState
  icon={FileText}
  title="No resumes uploaded yet"
  description="Upload your master resume to track tailored versions and match job applications."
  action={{
    label: "Upload Resume",
    onClick: () => setAddOpen(true),
  }}
/>
```

---

### 6. `StatusBadge`
Centrally mapped, 100% semantic badge supporting all domain statuses (`staged`, `saved`, `applied`, `assessment`, `interview`, `offer`, `accepted`, `rejected`, `archived`).
```tsx
import { StatusBadge } from "@/components/StatusBadge"

<StatusBadge status="interview" size="sm" showDot />
<StatusBadge status="staged" size="md" />
```
- **Rule**: Never create custom color maps for statuses (`getStatusStyle()`). Always import and use `<StatusBadge>`.

---

## 3. Standard Page Blueprint (Copy-Pasteable Template for Agents)

When an agent is tasked with building a new page or refactoring an existing route, it **MUST** follow this exact scaffolding structure:

```tsx
"use client"

import React, { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Plus, Briefcase, Clock, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { 
  PageContainer, 
  PageHeader, 
  KPIStrip, 
  BlueprintCard, 
  EmptyState, 
  type KPIItem 
} from "@/components/primitives"
import { StatusBadge } from "@/components/StatusBadge"

export default function StandardPage() {
  const { isLoaded, isSignedIn } = useUser()
  const router = useRouter()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { router.push("/"); return }
    // Fetch data...
    setLoading(false)
  }, [isLoaded, isSignedIn, router])

  if (!isLoaded || loading) {
    return (
      <PageContainer>
        <PageHeader skeleton />
        <KPIStrip isLoading columns={3} variant="grid" items={[]} />
        <div className="h-64 rounded-[6px] border border-border bg-card animate-pulse" />
      </PageContainer>
    )
  }

  const kpis: KPIItem[] = [
    { id: "1", label: "Metric One", value: 12, subtext: "in progress" },
    { id: "2", label: "Metric Two", value: 4, badge: { text: "+2 this week", isPositive: true } },
    { id: "3", label: "Metric Three", value: "94%", subtext: "healthy rate" },
  ]

  return (
    <PageContainer>
      {/* 1. Header with Single Primary Action */}
      <PageHeader
        overline="SECTION"
        title="Page Title"
        description="A concise explanation of the job-related outcome accomplished on this screen."
        action={
          <Button size="sm" className="h-9 px-4 rounded-[4px] font-semibold gap-1.5 shadow-xs">
            <Plus className="size-4" /> Primary Action
          </Button>
        }
      />

      {/* 2. Standardized KPI Metrics */}
      <KPIStrip items={kpis} columns={3} variant="grid" />

      {/* 3. Primary Content or Empty State */}
      {data.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No records found"
          description="Get started by adding your first record."
          action={{
            label: "Create Now",
            onClick: () => {},
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.map((item: any) => (
            <BlueprintCard key={item.id}>
              {/* Card content */}
            </BlueprintCard>
          ))}
        </div>
      )}
    </PageContainer>
  )
}
```

---

## 4. Typography & Spacing System (8px Grid)

| Token | Class | Size | Weight | Usage |
|:---|:---|:---:|:---:|:---|
| **Display Title** | `text-2xl sm:text-3xl` | 24–30px | Bold | Primary screen titles |
| **Section Heading**| `text-lg sm:text-xl` | 18–20px | Semibold | Cards, Modal headers |
| **Subheading** | `text-sm sm:text-base` | 14–16px | Medium | Card titles, tabs |
| **Body Text** | `text-xs sm:text-sm` | 12–14px | Normal | Descriptions, body paragraphs |
| **Meta / Mono** | `text-xs font-mono` | 12px | Medium | Counters, dates, IDs |
| **Micro Caption** | `text-[10px] sm:text-[11px]` | 10–11px | Normal | Overlines, badges |

### Vertical Spacing Hierarchy:
- `space-y-6` between major page sections (`PageHeader`, `KPIStrip`, content blocks).
- `gap-4` or `gap-3.5` between cards and grid columns.
- `space-y-2` or `space-y-1.5` between title and description.
- `p-4 sm:p-5` card inner padding.

---

## 5. Strict Forbidden Patterns & Anti-Patterns

❌ **NEVER** write `<div className="max-w-7xl mx-auto space-y-6 pb-12 w-full...">`. Always use `<PageContainer>`.  
❌ **NEVER** write `bg-gradient-to-*` or text gradients. All surfaces must be solid.  
❌ **NEVER** write hardcoded 4-box stat markup. Always use `<KPIStrip>`.  
❌ **NEVER** use `Sparkles` icon (lucide-react or SVG) anywhere.  
❌ **NEVER** use rounded-xl or rounded-2xl for standard cards. Always use Stripe 6px (`rounded-[6px]`).  
❌ **NEVER** use light-mode-only hardcoded color classes (`bg-blue-50 text-blue-700`). Always use OKLCH semantic tokens (`bg-primary/10 text-primary`).  
❌ **NEVER** duplicate status styling functions (`getStatusStyle()`). Always use `<StatusBadge>`.  

---

## 6. Verification Checklist for Agents

Before completing any UI task or new page:
- [ ] Is the page wrapped in `<PageContainer>`?
- [ ] Does it use `<PageHeader>` with exactly ONE primary action?
- [ ] Are KPIs rendered via `<KPIStrip>`?
- [ ] Are all cards using `rounded-[6px]` and `border border-border`?
- [ ] Are all buttons and inputs using `rounded-[4px]`?
- [ ] Are all status badges using `<StatusBadge>`?
- [ ] Are zero gradients present in the code?
- [ ] Do all metrics and numeric counters use `.tabular-nums`?
- [ ] Does the page look balanced and legible in both **Dark Mode** and **Light Mode**?
- [ ] Did `npx tsc --noEmit` pass with 0 errors?
