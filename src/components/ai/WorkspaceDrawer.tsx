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
