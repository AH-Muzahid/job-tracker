import { describe, it, expect, vi } from "vitest"
import { buildFullContext } from "@/lib/ai/context-builder"
import { prisma } from "@/lib/prisma"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn().mockResolvedValue({ name: "John Doe", email: "john@example.com" }),
    },
    userProfile: {
      findUnique: vi.fn().mockResolvedValue({
        location: "Dhaka",
        targetRoles: ["Fullstack Developer"],
        experienceLevel: "Mid-level",
        strengths: "React, Node.js, TypeScript",
      }),
    },
    application: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: "app-1",
          companyName: "Google",
          jobTitle: "Software Engineer",
          status: "Interview",
          source: "LinkedIn",
          applicationDate: new Date(),
          notes: "Passed screening call",
        },
      ]),
      groupBy: vi.fn().mockResolvedValue([
        { status: "Applied", _count: 5 },
        { status: "Interview", _count: 2 },
      ]),
    },
    resume: {
      findFirst: vi.fn().mockResolvedValue({
        title: "Fullstack Resume 2026",
        fileName: "resume.pdf",
        textContent: "Experienced Software Engineer skilled in React, Node.js, and Next.js...",
      }),
    },
    company: {
      findMany: vi.fn().mockResolvedValue([
        { name: "Google", industry: "Tech", website: "https://google.com", notes: null },
      ]),
    },
    prepNote: {
      findMany: vi.fn().mockResolvedValue([
        { title: "React Hooks Note", category: "React", content: "useEffect vs useLayoutEffect" },
      ]),
    },
    statusChange: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    applicationAnalysis: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    prepQuestion: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    weeklyGoal: {
      findFirst: vi.fn().mockResolvedValue({
        goal1: "Apply to 5 companies",
        goal1Status: "In Progress",
        goal2: "Solve 3 LeetCode problems",
        goal2Status: "Not Started",
        goal3: null,
        goal3Status: null,
      }),
    },
  },
}))

describe("AI Context Builder", () => {
  it("builds comprehensive full context for general mode", async () => {
    const context = await buildFullContext("user-123", "general")

    expect(context).toContain("User Identity:")
    expect(context).toContain("John Doe")
    expect(context).toContain("User Profile:")
    expect(context).toContain("Fullstack Developer")
    expect(context).toContain("Default Resume: Fullstack Resume 2026")
    expect(context).toContain("Pipeline Stats:")
    expect(context).toContain("Recent Applications:")
    expect(context).toContain("Google | Software Engineer | Interview")
  })
})
