# AI Workspace Simplification — Drawer Panel

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the overwhelming split-pane workspace with a clean, chat-first layout where a slide-in drawer panel shows artifacts on-demand.

**Architecture:** Chat becomes 100% width. A right-side drawer slides in when an artifact is generated or user clicks "View in Canvas". Drawer has a close button and overlay backdrop on mobile. Terminal and Board tabs are removed entirely. HITL Cancel dismisses the form.

**Tech Stack:** React, Tailwind CSS, WorkspaceContext (simplified), Lucide icons

## Global Constraints
- No Sparkles icon (AGENTS.md)
- `rounded-none` on buttons
- No icons on headers/buttons where possible
- Text-only UI, no badges/bullets on status
- Dark/light theme support
- Bengali/Bangla-friendly developer communication

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/components/ai/WorkspaceContext.tsx` | Modify | Add `isDrawerOpen`, `openDrawer()`, `closeDrawer()`, remove `activeMobileTab` |
| `src/components/ai/WorkspaceCanvas.tsx` | Rewrite | Convert to `WorkspaceDrawer` — slide-in panel with close button, overlay |
| `src/components/ai/CanvasTab.tsx` | Keep | No changes needed (renders activeArtifact) |
| `src/components/ai/AIChat.tsx` | Modify | Remove split-pane, remove mobile toggle, chat takes 100% width |
| `src/components/ai/ChatMessage.tsx` | Modify | Update artifact routing to open drawer instead of switching tabs |
| `src/components/ai/HITLConfirmForm.tsx` | Modify | Fix Cancel button to call `onCancel` properly |
| `src/components/ai/TerminalTab.tsx` | Keep (unused) | Not deleted, just no longer imported |
| `src/components/ai/MiniBoardTab.tsx` | Keep (unused) | Not deleted, just no longer imported |

---

### Task 1: Simplify WorkspaceContext — Add Drawer State

**Files:**
- Modify: `src/components/ai/WorkspaceContext.tsx`

**Interfaces:**
- Produces: `isDrawerOpen: boolean`, `openDrawer: () => void`, `closeDrawer: () => void`
- Consumed by: Task 2 (WorkspaceDrawer), Task 3 (AIChat), Task 4 (ChatMessage)

- [ ] **Step 1: Rewrite WorkspaceContext with drawer state**

Replace the entire file content. Remove `activeMobileTab` and `setActiveMobileTab`. Add `isDrawerOpen`, `openDrawer()`, `closeDrawer()`.

```typescript
"use client"

import { createContext, useContext, useState, useCallback } from "react"
import { type ToolInvocation } from "./AIChat"

export interface Artifact {
  id: string
  title: string
  content: string
  type: "email" | "resume" | "analysis" | "general"
}

interface WorkspaceContextProps {
  activeArtifact: Artifact | null
  setActiveArtifact: (art: Artifact | null) => void
  toolInvocations: ToolInvocation[]
  setToolInvocations: (invs: ToolInvocation[]) => void
  isStreaming: boolean
  setIsStreaming: (val: boolean) => void
  isDrawerOpen: boolean
  openDrawer: () => void
  closeDrawer: () => void
}

const WorkspaceContext = createContext<WorkspaceContextProps | undefined>(undefined)

