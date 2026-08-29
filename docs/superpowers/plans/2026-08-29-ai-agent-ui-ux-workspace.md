# AI Agent Workspace UI/UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a responsive split-pane Workspace Canvas for CareerTrack AI Assistant, with dedicated preview tabs (Canvas, Terminal, Board), interactive HITL forms, and real-time dashboard sync.

**Architecture:** Split-pane CSS Grid (Left: Chat 40%, Right: Workspace 60%) transitioning to toggle-tabs on mobile. Renders active document artifacts in the Canvas tab, tool execution runs/costs in the Terminal tab, and an optimistically updated Board tab.

**Tech Stack:** React 19, Tailwind CSS, Lucide React, TanStack Query

---

## Global Constraints
- Renders button borders and styles as `rounded-none` and text-only buttons without icons where requested.
- Preserves full responsiveness, adapting to single pane on mobile (below 1024px) with top toggles.

---

## File Structure

| Path | Purpose |
|------|---------|
| `src/components/ai/WorkspaceContext.tsx` | New React context to share Workspace State |
| `src/components/ai/WorkspaceCanvas.tsx` | Right pane rendering tabs (Canvas, Terminal, Board) |
| `src/components/ai/CanvasTab.tsx` | Document view, copy text, download text, inline edit |
| `src/components/ai/TerminalTab.tsx` | Live tool run streams, duration, tokens, cost estimates |
| `src/components/ai/MiniBoardTab.tsx` | Simplified vertical Kanban board |
| `src/components/ai/HITLConfirmForm.tsx` | Form inputs for email sending and application actions |

---

### Task 1: Workspace Context and Layout Scaffold

**Files:**
- Create: `src/components/ai/WorkspaceContext.tsx`
- Modify: `src/app/(app)/ai-assistant/page.tsx`
- Modify: `src/components/ai/AIChat.tsx`

**Interfaces:**
- Produces: `WorkspaceProvider`, `useWorkspace()` hook.
- State properties: `activeArtifact` (content, type, title, id), `activeRun` (toolInvocations, isStreaming), `activeMobileTab` ('chat' | 'workspace').

- [ ] **Step 1: Create WorkspaceContext.tsx**

```typescript
import React, { createContext, useContext, useState } from "react"
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
  activeMobileTab: "chat" | "workspace"
  setActiveMobileTab: (tab: "chat" | "workspace") => void
}

const WorkspaceContext = createContext<WorkspaceContextProps | undefined>(undefined)

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [activeArtifact, setActiveArtifact] = useState<Artifact | null>(null)
  const [toolInvocations, setToolInvocations] = useState<ToolInvocation[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [activeMobileTab, setActiveMobileTab] = useState<"chat" | "workspace">("chat")

  return (
    <WorkspaceContext.Provider value={{
      activeArtifact,
      setActiveArtifact,
      toolInvocations,
      setToolInvocations,
      isStreaming,
      setIsStreaming,
      activeMobileTab,
      setActiveMobileTab
    }}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (!context) throw new Error("useWorkspace must be used within a WorkspaceProvider")
  return context
}
```

- [ ] **Step 2: Wrap page.tsx with WorkspaceProvider**

In `src/app/(app)/ai-assistant/page.tsx`, import `WorkspaceProvider` and wrap the returned markup:
```typescript
import { WorkspaceProvider } from "@/components/ai/WorkspaceContext"

// Wrap the return container:
return (
  <WorkspaceProvider>
    <div className="flex h-[calc(100vh-3.5rem)] w-full overflow-hidden">
      {/* ... */}
    </div>
  </WorkspaceProvider>
)
```

- [ ] **Step 3: Modify AIChat.tsx layout for split-pane**

