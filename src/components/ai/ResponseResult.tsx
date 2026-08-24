"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Copy, MessageSquareReply } from "lucide-react"
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
    toast.success("Draft copied to clipboard")
  }

  return (
    <Card className="rounded-xl border border-border/80 bg-card/70 backdrop-blur-2xl shadow-xs overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-foreground pb-2 border-b border-border/50">
          <MessageSquareReply className="h-4 w-4 text-indigo-500" />
          <span>Recruiter Message Response</span>
        </div>
        {classification && (
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Message Classification</p>
            <p className="text-xs text-foreground">{classification}</p>
            <Badge variant="outline" className="mt-2 text-[10px] font-mono border-primary/20 bg-primary/5 text-primary">
              {classification.toLowerCase().includes("rejection") ? "Rejection Notice" :
               classification.toLowerCase().includes("interview") ? "Interview Invitation" :
               classification.toLowerCase().includes("screening") ? "Screening Request" : "General Message"}
            </Badge>
          </div>
        )}
        {draft && (
          <>
            <Button variant="outline" size="sm" onClick={() => setShowDraft(!showDraft)} className="h-7 text-xs rounded-lg gap-1 font-semibold">
              {showDraft ? "Hide" : "Show"} Draft Response
            </Button>
            {showDraft && (
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5 whitespace-pre-wrap text-xs font-mono leading-relaxed text-foreground">
                {draft}
                <div className="mt-3">
                  <Button variant="outline" size="sm" onClick={handleCopy} className="h-7 text-xs rounded-lg gap-1.5 font-semibold">
                    <Copy className="h-3.5 w-3.5" /> Copy Draft
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
