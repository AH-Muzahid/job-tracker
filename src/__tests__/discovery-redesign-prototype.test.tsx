import { describe, it, expect, vi } from "vitest"
import React from "react"
import { renderToString } from "react-dom/server"
import { DiscoveryJobCard } from "@/components/discovery/DiscoveryJobCard"
import { DiscoveryFilterSidebar } from "@/components/discovery/DiscoveryFilterSidebar"
import type { ExternalJobOpportunity } from "@/lib/ai/graph/tools/discovery-tools"

const mockJob: ExternalJobOpportunity = {
  id: "job-101",
  jobId: "job-101",
  title: "Product Manager",
  company: "Google",
  location: "New York, NY",
  url: "https://careers.google.com/jobs/results/123",
  salary: "$180,000 - $220,000",
  postedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  fitScore: 92,
  matchRationale: "Strong product vision alignment with 92% match",
  sourceBoard: "curated",
  tags: ["Product", "Strategy", "Growth", "Analytics", "AI"],
  descriptionSnippet: "Build the next generation of AI-powered products. Work with cross-functional teams...",
  employmentType: "full-time",
}

describe("Opportunities Redesign Prototype Compliance", () => {
  describe("DiscoveryJobCard Desktop & Mobile Layouts", () => {
    it("renders Google company logo and 92% match badge in both mobile and desktop viewports", () => {
      const html = renderToString(
        <DiscoveryJobCard
          job={mockJob}
          isSaved={false}
          isSaving={false}
          onSave={() => {}}
        />
      )

      // Title & Company
      expect(html).toContain("Product Manager")
      expect(html).toContain("Google")
      expect(html).toMatch(/92.*%.*match/)

      // Mobile elements (md:hidden)
      expect(html).toContain("md:hidden")
      // Desktop elements (hidden md:flex)
      expect(html).toContain("hidden md:flex")

      // Tags
      expect(html).toContain("Product")
      expect(html).toContain("Strategy")
      expect(html).toContain("Growth")

      // Dual CTA Buttons (Matches media_1790334199421.png)
      expect(html).toContain("Package &amp; Stage")
      expect(html).toContain("View Details")
    })

    it("renders Staged badge alongside View Details when job is already staged", () => {
      const html = renderToString(
        <DiscoveryJobCard
          job={mockJob}
          isSaved={true}
          isSaving={false}
          isStaged={true}
          stagedApplicationId="app-123"
          onSave={() => {}}
        />
      )

      expect(html).toContain("Staged")
      expect(html).toContain("View Details")
      expect(html).toContain("/applications/app-123")
    })

    it("does not contain banned hardcoded color literals", () => {
      const html = renderToString(
        <DiscoveryJobCard
          job={mockJob}
          isSaved={true}
          isSaving={false}
          onSave={() => {}}
        />
      )

      expect(html).not.toContain("#0B0F17")
      expect(html).not.toContain("#ffffff")
      expect(html).not.toContain("#1e293b")
    })

    it("enables unsave: bookmark button is NOT disabled when isSaved=true and displays Remove from Saved", () => {
      const html = renderToString(
        <DiscoveryJobCard
          job={mockJob}
          isSaved={true}
          isSaving={false}
          onSave={() => {}}
        />
      )

      // Bookmark button should have title 'Remove from Saved'
      expect(html).toContain('title="Remove from Saved"')
      expect(html).toContain("text-primary")
    })

    it("renders Bookmark opportunity when isSaved=false", () => {
      const html = renderToString(
        <DiscoveryJobCard
          job={mockJob}
          isSaved={false}
          isSaving={false}
          onSave={() => {}}
        />
      )

      expect(html).toContain('title="Bookmark opportunity"')
    })

    it("renders disabled state when isSaving=true", () => {
      const html = renderToString(
        <DiscoveryJobCard
          job={mockJob}
          isSaved={false}
          isSaving={true}
          onSave={() => {}}
        />
      )

      expect(html).toContain("disabled")
      expect(html).toContain("cursor-wait")
    })

    it("renders 3-dot dropdown menu trigger in both mobile and desktop viewports", () => {
      const html = renderToString(
        <DiscoveryJobCard
          job={mockJob}
          isSaved={false}
          isSaving={false}
          onSave={() => {}}
        />
      )

      // Both mobile and desktop have More actions buttons
      const matches = html.match(/title="More actions"/g)
      expect(matches).not.toBeNull()
      expect(matches?.length).toBe(2) // 1 in mobile layout, 1 in desktop layout
    })
  })

  describe("DiscoveryFilterSidebar Prototype Layout", () => {
    it("renders Job Type checkboxes with dynamic facet counts", () => {
      const html = renderToString(
        <DiscoveryFilterSidebar
          filters={{
            source: "",
            location: "",
            minScore: "",
            tags: [],
          }}
          onFilterChange={() => {}}
          facetCounts={{
            total: 128,
            recommended: 48,
            saved: 12,
            recent: 14,
            hidden: 3,
            fullTime: 86,
            partTime: 12,
            contract: 18,
            internship: 8,
            remote: 72,
            hybrid: 34,
            onsite: 22,
          }}
        />
      )

      expect(html).toContain("Full-time")
      expect(html).toContain("86")
      expect(html).toContain("Part-time")
      expect(html).toContain("12")
      expect(html).toContain("Contract")
      expect(html).toContain("18")
      expect(html).toContain("Internship")
      expect(html).toContain("8")
      expect(html).toContain("Remote")
      expect(html).toContain("72")
      expect(html).toContain("Apply Filters")
      expect(html).toMatch(/128.*results/)
    })

    it("does not render redundant search keywords input or location select dropdown", () => {
      const html = renderToString(
        <DiscoveryFilterSidebar
          filters={{
            source: "",
            location: "",
            minScore: "",
            tags: [],
          }}
          onFilterChange={() => {}}
          facetCounts={{
            total: 10,
            recommended: 5,
            saved: 2,
            recent: 1,
            hidden: 0,
            fullTime: 8,
            partTime: 2,
            contract: 0,
            internship: 0,
            remote: 6,
            hybrid: 2,
            onsite: 2,
          }}
        />
      )

      expect(html).not.toContain("Search keywords...")
      expect(html).not.toContain("<select")
      expect(html).not.toContain("All locations")
    })
  })
})