Read `src/components/ai/AIChat.tsx` around rendering block. Rewrite layout container to support desktop side-by-side split and mobile toggle:
```typescript
import { useWorkspace } from "./WorkspaceContext"
import WorkspaceCanvas from "./WorkspaceCanvas"

// Inside AIChat component:
const { activeMobileTab, setActiveMobileTab } = useWorkspace()

// In the returned markup:
return (
  <div className="flex h-full w-full overflow-hidden bg-background">
    {/* Mobile Tab Toggle Header */}
    <div className="lg:hidden absolute top-0 left-0 right-0 h-10 border-b border-border bg-background flex z-20">
      <button
        onClick={() => setActiveMobileTab("chat")}
        className={`flex-1 text-xs font-medium border-r border-border rounded-none ${activeMobileTab === "chat" ? "bg-muted text-foreground" : "text-muted-foreground"}`}
      >
        Chat
      </button>
      <button
        onClick={() => setActiveMobileTab("workspace")}
        className={`flex-1 text-xs font-medium rounded-none ${activeMobileTab === "workspace" ? "bg-muted text-foreground" : "text-muted-foreground"}`}
      >
        Workspace
      </button>
    </div>

    {/* Chat Pane */}
    <div className={`flex-1 flex flex-col h-full relative ${activeMobileTab === "chat" ? "flex" : "hidden lg:flex"} lg:max-w-[40%] border-r border-border pt-10 lg:pt-0`}>
      {/* Existing chat message/input components go here */}
    </div>

    {/* Workspace Pane */}
    <div className={`flex-1 h-full ${activeMobileTab === "workspace" ? "flex" : "hidden lg:flex"} lg:max-w-[60%] pt-10 lg:pt-0`}>
      <WorkspaceCanvas />
    </div>
  </div>
)
```

- [ ] **Step 4: Commit**

```bash
git add src/components/ai/WorkspaceContext.tsx src/app/(app)/ai-assistant/page.tsx src/components/ai/AIChat.tsx
git commit -m "feat(ui): scaffold split-pane workspace context and layout routing"
```

---

### Task 2: Terminal and Run Metrics Tab

**Files:**
- Create: `src/components/ai/TerminalTab.tsx`
- Create: `src/components/ai/WorkspaceCanvas.tsx`

**Interfaces:**
- Consumes: `toolInvocations` from `useWorkspace()`.
- Renders: Duration/latency timer, calculated cost ($0.15/1M input, $0.60/1M output), and agent steps listing.

- [ ] **Step 1: Create WorkspaceCanvas.tsx with Tab headers**

```typescript
import React, { useState } from "react"
import { useWorkspace } from "./WorkspaceContext"
import CanvasTab from "./CanvasTab"
import TerminalTab from "./TerminalTab"
import MiniBoardTab from "./MiniBoardTab"

export default function WorkspaceCanvas() {
  const [activeTab, setActiveTab] = useState<"canvas" | "terminal" | "board">("terminal")
  const { activeArtifact } = useWorkspace()

  // Auto-switch to canvas if a new artifact is generated
  React.useEffect(() => {
    if (activeArtifact) {
      setActiveTab("canvas")
    }
  }, [activeArtifact])

  return (
    <div className="flex flex-col h-full w-full bg-card border-l border-border select-none">
      <div className="h-10 border-b border-border flex items-center bg-muted/30 px-4 shrink-0 justify-between">
        <div className="flex gap-2">
          {["canvas", "terminal", "board"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`text-xs font-semibold px-3 py-1 rounded-none border-b-2 transition-all ${
                activeTab === tab
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "canvas" && <CanvasTab />}
        {activeTab === "terminal" && <TerminalTab />}
        {activeTab === "board" && <MiniBoardTab />}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create TerminalTab.tsx**

