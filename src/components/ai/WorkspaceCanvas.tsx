"use client"

import React, { useState, useEffect } from "react"
import { useWorkspace } from "./WorkspaceContext"
import TerminalTab from "./TerminalTab"
import CanvasTab from "./CanvasTab"

// Dummy placeholders for MiniBoard tabs to avoid compiler warnings

function MiniBoardTab() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] text-muted-foreground text-xs font-sans">
      <span>Board Tab Placeholder</span>
    </div>
  )
}

export default function WorkspaceCanvas() {
  const [activeTab, setActiveTab] = useState<"canvas" | "terminal" | "board">("terminal")
  const { activeArtifact } = useWorkspace()

  // Auto-focus / switch to the [Canvas] tab when a document artifact is generated
  useEffect(() => {
    if (activeArtifact) {
      setActiveTab("canvas")
    }
  }, [activeArtifact])

  return (
    <div className="flex flex-col h-full w-full bg-card border-l border-border select-none">
      {/* Tab Navigation header */}
      <div className="h-10 border-b border-border flex items-center bg-muted/30 px-4 shrink-0 justify-between">
        <div className="flex gap-2">
          {(["canvas", "terminal", "board"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`text-xs font-semibold px-3 py-1 rounded-none border-b-2 transition-all cursor-pointer ${
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
      
      {/* Tab Contents area */}
      <div className="flex-1 overflow-y-auto p-4 bg-background">
        {activeTab === "canvas" && <CanvasTab />}
        {activeTab === "terminal" && <TerminalTab />}
        {activeTab === "board" && <MiniBoardTab />}
      </div>
    </div>
  )
}
