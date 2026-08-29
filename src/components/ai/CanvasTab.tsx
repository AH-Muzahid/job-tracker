"use client"

import React, { useState, useEffect } from "react"
import { useWorkspace } from "./WorkspaceContext"
import { toast } from "sonner"

export default function CanvasTab() {
  const { activeArtifact, setActiveArtifact } = useWorkspace()
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState("")

  useEffect(() => {
    if (activeArtifact) {
      setEditText(activeArtifact.content)
      setIsEditing(false)
    }
  }, [activeArtifact])

  if (!activeArtifact) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-muted-foreground text-xs font-sans">
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
    toast.success("Download started")
  }

  const handleSave = () => {
    setIsEditing(false)
    setActiveArtifact({ ...activeArtifact, content: editText })
    toast.success("Changes saved")
  }

  return (
    <div className="flex flex-col h-full w-full space-y-3 font-sans text-xs">
      <div className="flex justify-between items-center border-b border-border pb-2 shrink-0">
        <h3 className="font-bold text-foreground truncate max-w-[200px]" title={activeArtifact.title}>
          {activeArtifact.title}
        </h3>
        <div className="flex gap-1.5">
          <button
            onClick={handleCopy}
            className="px-2.5 py-1 text-[10px] font-medium border border-border bg-background hover:bg-muted text-foreground transition-colors cursor-pointer rounded-none"
          >
            Copy
          </button>
          <button
            onClick={handleDownload}
            className="px-2.5 py-1 text-[10px] font-medium border border-border bg-background hover:bg-muted text-foreground transition-colors cursor-pointer rounded-none"
          >
            Download
          </button>
          {isEditing ? (
            <button
              onClick={handleSave}
              className="px-2.5 py-1 text-[10px] font-medium bg-primary text-primary-foreground hover:bg-primary/95 transition-all cursor-pointer rounded-none"
            >
              Save
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="px-2.5 py-1 text-[10px] font-medium border border-border bg-background hover:bg-muted text-foreground transition-colors cursor-pointer rounded-none"
            >
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
