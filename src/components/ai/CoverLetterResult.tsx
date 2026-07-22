"use client"

import { Button } from "@/components/ui/button"
import { Copy, Download } from "lucide-react"
import { toast } from "sonner"

interface Props {
  content: string
}

export default function CoverLetterResult({ content }: Props) {
  function handleCopy() {
    navigator.clipboard.writeText(content)
    toast.success("Copied to clipboard")
  }

  function handleDownload() {
    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "cover-letter.txt"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border bg-muted/30 p-4 whitespace-pre-wrap text-sm leading-relaxed">
        {content}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
          <Copy className="h-3.5 w-3.5" /> Copy
        </Button>
        <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1.5">
          <Download className="h-3.5 w-3.5" /> Download
        </Button>
      </div>
    </div>
  )
}
