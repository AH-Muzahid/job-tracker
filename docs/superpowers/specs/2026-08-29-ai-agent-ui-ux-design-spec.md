# AI Agent UI/UX Workspace Design Specification

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bridge the gap between the current inline chat UI and an ideal AI Agentic UI/UX by implementing a split-pane Workspace Canvas. The left pane hosts clean conversation. The right pane provides dedicated tabs for Artifact Previews (Canvas), Terminal Run Logs/Cost metrics, and a Live Pipeline Board. Human-in-the-Loop confirmations will be fully interactive.

**Architecture:** Split-pane CSS Grid layout. Renders active document artifacts in the Canvas tab. Collects tool calls, token counts, latency, and estimated cost metrics to render in the Terminal tab. Incorporates interactive forms for HITL tool confirmations. Employs TanStack Query optimistic updates to animate pipeline board changes instantaneously.

**Tech Stack:** React 19, Tailwind CSS, Lucide React, TanStack Query, Clerk, Prisma

---

## File Structure

| File | Purpose |
|------|---------|
| `src/components/ai/WorkspaceCanvas.tsx` | NEW — Right pane containing the workspace tabs |
| `src/components/ai/CanvasTab.tsx` | NEW — Document artifact preview, editing, copy, export |
| `src/components/ai/TerminalTab.tsx` | NEW — Tool execution trace, token metrics, financial costs, routing info |
| `src/components/ai/MiniBoardTab.tsx` | NEW — Simplified, vertical Kanban board showing live card updates |
| `src/components/ai/HITLConfirmForm.tsx` | NEW — Interactive forms for editing parameters before tool execution |
| `src/components/ai/AIChat.tsx` | MODIFY — Convert to split-pane layout, wire workspace state |
| `src/components/ai/ChatMessage.tsx` | MODIFY — Remove inline tool logs, delegate artifact output to workspace |
| `src/app/(app)/ai-assistant/page.tsx` | MODIFY — Adjust dimensions to accommodate split-pane without scrolling |

---

## Design Sections

### 1. Split-Pane Layout & State Routing
- Modify `/ai-assistant` page to render a 2-column flex or grid container:
  - Column 1 (Left, 40% width): Chat feed, input dock, and model override selectors.
  - Column 2 (Right, 60% width): `WorkspaceCanvas` component, which is always visible.
- Define a global or page-level context/state `WorkspaceState`:
  - `activeArtifact`: `{ content: string, type: 'email' | 'resume' | 'analysis', title: string, id: string } | null`
  - `activeRun`: `{ toolInvocations: ToolInvocation[], isStreaming: boolean }`
- When a document code block (e.g. `language-outreach`, `language-analysis`, `language-suggestions`, or `language-mermaid`) is rendered in the stream, we intercept it in `ChatMessage.tsx` and route the payload to `activeArtifact` so it displays in the Canvas tab on the right instead of inline.

### 2. Canvas Tab (Artifacts Panel)
- Displays full-screen markdown or plain text preview of the active document.
- Text-only clean buttons (no icons, `rounded-none`, per user preferences):
  - **Copy to Clipboard** — copies full content.
  - **Export Text** — downloads plain text file.
  - **Export PDF** — triggers print/save as PDF.
  - **Edit** — toggles into an inline text editor. Saves back to workspace state and triggers background DB update if linked to an application.

### 3. Terminal Tab (Run Log & Costs)
- Integrates the `AgenticProcessViewer` component.
- Surfaces live metrics at the top of the tab:
  - **Latency:** Accumulated execution time.
  - **Token Usage:** Input and Output counts.
  - **Estimated Cost:** Input ($0.15 / 1M tokens) + Output ($0.60 / 1M tokens) calculated cost.
  - **Provider Route:** Displays model name and fallback details.

### 4. Pipeline Board Tab
- Renders 5 columns vertically: Saved, Applied, Assessment, Interview, Offer.
- Cards display company name, title, and last activity date.
- Uses TanStack Query `queryClient.setQueryData` to perform optimistic cache updates when a mutation tool is called. Cards animate or slide between columns instantly.

### 5. Interactive HITL Confirmations
- Instead of static yes/no buttons, high-risk tools render editable form inputs:
  - `sendOutreachEmailViaResend`: Shows fields for `To`, `Subject`, and a rich `Body` textarea.
  - User can edit fields directly.
  - Clicking "Confirm" dispatches the tool call with the *edited* parameters.
