"use client"

import { DecorIcon } from "@/components/decor-icon"
import { FullWidthDivider } from "@/components/full-width-divider"
import StatsSection from "@/components/stats"

export default function Stats() {
  return (
    <section>
      <div className="relative">
        <DecorIcon className="size-4" position="top-left" />
        <DecorIcon className="size-4" position="top-right" />

        <FullWidthDivider className="-top-px" />
        <div className="px-4 py-10 md:px-8 md:py-14">
          <StatsSection
            title="Trusted by Job Seekers Worldwide"
            description="Real results from our community of ambitious professionals"
            items={[
              {
                value: "12.5K+",
                label: "Active Job Seekers",
                subtext: "Trust CareerTrack to manage their search",
              },
              {
                value: "247K+",
                label: "Applications Tracked",
                subtext: "Nothing slips through the cracks",
              },
              {
                value: "8.9K+",
                label: "Interviews Scheduled",
                subtext: "AI-powered prep lands more interviews",
              },
              {
                value: "3.2K+",
                label: "Offers Received",
                subtext: "Thousands of job offers received",
              },
            ]}
          />
        </div>
        <FullWidthDivider className="-bottom-px" />
      </div>
    </section>
  )
}
