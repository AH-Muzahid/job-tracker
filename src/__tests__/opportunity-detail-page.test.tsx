import { describe, it, expect, vi } from "vitest"
import React from "react"
import { renderToString } from "react-dom/server"
import { OpportunityHeroHeader } from "@/components/discovery/detail/OpportunityHeroHeader"
import { OpportunityJobDetailsCard } from "@/components/discovery/detail/OpportunityJobDetailsCard"
import { OpportunityCopilotCard } from "@/components/discovery/detail/OpportunityCopilotCard"
import { OpportunityMatchScoreCard } from "@/components/discovery/detail/OpportunityMatchScoreCard"
import { OpportunitySimilarStrip } from "@/components/discovery/detail/OpportunitySimilarStrip"
import type { OpportunityDetailData, SimilarOpportunityItem } from "@/components/discovery/detail/types"

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

// Mock useUI
vi.mock("@/lib/store", () => ({
  useUI: () => ({
    setAiSidebarOpen: vi.fn(),
  }),
}))

const mockOpportunity: OpportunityDetailData = {
  id: "opp-google-101",
  matchId: "match-101",
  title: "Product Manager",
  company: "Google",
  location: "New York, NY",
  isRemote: true,
  url: "https://careers.google.com/jobs/results/123",
  sourceBoard: "greenhouse",
  tags: ["Product", "Strategy", "Growth", "Analytics", "AI", "User Research"],
  salary: "$160,000 - $220,000",
  cleanSalary: "$160K – $220K",
  description: `As a Product Manager at Google, you will define and drive the product strategy for AI-powered experiences that help billions of users.
Key Responsibilities:
- Define product vision, strategy, and roadmap
- Work with cross-functional teams to deliver high-impact features
- Conduct user research and market analysis
Qualifications:
- 3+ years of product management experience
- Strong analytical and problem-solving skills`,
  postedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  visaSponsorship: "available",
  employmentType: "Full-time",
  fitScore: 92,
  matchRationale: "Fit: 92% (Skills: 38/40 • Role: 23/25 • Location: 20/20 • Seniority: 11/15)",
  isSaved: false,
  isStaged: false,
  appliedStatus: null,
  applicationId: null,
  scores: {
    overall: 92,
    skillsMatch: 95,
    experienceMatch: 88,
    roleFit: 90,
    companyFit: 93,
  },
  rationaleParsed: {
    scoreBreakdown: "Skills: 38/40 • Role: 23/25 • Location: 20/20 • Seniority: 11/15",
    roleMatch: "Product Manager alignment",
    techStack: "AI, Product Strategy, Analytics",
    experienceFit: "Mid / Senior Level",
    strategyTip: "Highlight scale and cross-functional leadership in resume",
    allPoints: [
      { title: "Skills Match", content: "Strong alignment with product analytics and AI systems" },
    ],
  },
  companyEnrichment: {
    verified: true,
    stage: "Public",
    teamSize: "10,000+",
    domain: "Technology",
    description: "Google is a global technology leader focused on improving information access.",
  },
}

const mockSimilarOpportunities: SimilarOpportunityItem[] = [
  {
    id: "sim-meta",
    jobId: "sim-meta",
    title: "Product Manager",
    company: "Meta",
    location: "New York, NY",
    isRemote: true,
    url: "https://metacareers.com/1",
    fitScore: 88,
    tags: ["Product", "Growth", "AI"],
    isSaved: false,
  },
  {
    id: "sim-apple",
    jobId: "sim-apple",
    title: "Product Manager",
    company: "Apple",
    location: "Cupertino, CA",
    isRemote: false,
    url: "https://apple.com/jobs/2",
    fitScore: 85,
    tags: ["Product", "Strategy", "Platform"],
    isSaved: true,
  },
  {
    id: "sim-amazon",
    jobId: "sim-amazon",
    title: "Senior Product Manager",
    company: "Amazon",
    location: "Seattle, WA",
    isRemote: true,
    url: "https://amazon.jobs/3",
    fitScore: 82,
    tags: ["Product", "E-commerce", "Data"],
    isSaved: false,
  },
]