const fallbackContext: WorkspaceContextProps = {
  activeArtifact: null,
  setActiveArtifact: () => {},
  toolInvocations: [],
  setToolInvocations: () => {},
  isStreaming: false,
  setIsStreaming: () => {},
  isDrawerOpen: false,
  openDrawer: () => {},
  closeDrawer: () => {},
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [activeArtifact, setActiveArtifact] = useState<Artifact | null>(null)
  const [toolInvocations, setToolInvocations] = useState<ToolInvocation[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const openDrawer = useCallback(() => setIsDrawerOpen(true), [])
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), [])

  return (
    <WorkspaceContext.Provider
      value={{
        activeArtifact,
        setActiveArtifact,
        toolInvocations,
        setToolInvocations,
        isStreaming,
        setIsStreaming,
        isDrawerOpen,
        openDrawer,
        closeDrawer,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  return context || fallbackContext
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `node node_modules/typescript/lib/tsc.js --noEmit`
Expected: PASS (no errors — other files may warn about missing `activeMobileTab` but that's expected until Task 3 fixes them)

- [ ] **Step 3: Commit**

```bash
git add src/components/ai/WorkspaceContext.tsx
git commit -m "refactor(workspace): simplify context to drawer state model"
```

---

### Task 2: Create WorkspaceDrawer — Slide-In Panel

**Files:**
- Rewrite: `src/components/ai/WorkspaceCanvas.tsx` → rename concept to `WorkspaceDrawer`
- Keep: `src/components/ai/CanvasTab.tsx` (no changes)

**Interfaces:**
- Consumes: `isDrawerOpen`, `closeDrawer`, `activeArtifact` from WorkspaceContext
- Renders: `<CanvasTab />` inside a slide-in drawer panel

- [ ] **Step 1: Rewrite WorkspaceCanvas.tsx as WorkspaceDrawer**

Replace the entire file. The drawer slides in from the right with a CSS transition, has a header with title + close button, and renders CanvasTab as the only content.

```tsx
"use client"

import { useWorkspace } from "./WorkspaceContext"
import CanvasTab from "./CanvasTab"
import { X } from "lucide-react"

export default function WorkspaceDrawer() {
  const { isDrawerOpen, closeDrawer, activeArtifact } = useWorkspace()

  return (
    <>
      {/* Overlay — visible on mobile when drawer is open */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={closeDrawer}
        />
      )}

      {/* Drawer Panel */}
      <div
        className={`fixed top-0 right-0 h-full z-50 bg-background border-l border-border shadow-xl transition-transform duration-300 ease-in-out ${
          isDrawerOpen ? "translate-x-0" : "translate-x-full"
        } w-full sm:w-[480px] lg:w-[560px]`}
      >
        {/* Header */}
        <div className="h-12 border-b border-border flex items-center justify-between px-4 shrink-0 bg-muted/30">
          <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
            {activeArtifact?.title || "Document"}
          </span>
          <button
            onClick={closeDrawer}
            className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto h-[calc(100%-3rem)] p-4 bg-background">
          <CanvasTab />
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `node node_modules/typescript/lib/tsc.js --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/ai/WorkspaceCanvas.tsx
git commit -m "feat(workspace): replace split-pane with slide-in drawer panel"
```

---

### Task 3: Update AIChat — Remove Split-Pane, Chat 100% Width

**Files:**
- Modify: `src/components/ai/AIChat.tsx` — lines 525-773 (the JSX return)

**Interfaces:**
- Consumes: `isDrawerOpen`, `openDrawer`, `closeDrawer` from WorkspaceContext (replaces `activeMobileTab`, `setActiveMobileTab`)
- Produces: Full-width chat layout, imports `WorkspaceDrawer` instead of `WorkspaceCanvas`

**Key changes:**
1. Remove mobile toggle header (lines 528-543)
2. Remove split-pane CSS (`lg:max-w-[40%]`, `border-r`)
3. Chat pane takes `w-full` (no max-width constraint on the outer div)
4. Import `WorkspaceDrawer` instead of `WorkspaceCanvas`
5. Render `<WorkspaceDrawer />` at the end (it's a fixed-position overlay, not a flex child)
6. Remove `activeMobileTab` and `setActiveMobileTab` usage

- [ ] **Step 1: Update imports**

Change:
```tsx
import { useWorkspace } from "./WorkspaceContext"
import WorkspaceCanvas from "./WorkspaceCanvas"
```
To:
```tsx
import { useWorkspace } from "./WorkspaceContext"
import WorkspaceDrawer from "./WorkspaceDrawer"
```

- [ ] **Step 2: Update workspace context destructuring**

Change:
```tsx
const { activeMobileTab, setActiveMobileTab, setToolInvocations, setIsStreaming: setWorkspaceIsStreaming } = useWorkspace()
```
To:
```tsx
const { setToolInvocations, setIsStreaming: setWorkspaceIsStreaming } = useWorkspace()
```

- [ ] **Step 3: Remove mobile toggle header (lines 528-543)**

Delete the entire block:
```tsx
{/* Mobile Tab Toggle Header */}
{!isSidebar && (
  <div className="lg:hidden absolute top-0 left-0 right-0 h-10 border-b border-border bg-background flex z-20">
    ...buttons...
  </div>
)}
```

- [ ] **Step 4: Update chat pane container class**

Change:
```tsx
isSidebar
  ? "flex-1 flex flex-col h-full bg-background relative overflow-hidden"
  : `flex-1 flex flex-col h-full relative ${activeMobileTab === "chat" ? "flex" : "hidden lg:flex"} lg:max-w-[40%] border-r border-border pt-10 lg:pt-0`
```
To:
```tsx
isSidebar
  ? "flex-1 flex flex-col h-full bg-background relative overflow-hidden"
  : "flex-1 flex flex-col h-full relative bg-background"
```

- [ ] **Step 5: Replace WorkspaceCanvas with WorkspaceDrawer**

Change:
```tsx
{/* Workspace Pane */}
{!isSidebar && (
  <div className={`flex-1 h-full ${activeMobileTab === "workspace" ? "flex" : "hidden lg:flex"} lg:max-w-[60%] pt-10 lg:pt-0`}>
    <WorkspaceCanvas />
  </div>
)}
```
To:
```tsx
{/* Workspace Drawer (slides in from right) */}
{!isSidebar && <WorkspaceDrawer />}
```

- [ ] **Step 6: Verify no TypeScript errors**

Run: `node node_modules/typescript/lib/tsc.js --noEmit`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/components/ai/AIChat.tsx
git commit -m "refactor(chat): remove split-pane, chat takes full width with drawer"
```

---

### Task 4: Update Artifact Routing — Open Drawer Instead of Switching Tabs

**Files:**
- Modify: `src/components/ai/ChatMessage.tsx` — `WorkspaceArtifactRouter` component (lines ~440-478)

**Interfaces:**
- Consumes: `openDrawer` from WorkspaceContext (replaces implicit tab-switching via `setActiveArtifact`)
- Produces: Calls `setActiveArtifact` + `openDrawer()` when artifact is routed

**Key change:** When `WorkspaceArtifactRouter` sets the artifact, it should also call `openDrawer()` so the drawer slides in automatically.

- [ ] **Step 1: Update WorkspaceArtifactRouter to open drawer**

Find the `WorkspaceArtifactRouter` component. It currently calls `setActiveArtifact(...)`. Add `openDrawer()` call after it.

In the `useEffect` inside `WorkspaceArtifactRouter`, change:
```tsx
setActiveArtifact({ id: contentId, title: label, content, type: artifactType })
```
To:
```tsx
setActiveArtifact({ id: contentId, title: label, content, type: artifactType })
openDrawer()
```

And in the `handleView` function (the "View in Canvas" button click handler), change:
```tsx
setActiveArtifact({ id: contentId, title: label, content, type: artifactType })
```
To:
```tsx
setActiveArtifact({ id: contentId, title: label, content, type: artifactType })
openDrawer()
```

Also update the `useWorkspace()` destructuring inside `WorkspaceArtifactRouter` to include `openDrawer`:
```tsx
const { setActiveArtifact, openDrawer } = useWorkspace()
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `node node_modules/typescript/lib/tsc.js --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/ai/ChatMessage.tsx
git commit -m "fix(workspace): open drawer automatically when artifact is generated"
```

---

### Task 5: Fix HITL Cancel Button

**Files:**
- Modify: `src/components/ai/HITLConfirmForm.tsx`

**Interfaces:**
- Consumes: `onCancel` prop (already exists but wired to empty function in AIChat)
- Produces: Cancel button calls `onCancel()` to dismiss the form

- [ ] **Step 1: Check current HITLConfirmForm Cancel button**

Read `src/components/ai/HITLConfirmForm.tsx` to find the Cancel button. It should already have an `onClick={onCancel}` handler. The issue is in `AIChat.tsx` where `onCancel` is wired to `() => {}`.

- [ ] **Step 2: Wire Cancel to dismiss in AIChat.tsx**

In `AIChat.tsx`, find where `HITLConfirmForm` is rendered (around line 842). Change the `onCancel` prop from `() => {}` to a function that removes the confirmation from view.

The simplest approach: since HITLConfirmForm is rendered inside `ChatMessage`, we need to pass a cancel handler down. But looking at the code, `onToolConfirm` is already passed to `ChatMessage` which passes it to `HITLConfirmForm`. We need to also pass `onToolCancel`.

In `AIChat.tsx`, add a `handleToolCancel` callback and pass it to `ChatMessage`:

```tsx
const handleToolCancel = useCallback(() => {
  // The HITL form is rendered inside ChatMessage.
  // Since we can't easily remove it from the message stream,
  // we'll just let it stay but the cancel action is a no-op visual feedback.
  // The user can scroll past it or start a new conversation.
}, [])
```

Then pass it to ChatMessage:
```tsx
onToolCancel={handleToolCancel}
```

Actually, the cleanest fix: make the HITLConfirmForm collapse/hide itself when Cancel is clicked by using local state. Let's do this inside `HITLConfirmForm.tsx` instead.

- [ ] **Step 3: Add collapsed state to HITLConfirmForm**

In `HITLConfirmForm.tsx`, add a `isCancelled` local state. When Cancel is clicked, set `isCancelled = true` and the form shows nothing (or a small "Cancelled" text).

```tsx
const [isCancelled, setIsCancelled] = useState(false)

if (isCancelled) {
  return null
}
```

Then wire the Cancel button:
```tsx
<Button variant="ghost" onClick={() => setIsCancelled(true)} ...>
  Cancel
</Button>
```

- [ ] **Step 4: Verify no TypeScript errors**

Run: `node node_modules/typescript/lib/tsc.js --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/ai/HITLConfirmForm.tsx
git commit -m "fix(hitl): cancel button dismisses the confirmation form"
```

---

### Task 6: Final Integration — Full Verification

**Files:** No new files. Run full verification.

- [ ] **Step 1: Run all tests**

Run: `npm run test`
Expected: All 148 tests pass

- [ ] **Step 2: Run TypeScript check**

Run: `node node_modules/typescript/lib/tsc.js --noEmit`
Expected: PASS

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: PASS (no new errors in modified files)

- [ ] **Step 4: Verify drawer opens on artifact generation**

Manually verify (or via code review):
1. When `WorkspaceArtifactRouter` mounts with content → `setActiveArtifact` + `openDrawer()` called
2. Drawer slides in from right with artifact content
3. Close button (X) calls `closeDrawer()` → drawer slides out
4. Mobile: overlay backdrop visible, clicking it closes drawer
5. CanvasTab renders inside drawer with Copy/Download/Edit actions

- [ ] **Step 5: Commit (if any final fixes needed)**

```bash
git add -A
git commit -m "chore(workspace): final integration verification"
```
