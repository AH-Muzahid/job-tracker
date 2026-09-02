"use client"

import { createContext, useContext, useState, useCallback } from "react"
import { type ToolInvocation } from "./AIChat"
import type { AgentPlanStep } from "@/lib/ai/graph/state"

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
  plan: AgentPlanStep[]
  setPlan: (plan: AgentPlanStep[]) => void
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
  plan: [],
  setPlan: () => {},
  isStreaming: false,
  setIsStreaming: () => {},
  isDrawerOpen: false,
  openDrawer: () => {},
  closeDrawer: () => {},
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [activeArtifact, setActiveArtifact] = useState<Artifact | null>(null)
  const [toolInvocations, setToolInvocations] = useState<ToolInvocation[]>([])
  const [plan, setPlan] = useState<AgentPlanStep[]>([])
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
        plan,
        setPlan,
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
