"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Copy, Download, FileText } from "lucide-react"
import { toast } from "sonner"

interface Props {
  content: string
}

export default function CoverLetterResult({ content }: Props) {
  function handleCopy() {
    navigator.clipboard.writeText(content)
    toast.success("Cover letter copied to clipboard")
  }

  function handleDownload() {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "cover-letter.txt"
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 200)
  }

  return (
    <Card className="rounded-xl border border-border/80 bg-card/70 backdrop-blur-2xl shadow-xs overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-foreground pb-2 border-b border-border/50">
          <FileText className="h-4 w-4 text-indigo-500" />
          <span>Cover Letter Draft</span>
        </div>
        <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5 whitespace-pre-wrap text-xs leading-relaxed text-foreground font-mono">
          {content}
        </div>
        <div className="flex gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={handleCopy} className="h-7 text-xs rounded-lg gap-1.5 font-semibold">
            <Copy className="h-3.5 w-3.5" /> Copy
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload} className="h-7 text-xs rounded-lg gap-1.5 font-semibold">
            <Download className="h-3.5 w-3.5" /> Download
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