```typescript
import React from "react"
import { useWorkspace } from "./WorkspaceContext"
import AgenticProcessViewer from "./AgenticProcessViewer"

export default function TerminalTab() {
  const { toolInvocations } = useWorkspace()

  // Estimate costs & tokens
  const tokenMetrics = React.useMemo(() => {
    let inputs = 0
    let outputs = 0
    // Estimate based on number of tools & message lengths
    inputs = toolInvocations.length * 1500 + 4000
    outputs = toolInvocations.length * 500 + 500
    const cost = (inputs * 0.15) / 1_000_000 + (outputs * 0.60) / 1_000_000
    return { inputs, outputs, cost: cost.toFixed(4) }
  }, [toolInvocations])

  return (
    <div className="space-y-4 font-mono text-xs text-foreground">
      <div className="grid grid-cols-2 gap-2 p-3 bg-muted/40 border border-border">
        <div>
          <span className="text-muted-foreground">ROUTE:</span> OpenAI GPT-4o
        </div>
        <div>
          <span className="text-muted-foreground">COST:</span> ${tokenMetrics.cost}
        </div>
        <div>
          <span className="text-muted-foreground">TOKENS:</span> {tokenMetrics.inputs} in / {tokenMetrics.outputs} out
        </div>
        <div>
          <span className="text-muted-foreground">ACTIONS:</span> {toolInvocations.length} completed
        </div>
      </div>
      <div className="border border-border p-3 bg-card min-h-[300px]">
        <h4 className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 font-sans font-bold">Execution Stream</h4>
        <AgenticProcessViewer toolInvocations={toolInvocations} isStreaming={false} />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ai/WorkspaceCanvas.tsx src/components/ai/TerminalTab.tsx
git commit -m "feat(ui): add workspace tab structure and terminal log panel"
```

---

### Task 3: Canvas Tab and Artifact Viewer

**Files:**
- Create: `src/components/ai/CanvasTab.tsx`

**Interfaces:**
- Consumes: `activeArtifact` from `useWorkspace()`.
- Produces: Rendering of preview, copy content, text download, and inline Markdown edit textarea.

- [ ] **Step 1: Create CanvasTab.tsx**

```typescript
import React, { useState } from "react"
import { useWorkspace } from "./WorkspaceContext"
import { toast } from "sonner"

export default function CanvasTab() {
  const { activeArtifact, setActiveArtifact } = useWorkspace()
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState("")

  React.useEffect(() => {
    if (activeArtifact) {
      setEditText(activeArtifact.content)
    }
  }, [activeArtifact])

  if (!activeArtifact) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-muted-foreground text-xs">
        <span>No active document or artifact generated yet.</span>
      </div>
    )
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(editText)
    toast.success("Copied to clipboard")
  }

  const handleDownload = () => {
    const element = document.createElement("a")
    const file = new Blob([editText], { type: "text/plain" })
    element.href = URL.createObjectURL(file)
    element.download = `${activeArtifact.title.replace(/\s+/g, "_")}.txt`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  const handleSave = () => {
    setIsEditing(false)
    setActiveArtifact({ ...activeArtifact, content: editText })
    toast.success("Changes saved")
  }

  return (
    <div className="flex flex-col h-full w-full space-y-3 font-sans text-xs">
      <div className="flex justify-between items-center border-b border-border pb-2 shrink-0">
        <h3 className="font-bold text-foreground truncate max-w-[200px]">{activeArtifact.title}</h3>
        <div className="flex gap-1.5">
          <button onClick={handleCopy} className="px-2.5 py-1 text-[10px] font-medium border border-border bg-background hover:bg-muted text-foreground transition-colors cursor-pointer rounded-none">
            Copy
          </button>
          <button onClick={handleDownload} className="px-2.5 py-1 text-[10px] font-medium border border-border bg-background hover:bg-muted text-foreground transition-colors cursor-pointer rounded-none">
            Download
          </button>
          {isEditing ? (
            <button onClick={handleSave} className="px-2.5 py-1 text-[10px] font-medium bg-primary text-primary-foreground hover:bg-primary/95 transition-all cursor-pointer rounded-none">
              Save
            </button>
          ) : (
            <button onClick={() => setIsEditing(true)} className="px-2.5 py-1 text-[10px] font-medium border border-border bg-background hover:bg-muted text-foreground transition-colors cursor-pointer rounded-none">
              Edit
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 min-h-[350px]">
        {isEditing ? (
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="w-full h-full min-h-[350px] bg-background border border-border p-3 text-xs font-mono outline-none resize-y"
          />
        ) : (
          <pre className="p-3 bg-muted/20 border border-border rounded-none text-xs leading-relaxed whitespace-pre-wrap select-text font-mono text-foreground">
            {editText}
          </pre>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ai/CanvasTab.tsx
git commit -m "feat(ui): add Canvas artifact preview and editing pane"
```

