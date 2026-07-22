"use client"

import StatusBadge from "@/components/StatusBadge"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface StatusChange {
  id: string
  fromStatus: string | null
  toStatus: string
  changedAt: string
}

interface TagItem {
  tag: { id: string; name: string }
}

interface Props {
  companyName: string
  jobTitle: string
  source: string
  status: string
  applicationDate: string
  jobUrl: string | null
  tags: TagItem[]
  notes: string | null
  statusChanges: StatusChange[]
  createdAt: string
  updatedAt: string
}

export default function ApplicationDetailsCard({
  companyName, jobTitle, source, status, applicationDate, jobUrl,
  tags, notes, statusChanges, createdAt, updatedAt,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Company</p>
            <p className="font-medium">{companyName}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Job Title</p>
            <p className="font-medium">{jobTitle}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Source</p>
            <p className="font-medium">{source}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <StatusBadge status={status} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Applied Date</p>
            <p className="font-medium">
              {new Date(applicationDate).toLocaleDateString()}
            </p>
          </div>
          {jobUrl && (
            <div>
              <p className="text-sm text-muted-foreground">Job URL</p>
              <a
                href={jobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                View posting
              </a>
            </div>
          )}
        </div>

        {tags.length > 0 && (
          <div>
            <p className="text-sm text-muted-foreground mb-2">Tags</p>
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => (
                <Badge key={t.tag.id} variant="secondary">{t.tag.name}</Badge>
              ))}
            </div>
          </div>
        )}

        {notes && (
          <div>
            <p className="text-sm text-muted-foreground">Notes</p>
            <p className="whitespace-pre-wrap">{notes}</p>
          </div>
        )}

        {statusChanges.length > 1 && (
          <div>
            <p className="text-sm text-muted-foreground mb-2">Status Timeline</p>
            <div className="space-y-2">
              {statusChanges.map((sc) => (
                <div key={sc.id} className="flex items-center gap-3 text-sm">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <span className="text-muted-foreground">
                    {new Date(sc.changedAt).toLocaleString()}
                  </span>
                  {sc.fromStatus && (
                    <>
                      <StatusBadge status={sc.fromStatus} />
                      <span className="text-muted-foreground">&rarr;</span>
                    </>
                  )}
                  <StatusBadge status={sc.toStatus} />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-3 text-xs text-muted-foreground">
          Created: {new Date(createdAt).toLocaleString()}
          <br />
          Updated: {new Date(updatedAt).toLocaleString()}
        </div>
      </CardContent>
    </Card>
  )
}
