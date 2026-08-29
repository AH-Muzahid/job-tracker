"use client"

import { createContext, useContext, useState } from "react"
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

const fallbackContext: WorkspaceContextProps = {
  activeArtifact: null,
  setActiveArtifact: () => {},
  toolInvocations: [],
  setToolInvocations: () => {},
  isStreaming: false,
  setIsStreaming: () => {},
  activeMobileTab: "chat",
  setActiveMobileTab: () => {},
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [activeArtifact, setActiveArtifact] = useState<Artifact | null>(null)
  const [toolInvocations, setToolInvocations] = useState<ToolInvocation[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [activeMobileTab, setActiveMobileTab] = useState<"chat" | "workspace">("chat")

  return (
    <WorkspaceContext.Provider
      value={{
        activeArtifact,
        setActiveArtifact,
        toolInvocations,
        setToolInvocations,
        isStreaming,
        setIsStreaming,
        activeMobileTab,
        setActiveMobileTab,
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
