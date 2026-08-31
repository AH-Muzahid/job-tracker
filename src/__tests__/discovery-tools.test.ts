/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  executeSearchExternalJobs,
  executeSaveJobOpportunityToTracker,
} from "@/lib/ai/graph/tools/discovery-tools"
import { prisma } from "@/lib/prisma"

describe("Job Discovery Engine Tools", () => {
  const testUserId = "user-discovery-test-123"

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("fetches and scores external job opportunities against user profile & resume", async () => {
    vi.spyOn((prisma as any).userProfile, "findUnique").mockResolvedValueOnce({
      userId: testUserId,
      strengths: "Go, React, TypeScript, PostgreSQL",
      targetRoles: ["Full Stack Engineer", "Backend Engineer"],
    })
    vi.spyOn((prisma as any).resume, "findFirst").mockResolvedValueOnce({
      userId: testUserId,
      isDefault: true,
      textContent: "Built Go and React systems at scale with PostgreSQL.",
    })

    const result = await executeSearchExternalJobs(testUserId, {
      query: "React",
      limit: 3,
    })

    expect(result.success).toBe(true)
    expect(result.opportunities.length).toBeGreaterThan(0)
    expect(result.opportunities[0].fitScore).toBeGreaterThanOrEqual(50)
    expect(result.opportunities[0].matchRationale).toBeDefined()
  })

  it("saves discovered job opportunity directly into the user tracker", async () => {
    const mockCreatedApp = {
      id: "app-discovered-1",
      userId: testUserId,
      companyName: "Stripe",
      jobTitle: "Senior Full Stack Engineer",
      jobUrl: "https://stripe.com/jobs",
      source: "Discovery Engine",
      status: "Saved",
      notes: "Location: Remote\nSalary: $160k - $210k\nDiscovered via CareerTrack Autonomous Job Discovery Engine",
    }

    vi.spyOn((prisma as any).application, "create").mockResolvedValueOnce(mockCreatedApp)

    const result = await executeSaveJobOpportunityToTracker(testUserId, {
      companyName: "Stripe",
      jobTitle: "Senior Full Stack Engineer",
      jobUrl: "https://stripe.com/jobs",
      location: "Remote",
      salary: "$160k - $210k",
      status: "Saved",
    })

    expect(result.success).toBe(true)
    expect(result.applicationId).toBe("app-discovered-1")
    expect(result.message).toContain("Stripe")
  })
})
