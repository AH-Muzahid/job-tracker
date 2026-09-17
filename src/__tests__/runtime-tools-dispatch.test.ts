import { describe, it, expect, vi, beforeEach } from "vitest"
import { executeToolByName } from "@/lib/ai/graph/tools"

const mockCompanyFindFirst = vi.fn()
const mockCompanyCreate = vi.fn()
const mockInterviewSessionFindMany = vi.fn()
const mockPrepNoteFindMany = vi.fn()
const mockPrepNoteCreate = vi.fn()
const mockApplicationFindFirst = vi.fn()

vi.mock("@/lib/prisma", () => ({
  prisma: {
    company: {
      findFirst: (...args: any[]) => mockCompanyFindFirst(...args),
      create: (...args: any[]) => mockCompanyCreate(...args),
    },
    interviewSession: {
      findMany: (...args: any[]) => mockInterviewSessionFindMany(...args),
    },
    prepNote: {
      findMany: (...args: any[]) => mockPrepNoteFindMany(...args),
      create: (...args: any[]) => mockPrepNoteCreate(...args),
    },
    application: {
      findFirst: (...args: any[]) => mockApplicationFindFirst(...args),
    },
  },
  withDbRetry: (fn: any) => fn(),
}))

describe("Runtime Tool Dispatcher (INT-12)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("researchCompanyIntel", () => {
    it("returns existing company intel when company already exists in DB", async () => {
      mockCompanyFindFirst.mockResolvedValueOnce({
        id: "comp-1",
        name: "Anthropic",
        website: "https://anthropic.com",
        industry: "Artificial Intelligence",
        notes: "Safety-first research lab building Claude.",
        applications: [{ id: "app-1", jobTitle: "Research Engineer", status: "Interview", interviewDate: null }],
      })
      mockInterviewSessionFindMany.mockResolvedValueOnce([
        { id: "sess-1", overallScore: 92, verdict: "Strong Hire", createdAt: new Date() },
      ])

      const res = await executeToolByName(
        "researchCompanyIntel",
        { companyName: "Anthropic" },
        "user-test-123"
      )

      expect(res.success).toBe(true)
      expect(res.company.name).toBe("Anthropic")
      expect(res.company.activeApplications.length).toBe(1)
      expect(res.company.recentMockInterviewSessions.length).toBe(1)
    })

    it("creates and returns new company record when not found in DB", async () => {
      mockCompanyFindFirst.mockResolvedValueOnce(null)
      mockCompanyCreate.mockResolvedValueOnce({
        id: "comp-2",
        name: "Stripe",
        website: "https://stripe.com",
        industry: "Fintech",
        notes: "Researched via Career Assistant for Stripe.",
        applications: [],
      })
      mockInterviewSessionFindMany.mockResolvedValueOnce([])

      const res = await executeToolByName(
        "researchCompanyIntel",
        { companyName: "Stripe", website: "https://stripe.com", industry: "Fintech" },
        "user-test-123"
      )

      expect(res.success).toBe(true)
      expect(res.company.name).toBe("Stripe")
      expect(mockCompanyCreate).toHaveBeenCalled()
    })
  })

  describe("getPrepNotes", () => {
    it("queries prep notes with category and keyword filters", async () => {
      mockPrepNoteFindMany.mockResolvedValueOnce([
        {
          id: "note-1",
          title: "System Design: Distributed Locks",
          content: "Redlock algorithm and TTL considerations",
          category: "System Design",
          application: { id: "app-1", companyName: "Uber", jobTitle: "Staff Engineer" },
        },
      ])

      const res = await executeToolByName(
        "getPrepNotes",
        { category: "System Design", query: "Redlock" },
        "user-test-123"
      )

      expect(res.success).toBe(true)
      expect(res.count).toBe(1)
      expect(res.notes[0].title).toContain("Distributed Locks")
      expect(mockPrepNoteFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: "user-test-123",
            category: { equals: "System Design", mode: "insensitive" },
          }),
        })
      )
    })
  })

  describe("savePrepNote", () => {
    it("successfully creates prep note for user", async () => {
      mockPrepNoteCreate.mockResolvedValueOnce({
        id: "note-new-1",
        title: "STAR Technique Framework",
        content: "Situation, Task, Action, Result",
        category: "Behavioral",
      })

      const res = await executeToolByName(
        "savePrepNote",
        {
          title: "STAR Technique Framework",
          content: "Situation, Task, Action, Result",
          category: "Behavioral",
        },
        "user-test-123"
      )

      expect(res.success).toBe(true)
      expect(res.note.title).toBe("STAR Technique Framework")
      expect(mockPrepNoteCreate).toHaveBeenCalled()
    })

    it("prevents IDOR by verifying application ownership before saving", async () => {
      mockApplicationFindFirst.mockResolvedValueOnce(null) // Unowned application

      const res = await executeToolByName(
        "savePrepNote",
        {
          title: "Secret Note",
          content: "Content",
          applicationId: "unowned-app-id",
        },
        "attacker-user"
      )

      expect(res.success).toBe(false)
      expect(res.error).toBe("Unauthorized application access")
      expect(mockPrepNoteCreate).not.toHaveBeenCalled()
    })
  })
})
