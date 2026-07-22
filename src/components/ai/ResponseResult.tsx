"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Copy } from "lucide-react"
import { toast } from "sonner"
import { useState } from "react"

interface Props {
  content: string
}

export default function ResponseResult({ content }: Props) {
  const [showDraft, setShowDraft] = useState(false)

  const sections = content.split("\n\n").filter(Boolean)
  const classification = sections[0] || ""
  const draft = sections.slice(1).join("\n\n")

  function handleCopy() {
    navigator.clipboard.writeText(draft)
    toast.success("Copied to clipboard")
  }

  return (
    <div className="space-y-3">
      {classification && (
        <div className="rounded-lg border p-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">Classification</p>
          <p className="text-sm">{classification}</p>
          <Badge variant="secondary" className="mt-2 text-[10px]">
            {classification.includes("rejection") ? "Rejection" :
             classification.includes("interview") ? "Interview" :
             classification.includes("screening") ? "Screening" : "General"}
          </Badge>
        </div>
      )}
      {draft && (
        <>
          <Button variant="outline" size="sm" onClick={() => setShowDraft(!showDraft)} className="gap-1">
            {showDraft ? "Hide" : "Show"} Draft Response
          </Button>
          {showDraft && (
            <div className="rounded-lg border bg-muted/30 p-4 whitespace-pre-wrap text-sm">
              {draft}
              <div className="mt-3">
                <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1">
                  <Copy className="h-3.5 w-3.5" /> Copy Draft
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