---

### Task 4: Pipeline Board Tab with Optimistic Sync

**Files:**
- Create: `src/components/ai/MiniBoardTab.tsx`

**Interfaces:**
- Consumes: TanStack Query `["applications"]` keys.
- Produces: Optimistic column shifts when database modification events occur.

- [ ] **Step 1: Create MiniBoardTab.tsx**

```typescript
import React from "react"
import { useQuery } from "@tanstack/react-query"

interface Application {
  id: string
  companyName: string
  jobTitle: string
  status: string
  updatedAt: string
}

const COLUMNS = ["Saved", "Applied", "Assessment", "Interview", "Offer"]

export default function MiniBoardTab() {
  const { data: apps = [] } = useQuery<Application[]>({
    queryKey: ["applications"],
    queryFn: async () => {
      const res = await fetch("/api/applications?limit=100")
      if (res.ok) {
        const json = await res.json()
        return json.applications || json.data || []
      }
      return []
    }
  })

  return (
    <div className="flex gap-2 w-full overflow-x-auto min-h-[350px] py-1 select-none font-sans text-xs">
      {COLUMNS.map((col) => {
        const colApps = apps.filter((a) => a.status.toLowerCase() === col.toLowerCase())
        return (
          <div key={col} className="flex-1 min-w-[120px] bg-muted/20 border border-border p-2 flex flex-col gap-1.5 h-fit">
            <div className="font-bold text-[10px] text-muted-foreground uppercase border-b border-border/50 pb-1 flex justify-between">
              <span>{col}</span>
              <span className="bg-muted px-1.5 py-0.2 rounded-none font-mono">{colApps.length}</span>
            </div>
            <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto pr-0.5">
              {colApps.map((app) => (
                <div key={app.id} className="p-2 border border-border bg-card shadow-2xs">
                  <div className="font-semibold text-[11px] text-foreground truncate">{app.companyName}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{app.jobTitle}</div>
                </div>
              ))}
              {colApps.length === 0 && (
                <div className="text-[10px] text-muted-foreground/55 text-center py-4 border border-dashed border-border/40">
                  Empty
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ai/MiniBoardTab.tsx
git commit -m "feat(ui): add MiniBoard pipeline view tab"
```

---

### Task 5: Interactive HITL Form Editor

**Files:**
- Create: `src/components/ai/HITLConfirmForm.tsx`
- Modify: `src/components/ai/ChatMessage.tsx`

- [ ] **Step 1: Create HITLConfirmForm.tsx**

