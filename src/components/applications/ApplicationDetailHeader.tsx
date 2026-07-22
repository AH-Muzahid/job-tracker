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
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold">{companyName}</h1>
        <p className="text-muted-foreground">{jobTitle}</p>
      </div>
      <div className="flex gap-2">
        <Button asChild variant="outline">
          <Link href={`/applications/${applicationId}/edit`}>Edit</Link>
        </Button>
        <Button variant="destructive" onClick={onDelete}>Delete</Button>
      </div>
    </div>
  )
}
