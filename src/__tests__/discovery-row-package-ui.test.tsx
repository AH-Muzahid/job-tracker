import { describe, it, expect, vi } from "vitest"
import React from "react"
import { renderToString } from "react-dom/server"
import { DiscoveryJobRow } from "@/components/discovery/DiscoveryJobRow"
import type { ExternalJobOpportunity } from "@/lib/discovery/types"

describe("Discovery Job Row 1-Click Package & Stage UI (CAG-05)", () => {
  const baseJob: ExternalJobOpportunity = {
    id: "job-stripe-100",
    title: "Senior Full Stack Engineer",
    company: "Stripe",
    location: "Remote, US",
    url: "https://stripe.com/jobs/senior-full-stack",
    sourceBoard: "curated",
    tags: ["React", "TypeScript", "Node.js"],
    fitScore: 92,
    matchRationale: "Perfect alignment with React and TypeScript background",
    descriptionSnippet: "Architect payment flows with high reliability",
    visaSponsorship: "available",
    employmentType: "full-time",
    isSaved: false,
    appliedStatus: null,
    applicationId: null,
  }

  it("renders 'Package & Stage' primary CTA button when opportunity is not staged", () => {
    const html = renderToString(
      <DiscoveryJobRow
        job={baseJob}
        isSaved={false}
        isSaving={false}
        isPackaging={false}
        isStaged={false}
        onSave={() => {}}
        onPackage={() => {}}
      />
    )

    expect(html).toContain("Package &amp; Stage")
    expect(html).toContain("Save")
    expect(html).not.toContain("Staged")
    expect(html).not.toContain("Packaging...")
  })

  it("renders 'Packaging...' loading spinner state during package mutation", () => {
    const html = renderToString(
      <DiscoveryJobRow
        job={baseJob}
        isSaved={false}
        isSaving={false}
        isPackaging={true}
        isStaged={false}
        onSave={() => {}}
        onPackage={() => {}}
      />
    )

    expect(html).toContain("Packaging...")
    expect(html).toContain("animate-spin")
    expect(html).not.toContain("Package &amp; Stage")
  })

  it("renders 'Staged' badge-link to Workbench when isStaged is true", () => {
    const html = renderToString(
      <DiscoveryJobRow
        job={baseJob}
        isSaved={true}
        isSaving={false}
        isPackaging={false}
        isStaged={true}
        stagedApplicationId="app-staging-777"
        onSave={() => {}}
        onPackage={() => {}}
      />
    )

    expect(html).toContain("Staged")
    expect(html).toContain('href="/applications/app-staging-777"')
    expect(html).not.toContain("Package &amp; Stage")
    expect(html).not.toContain("Packaging...")
  })

  it("renders 'Staged' link if job.appliedStatus is STAGED from server", () => {
    const stagedJob: ExternalJobOpportunity = {
      ...baseJob,
      appliedStatus: "STAGED",
      applicationId: "app-server-staged-888",
    }

    const html = renderToString(
      <DiscoveryJobRow
        job={stagedJob}
        isSaved={true}
        isSaving={false}
        isPackaging={false}
        onSave={() => {}}
        onPackage={() => {}}
      />
    )

    expect(html).toContain("Staged")
    expect(html).toContain('href="/applications/app-server-staged-888"')
  })

  it("STRICT PROHIBITION: Never renders the Sparkles icon or any sparkles reference", () => {
    const html = renderToString(
      <DiscoveryJobRow
        job={baseJob}
        isSaved={false}
        isSaving={false}
        isPackaging={false}
        isStaged={false}
        onSave={() => {}}
        onPackage={() => {}}
      />
    )

    expect(html.toLowerCase()).not.toContain("sparkles")
    expect(html.toLowerCase()).not.toContain("sparkle")
    expect(html).not.toContain("lucide-sparkles")
  })
})