describe("Opportunity Detail Page Components (Figma Mockup Compliance)", () => {
  describe("OpportunityHeroHeader", () => {
    it("renders Google logo, title, 92% match badge, company name, and verified checkmark", () => {
      const html = renderToString(
        <OpportunityHeroHeader
          opportunity={mockOpportunity}
          isSaved={false}
          isSaving={false}
          isPackaging={false}
          isStaged={false}
          onSaveToggle={() => {}}
          onPackage={() => {}}
        />
      )

      expect(html).toContain("Back to Opportunities")
      expect(html).toContain("Save")
      expect(html).toContain("Share")
      expect(html).toContain("Product Manager")
      expect(html).toContain("Google")
      expect(html).toMatch(/92.*%.*match/)
      expect(html).toContain("New York, NY")
      expect(html).toContain("Remote")
      expect(html).toContain("Full-time")
      expect(html).toContain("Posted 2 days ago")
      expect(html).toContain("Package &amp; Stage")
      expect(html).not.toContain("I&#x27;ve Applied")
    })

    it("renders Staged badge when opportunity is already packaged/staged", () => {
      const html = renderToString(
        <OpportunityHeroHeader
          opportunity={{ ...mockOpportunity, isStaged: true, applicationId: "app-999" }}
          isSaved={true}
          isSaving={false}
          isPackaging={false}
          isStaged={true}
          stagedApplicationId="app-999"
          onSaveToggle={() => {}}
          onPackage={() => {}}
        />
      )

      expect(html).toContain("Staged in Workbench")
      expect(html).toContain("/applications/app-999")
    })

    it("renders mobile top bar icon buttons and clean tag pills matching mockup (media_1790363520553.png)", () => {
      const html = renderToString(
        <OpportunityHeroHeader
          opportunity={mockOpportunity}
          isSaved={false}
          isSaving={false}
          isPackaging={false}
          isStaged={false}
          onSaveToggle={() => {}}
          onPackage={() => {}}
        />
      )

      // Mobile top controls & clean tags
      expect(html).toContain("Save")
      expect(html).toContain("Share")
      expect(html).toContain("Product")
      expect(html).toContain("Strategy")
      expect(html).toContain("Growth")
      expect(html).toMatch(/92.*%.*match/)
    })
  })

  describe("OpportunityJobDetailsCard", () => {
    it("renders full metadata specifications matching desktop Figma mockup", () => {
      const html = renderToString(<OpportunityJobDetailsCard opportunity={mockOpportunity} />)

      expect(html).toContain("Job Details")
      expect(html).toContain("Google")
      expect(html).toContain("New York, NY (Remote)")
      expect(html).toContain("Full-time")
      expect(html).toContain("Mid / Senior Level")
      expect(html).toMatch(/160K.*220K/)
      expect(html).toContain("Technology")
      expect(html).toContain("2 days ago")
    })
  })

  describe("OpportunityCopilotCard", () => {
    it("renders 5 contextual copilot actions and strictly contains NO sparkles icon", () => {
      const html = renderToString(
        <OpportunityCopilotCard opportunity={mockOpportunity} onTabChange={() => {}} />
      )

      expect(html).toContain("Your AI Career Copilot")
      expect(html).toContain("Get personalized insights for this opportunity.")
      expect(html).toContain("Analyze this job description")
      expect(html).toContain("Tailor my resume")
      expect(html).toContain("Generate a cover letter")
      expect(html).toContain("Prepare for interview")
      expect(html).toContain("Ask anything")

      // STRICT PROHIBITION: NEVER use the Sparkles icon anywhere
      expect(html).not.toContain("lucide-sparkles")
      expect(html).not.toContain("Sparkles")
    })
  })

  describe("OpportunityMatchScoreCard", () => {
    it("renders radial circular gauge, 4 dimension bars, and strong candidate banner", () => {
      const html = renderToString(<OpportunityMatchScoreCard opportunity={mockOpportunity} />)

      expect(html).toContain("Match Score")
      expect(html).toMatch(/92.*%/)
      expect(html).toContain("Great Match")
      expect(html).toContain("Skills Match")
      expect(html).toMatch(/95.*%/)
      expect(html).toContain("Experience Match")
      expect(html).toMatch(/88.*%/)
      expect(html).toContain("Role Fit")
      expect(html).toMatch(/90.*%/)
      expect(html).toContain("Company Fit")
      expect(html).toMatch(/93.*%/)
      expect(html).toContain("You&#x27;re a strong candidate!")
    })
  })

  describe("OpportunitySimilarStrip", () => {
    it("renders 3 similar opportunity cards matching the bottom carousel mockup", () => {
      const html = renderToString(
        <OpportunitySimilarStrip opportunities={mockSimilarOpportunities} />
      )

      expect(html).toContain("Similar Opportunities")
      expect(html).toContain("View all")
      expect(html).toContain("Meta")
      expect(html).toMatch(/88.*%/)
      expect(html).toContain("Apple")
      expect(html).toMatch(/85.*%/)
      expect(html).toContain("Amazon")
      expect(html).toMatch(/82.*%/)
    })
  })
})
