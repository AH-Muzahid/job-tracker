import { describe, it, expect } from "vitest"
import {
  getCompanyEnrichment,
  inferCompanyMetadataFromJob,
  KNOWN_COMPANY_DIRECTORY,
} from "@/lib/discovery/company-enrichment"

describe("Company Profile Enrichment Engine (REC-10)", () => {
  describe("Curated Verified Directory", () => {
    it("returns verified metadata for prominent global tech companies", () => {
      const vercelIntel = getCompanyEnrichment("Vercel, Inc.")
      expect(vercelIntel.verified).toBe(true)
      expect(vercelIntel.stage).toContain("Series D")
      expect(vercelIntel.industry).toContain("Developer Tools")
      expect(vercelIntel.isRemoteFirst).toBe(true)
      expect(vercelIntel.cultureHighlights).toContain("Next.js & Frontend Cloud")

      const gitlabIntel = getCompanyEnrichment("GitLab")
      expect(gitlabIntel.verified).toBe(true)
      expect(gitlabIntel.stage).toContain("Public")
      expect(gitlabIntel.isRemoteFirst).toBe(true)
      expect(gitlabIntel.cultureHighlights).toContain("100% Remote-First Pioneer")
    })

    it("returns verified metadata for prominent regional tech hubs in Bangladesh", () => {
      const bs23Intel = getCompanyEnrichment("Brain Station 23 Ltd.")
      expect(bs23Intel.verified).toBe(true)
      expect(bs23Intel.headcount).toContain("700+")
      expect(bs23Intel.cultureHighlights).toContain("Premier Bangladesh Tech Exporter")

      const sjIntel = getCompanyEnrichment("SJ Innovation LLC")
      expect(sjIntel.verified).toBe(true)
      expect(sjIntel.isRemoteFirst).toBe(true)
    })
  })

  describe("Heuristic Contextual Inference", () => {
    it("infers funding stage, headcount, domain, and remote culture from job text", () => {
      const enrichment = inferCompanyMetadataFromJob("HyperScale Labs", {
        description:
          "We are a fast-growing Series B startup with 120 employees building high-throughput fintech and payments APIs. We are a fully remote, async-first team offering equity and continuous learning budgets.",
        location: "Remote",
      })

      expect(enrichment.verified).toBe(false)
      expect(enrichment.stage).toBe("SERIES B")
      expect(enrichment.headcount).toContain("120 employees")
      expect(enrichment.industry).toBe("Fintech & Payments")
      expect(enrichment.isRemoteFirst).toBe(true)
      expect(enrichment.cultureHighlights).toContain("Remote-First Culture")
      expect(enrichment.cultureHighlights).toContain("Async Work Principles")
      expect(enrichment.cultureHighlights).toContain("Equity Offering")
    })

    it("detects AI/ML domain and Y Combinator early stage from description", () => {
      const enrichment = inferCompanyMetadataFromJob("CognitiveFlow", {
        description:
          "Backed by Y Combinator (YC W24), our early stage team of 15 engineers is creating frontier generative AI and LLM agents.",
        location: "San Francisco, CA",
      })

      expect(enrichment.stage).toBe("Seed / Early Stage")
      expect(enrichment.industry).toBe("AI & Machine Learning")
      expect(enrichment.headcount).toBe("10–50")
    })

    it("handles unknown companies with no context gracefully", () => {
      const enrichment = getCompanyEnrichment("Random Mystery Corp")
      expect(enrichment.companyName).toBe("Random Mystery Corp")
      expect(enrichment.verified).toBe(false)
    })

    it("handles empty or falsy company name safely", () => {
      const enrichment = getCompanyEnrichment("")
      expect(enrichment.companyName).toBe("Unknown")
    })
  })
})
