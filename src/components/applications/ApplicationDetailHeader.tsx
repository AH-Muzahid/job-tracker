"use client"

import Link from "next/link"
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
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold">{cleanCompanyName}</h1>
        <p className="text-muted-foreground">{jobTitle}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button asChild size="sm" className="h-9 bg-primary text-primary-foreground font-medium shadow-xs">
          <Link href={`/interview-prep?appId=${applicationId}&company=${encodeURIComponent(cleanCompanyName)}&role=${encodeURIComponent(jobTitle)}`}>
            Prep Room
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="h-9">
          <Link href={`/applications/${applicationId}/edit`}>Edit</Link>
        </Button>
        <Button variant="destructive" size="sm" className="h-9" onClick={onDelete}>Delete</Button>
      </div>
    </div>
  )
}
