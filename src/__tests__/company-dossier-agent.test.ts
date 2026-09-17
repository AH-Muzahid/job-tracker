import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  generateDeterministicDossier,
  compileCompanyDossier,
} from "@/lib/ai/agents/company-dossier-agent"
import { companyDossierPipeline } from "@/inngest/functions/company-dossier-pipeline"
import { prisma } from "@/lib/prisma"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    application: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
  },
  withDbRetry: vi.fn((fn) => fn()),
}))

vi.mock("@/lib/ai/config", () => ({
  getUserAIConfig: vi.fn().mockResolvedValue(null), // Test deterministic path without API keys
}))

describe("INT-17: Company Research & Interview Dossier Agent", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("generates deterministic dossier with structured sections and questions", () => {
    const dossier = generateDeterministicDossier(
      "Linear Orbit Inc.",
      "Senior Frontend Architect",
      ["Next.js", "WebSockets", "State Management", "Tailwind CSS"]
    )

    expect(dossier.companyOverview).toContain("Linear Orbit Inc.")
    expect(dossier.companyOverview).toContain("Senior Frontend Architect")
    expect(dossier.techStackHighlights).toContain("Next.js")
    expect(dossier.curatedInterviewQuestions.length).toBeGreaterThanOrEqual(3)
    expect(dossier.questionsToAskPanel.length).toBeGreaterThanOrEqual(2)
    expect(dossier.rawMarkdownCheatsheet).toContain("### 🏢 Company Overview: Linear Orbit Inc.")
    expect(dossier.rawMarkdownCheatsheet).toContain("### ❓ Strategic Questions to Ask the Panel:")
  })

  it("compiles company dossier and updates application interview notes in database", async () => {
    const mockApp = {
      id: "app-linear-123",
      userId: "user-456",
      companyName: "Linear",
      jobTitle: "Founding Engineer",
      notes: "Met founder on X, interested in offline-first sync.",
      interviewNotes: null,
      company: { name: "Linear" },
      analysis: { jdKeywords: ["TypeScript", "IndexedDB", "CRDT"] },
    }

    vi.mocked(prisma.application.findFirst).mockResolvedValueOnce(mockApp as any)
    vi.mocked(prisma.application.update).mockResolvedValueOnce({ id: "app-linear-123" } as any)
    vi.mocked(prisma.notification.create).mockResolvedValueOnce({ id: "notif-1" } as any)

    const result = await compileCompanyDossier("app-linear-123", "user-456")

    expect(result.success).toBe(true)
    expect(result.dossier.companyOverview).toContain("Linear")
    expect(prisma.application.update).toHaveBeenCalledWith({
      where: { id: "app-linear-123" },
      data: {
        interviewNotes: expect.stringContaining("### 🏢 Company Overview: Linear"),
      },
    })
    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-456",
        title: expect.stringContaining("Linear"),
        type: "COMPANY_DOSSIER_READY",
        link: "/applications/app-linear-123",
      }),
    })
  })

  it("verifies Inngest function triggers on application/interview.scheduled", () => {
    expect(companyDossierPipeline).toBeDefined()
    const triggers = (companyDossierPipeline as any)["opts"]?.triggers || []
    const hasScheduledEvent = triggers.some(
      (t: any) => t.event === "application/interview.scheduled"
    )
    expect(hasScheduledEvent).toBe(true)
  })
})
