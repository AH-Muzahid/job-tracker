"use client"

import React, { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Copy, Check, Download, FileText, Layers, ArrowRight, Loader2 } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

interface Props {
  content: string
  companyName?: string
  role?: string
}

export default function CoverLetterResult({ content, companyName, role }: Props) {
  const [copied, setCopied] = useState(false)
  const [isStaging, setIsStaging] = useState(false)
  const [isStaged, setIsStaged] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(content)
    setCopied(true)
    toast.success("Cover letter copied to clipboard")
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDownload() {
    const filename = companyName
      ? `Cover-Letter-${companyName.replace(/\s+/g, "-")}.txt`
      : "cover-letter.txt"
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 200)
  }

  async function handleStageToBoard() {
    if (!companyName) {
      toast.error("Company name is required to stage this application")
      return
    }

    setIsStaging(true)
    const toastId = toast.loading(`Staging application for ${companyName}...`)

    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          jobTitle: role || "Software Engineer",
          source: "AI Assistant",
          status: "Staged",
          notes: `[Tailored Cover Letter]\n\n${content}`,
          applicationDate: new Date().toISOString(),
        }),
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.error || "Failed to stage application")
      }

      const newApp = await res.json()
      setIsStaged(true)
      toast.success(`Packaged & Staged ${companyName}!`, {
        id: toastId,
        description: "Application staged with tailored cover letter attached.",
        action: {
          label: "View Board",
          onClick: () => window.open(newApp?.id ? `/applications/${newApp.id}` : "/applications", "_blank"),
        },
        duration: 5000,
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to stage application"
      toast.error(msg, { id: toastId })
    } finally {
      setIsStaging(false)
    }
  }

  return (
    <Card className="rounded-[6px] border border-border bg-card shadow-none overflow-hidden my-3">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <FileText className="size-4 text-primary" />
            <span>
              Cover Letter Draft {companyName ? `• ${companyName}` : ""}
            </span>
          </div>
          {role && (
            <span className="text-[11px] font-mono text-muted-foreground">
              {role}
            </span>
          )}
        </div>

        <div className="rounded-[4px] border border-border bg-muted/30 p-3.5 whitespace-pre-wrap text-xs leading-relaxed text-foreground font-sans max-h-80 overflow-y-auto">
          {content}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="h-7 text-xs rounded-sm gap-1.5 font-medium border-border"
          >
            {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
            {copied ? "Copied" : "Copy Draft"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="h-7 text-xs rounded-sm gap-1.5 font-medium border-border"
          >
            <Download className="size-3.5" /> Download (.txt)
          </Button>

          {companyName && (
            <Button
              variant="default"
              size="sm"
              onClick={handleStageToBoard}
              disabled={isStaging || isStaged}
              className="h-7 text-xs rounded-sm gap-1.5 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-none"
            >
              {isStaging ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : isStaged ? (
                <Check className="size-3.5" />
              ) : (
                <Layers className="size-3.5" />
              )}
              {isStaged ? "Staged to Board" : "📦 Package & Stage"}
            </Button>
          )}

          {companyName && (
            <Link
              href={`/resumes?tailor=true&company=${encodeURIComponent(companyName)}${role ? `&role=${encodeURIComponent(role)}` : ""}`}
              className="inline-flex items-center gap-1.5 h-7 px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-sm transition-colors"
            >
              <span>Tailor Resume</span>
              <ArrowRight className="size-3" />
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
