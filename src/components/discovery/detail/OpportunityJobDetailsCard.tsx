"use client"

import React, { useMemo } from "react"
import { Building2, MapPin, Calendar, Briefcase, Banknote, Building, Clock } from "lucide-react"
import type { OpportunityDetailData } from "./types"

interface OpportunityJobDetailsCardProps {
  opportunity: OpportunityDetailData
}

export function OpportunityJobDetailsCard({ opportunity }: OpportunityJobDetailsCardProps) {
  const postedTimeAgo = useMemo(() => {
    try {
      const posted = new Date(opportunity.postedAt)
      const diffMs = Date.now() - posted.getTime()
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      if (diffHours < 24) return `${Math.max(1, diffHours)} hours ago`
      const diffDays = Math.floor(diffHours / 24)
      return `${diffDays} days ago`
    } catch {
      return "2 days ago"
    }
  }, [opportunity.postedAt])

  const details = [
    {
      icon: Building2,
      label: "Company",
      value: opportunity.company,
    },
    {
      icon: MapPin,
      label: "Location",
      value: opportunity.isRemote
        ? `${opportunity.location} (Remote)`
        : opportunity.location,
    },
    {
      icon: Calendar,
      label: "Job Type",
      value: opportunity.employmentType || "Full-time",
    },
    {
      icon: Briefcase,
      label: "Experience Level",
      value: opportunity.rationaleParsed?.experienceFit || "Mid / Senior Level",
    },
    {
      icon: Banknote,
      label: "Salary Range",
      value: opportunity.cleanSalary || opportunity.salary || "Competitive / Not disclosed",
    },
    {
      icon: Building,
      label: "Industry",
      value: opportunity.companyEnrichment?.domain || "Technology",
    },
    {
      icon: Clock,
      label: "Posted",
      value: postedTimeAgo,
    },
  ]

  return (
    <div className="bg-card border border-border rounded-[6px] p-5 sm:p-6 shadow-none space-y-4">
      <h3 className="text-base font-bold text-foreground tracking-tight">Job Details</h3>

      <div className="space-y-3.5">
        {details.map((item, idx) => {
          const Icon = item.icon
          return (
            <div key={idx} className="flex items-center gap-3 text-xs sm:text-sm">
              <div className="size-8 rounded-sm border border-border/70 bg-muted/20 flex items-center justify-center shrink-0">
                <Icon className="size-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-medium text-muted-foreground leading-none">{item.label}</div>
                <div className="text-xs sm:text-sm font-semibold text-foreground truncate mt-1">
                  {item.value}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
