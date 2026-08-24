"use client"

import Link from "next/link"
import { ArrowLeft, Mic, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
  companyName: string
  jobTitle: string
  applicationId: string
  onDelete: () => void
}

export default function ApplicationDetailHeader({ companyName, jobTitle, applicationId, onDelete }: Props) {
  const cleanCompanyName = companyName.replace(/\s*\(inferred from.*?\)\s*/gi, "").trim()

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
        <Link href="/applications" className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
          <ArrowLeft className="h-3 w-3" />
          Applications
        </Link>
        <span>/</span>
        <span className="text-foreground truncate">{cleanCompanyName}</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{cleanCompanyName}</h1>
          <p className="text-sm font-medium text-muted-foreground mt-0.5">{jobTitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" className="h-9 rounded-md font-semibold text-sm cursor-pointer shadow-xs px-3.5">
            <Link href={`/interview-prep?appId=${applicationId}&company=${encodeURIComponent(cleanCompanyName)}&role=${encodeURIComponent(jobTitle)}`}>
              <Mic className="h-4 w-4 mr-1.5" /> Mock Prep Room
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="h-9 rounded-md text-sm font-medium cursor-pointer px-3.5">
            <Link href={`/applications/${applicationId}/edit`}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
            </Link>
          </Button>
          <Button variant="ghost" size="sm" className="h-9 rounded-md text-sm text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer px-3" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
          </Button>
        </div>
      </div>
    </div>
  )
}