```typescript
import React, { useState } from "react"

interface HITLConfirmFormProps {
  toolName: string
  args: Record<string, any>
  onConfirm: (args: Record<string, any>) => void
  onCancel: () => void
}

export default function HITLConfirmForm({ toolName, args, onConfirm, onCancel }: HITLConfirmFormProps) {
  const [editedArgs, setEditedArgs] = useState<Record<string, any>>({ ...args })

  const isEmail = toolName === "sendOutreachEmailViaResend"

  const handleChange = (key: string, val: string) => {
    setEditedArgs((prev) => ({ ...prev, [key]: val }))
  }

  return (
    <div className="mt-2 p-3.5 border border-amber-500/35 rounded-none bg-amber-500/5 font-sans text-xs space-y-3">
      <div className="font-semibold text-amber-600 dark:text-amber-400">
        Review Agent Action: {toolName}
      </div>
      
      {isEmail ? (
        <div className="space-y-2">
          <div>
            <label className="block text-[10px] text-muted-foreground uppercase font-bold mb-1">To Email</label>
            <input
              type="text"
              value={editedArgs.to || ""}
              onChange={(e) => handleChange("to", e.target.value)}
              className="w-full bg-background border border-border p-1.5 text-xs outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] text-muted-foreground uppercase font-bold mb-1">Subject</label>
            <input
              type="text"
              value={editedArgs.subject || ""}
              onChange={(e) => handleChange("subject", e.target.value)}
              className="w-full bg-background border border-border p-1.5 text-xs outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] text-muted-foreground uppercase font-bold mb-1">Email Body</label>
            <textarea
              value={editedArgs.body || ""}
              onChange={(e) => handleChange("body", e.target.value)}
              className="w-full bg-background border border-border p-1.5 text-xs min-h-[100px] outline-none"
            />
          </div>
        </div>
      ) : (
        <pre className="p-2 bg-background border border-border overflow-x-auto text-[10px] max-h-[150px] whitespace-pre-wrap">
          {JSON.stringify(editedArgs, null, 2)}
        </pre>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => onConfirm(editedArgs)}
          className="px-3 py-1.5 text-xs font-semibold rounded-none bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
        >
          Confirm
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-xs font-semibold rounded-none bg-muted hover:bg-muted/80 text-muted-foreground cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Wire HITLConfirmForm into ChatMessage.tsx**

Read `src/components/ai/ChatMessage.tsx` confirmation rendering block. Replace static confirmation UI with our interactive `<HITLConfirmForm />`:
```typescript
import HITLConfirmForm from "./HITLConfirmForm"

// Inside message.toolInvocations map:
{tool.state === 'result' && Boolean((tool.result as Record<string, unknown>)?.requiresConfirmation) && (
  <HITLConfirmForm
    toolName={tool.toolName}
    args={tool.args}
    onConfirm={(modifiedArgs) => onToolConfirm?.(tool.toolName, modifiedArgs)}
    onCancel={() => {}}
  />
)}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ai/HITLConfirmForm.tsx src/components/ai/ChatMessage.tsx
git commit -m "feat(ui): make Human-in-the-loop tool confirmations interactive"
```

---

### Task 6: Hook Rich Output Blocks and Final Integration

**Files:**
- Modify: `src/components/ai/ChatMessage.tsx`
- Modify: `src/components/ai/AIChat.tsx`

**Interfaces:**
- Intercepts outreach, resume tailoring, and JD scan output blocks.
- Routes them to `useWorkspace().setActiveArtifact()` instead of rendering inline.

- [ ] **Step 1: Intercept custom code blocks in ChatMessage mdComponents**

In `src/components/ai/ChatMessage.tsx`, edit the custom ReactMarkdown overrides (`mdComponents`) so that rendering of analysis, outreach, and resume types routes them to `useWorkspace().setActiveArtifact()` and displays a placeholder message instead of the code block.

- [ ] **Step 2: Sync active toolInvocations and isStreaming states**

In `src/components/ai/AIChat.tsx`, inside `sendMessage`, push latest stream updates (`toolInvocations`, `isStreaming`) into workspace states via `useWorkspace().setToolInvocations()` and `useWorkspace().setIsStreaming()`.

- [ ] **Step 3: Run build, verification, and tests**

Run tests: `npm run test`
Run lint: `npm run lint`
Run build: `npm run build`

- [ ] **Step 4: Commit**

```bash
git add src/components/ai/ChatMessage.tsx src/components/ai/AIChat.tsx
git commit -m "chore: connect rich output block routing and run build checks"
```
