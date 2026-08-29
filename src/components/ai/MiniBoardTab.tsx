"use client"

import React from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import type { Application } from "@/features/applications/application.types"
import { DecorIcon } from "@/components/decor-icon"
import { getCompanyColor, getInitials } from "@/components/dashboard/utils"

const COLUMNS = ["Saved", "Applied", "Assessment", "Interview", "Offer"] as const

interface ApplicationsResponse {
  data: Application[]
  total: number
}

export default function MiniBoardTab() {
  const { data, isLoading } = useQuery<ApplicationsResponse>({
    queryKey: ["applications"],
    queryFn: async () => {
      const res = await fetch("/api/applications?pageSize=100")
      if (!res.ok) throw new Error("Failed to load applications")
      return res.json()
    },
    staleTime: 30_000,
  })

  const apps = data?.data || []

  if (isLoading) {
    return (
      <div className="flex gap-3 w-full overflow-x-auto pb-4 select-none font-sans text-xs min-h-[400px]">
        {COLUMNS.map((col) => (
          <div
            key={col}
            className="flex-1 min-w-[180px] max-w-[220px] bg-muted/10 border border-border p-2.5 flex flex-col gap-2 h-[400px] rounded-lg relative animate-pulse"
          >
            <DecorIcon className="size-2.5 text-muted-foreground/30" position="top-left" />
            <DecorIcon className="size-2.5 text-muted-foreground/30" position="top-right" />
            <DecorIcon className="size-2.5 text-muted-foreground/30" position="bottom-left" />
            <DecorIcon className="size-2.5 text-muted-foreground/30" position="bottom-right" />
            <div className="font-bold text-[10px] text-muted-foreground uppercase border-b border-border/50 pb-1.5 flex justify-between items-center px-1 font-mono tracking-wider">
              <span>{col}</span>
              <span className="bg-muted px-1.5 py-0.5 rounded-sm border border-border text-[9px] font-mono text-muted-foreground">
                -
              </span>
            </div>
            <div className="flex-1 flex items-center justify-center text-[10px] text-muted-foreground/40 font-mono">
              LOADING...
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex gap-3 w-full overflow-x-auto pb-4 select-none font-sans text-xs min-h-[400px]">
      {COLUMNS.map((col) => {
        const colApps = apps.filter((a) => a.status.toLowerCase() === col.toLowerCase())

        return (
          <div
            key={col}
            className="flex-1 min-w-[180px] max-w-[220px] bg-muted/10 border border-border p-2.5 flex flex-col gap-2 h-fit rounded-lg relative"
          >
            <DecorIcon className="size-2.5 text-muted-foreground/30" position="top-left" />
            <DecorIcon className="size-2.5 text-muted-foreground/30" position="top-right" />
            <DecorIcon className="size-2.5 text-muted-foreground/30" position="bottom-left" />
            <DecorIcon className="size-2.5 text-muted-foreground/30" position="bottom-right" />

            <div className="font-bold text-[10px] text-muted-foreground uppercase border-b border-border/50 pb-1.5 flex justify-between items-center px-1 font-mono tracking-wider">
              <span>{col}</span>
              <span className="bg-muted px-1.5 py-0.5 rounded-sm border border-border text-[9px] font-mono text-muted-foreground">
                {colApps.length}
              </span>
            </div>

            <div className="flex flex-col gap-2 max-h-[350px] overflow-y-auto pr-0.5 scrollbar-thin">
              {colApps.map((app) => {
                const initials = getInitials(app.companyName)
                const colorClass = getCompanyColor(app.companyName)
                const formattedDate = app.applicationDate
                  ? new Date(app.applicationDate).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })
                  : ""

                return (
                  <Link
                    key={app.id}
                    href={`/applications/${app.id}`}
                    className="group relative p-2.5 border border-border/80 bg-card hover:bg-muted/30 hover:border-primary/40 transition-all duration-150 rounded-md flex flex-col gap-1.5 shadow-2xs block"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold font-mono tracking-wider border ${colorClass}`}
                      >
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-[11px] text-foreground truncate" title={app.companyName}>
                          {app.companyName}
                        </div>
                      </div>
                    </div>

                    <div className="text-[10px] text-muted-foreground truncate" title={app.jobTitle}>
                      {app.jobTitle}
                    </div>

                    <div className="flex justify-between items-center text-[9px] text-muted-foreground/80 mt-1 font-mono">
                      <span>{app.source || "Direct"}</span>
                      {formattedDate && <span>{formattedDate}</span>}
                    </div>
                  </Link>
                )
              })}

              {colApps.length === 0 && (
                <div className="text-[10px] text-muted-foreground/40 text-center py-6 border border-dashed border-border/40 rounded-md font-mono">
                  EMPTY
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
