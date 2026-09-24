/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { POST } from "@/app/api/jobs/discover/route"
import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { RecommendedOpportunities, Opportunity } from "@/components/dashboard/RecommendedOpportunities"

// Mock dependencies
vi.mock("@/lib/auth", () => ({
  getInternalUserId: vi.fn().mockResolvedValue("test-user-unsave-123"),
}))

vi.mock("@/lib/rate-limit", () => ({
  checkDistributedRateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}))

vi.mock("@/lib/redis", () => ({
  invalidateCache: vi.fn().mockResolvedValue(true),
  getCachedJson: vi.fn().mockResolvedValue(null),
  setCachedJson: vi.fn().mockResolvedValue(true),
}))

vi.mock("@/lib/discovery/telemetry", () => ({
  logDiscoveryEvent: vi.fn(),
}))

vi.mock("@/lib/discovery/preferences", () => ({
  invalidateUserImplicitPreferences: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
  })),
}))

describe("Opportunity Unsave & Toggle API Handler", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("successfully handles action === 'unsave' by setting isSaved to false and deleting saved application", async () => {
    const updateManySpy = vi.spyOn(prisma.userJobMatch, "updateMany").mockResolvedValue({ count: 1 } as any)
    const deleteManySpy = vi.spyOn(prisma.application, "deleteMany").mockResolvedValue({ count: 1 } as any)
    vi.spyOn(prisma.userJobMatch, "findFirst").mockResolvedValue({
      jobId: "canonical-job-123",
      job: { company: "Over99", title: "Frontend Engineer" },
    } as any)

    const req = new NextRequest("http://localhost:3000/api/jobs/discover", {
      method: "POST",
      body: JSON.stringify({
        action: "unsave",
        jobId: "match-123",
        companyName: "Over99",
        jobTitle: "Frontend Engineer",
      }),
    })

    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.data).toEqual({ unsaved: true })
    expect(updateManySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "test-user-unsave-123",
          OR: [{ id: "match-123" }, { jobId: "match-123" }],
        },
        data: { isSaved: false },
      })
    )
    expect(deleteManySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "test-user-unsave-123",
          companyName: { equals: "Over99", mode: "insensitive" },
          jobTitle: { equals: "Frontend Engineer", mode: "insensitive" },
          status: "Saved",
        },
      })
    )
  })
})

describe("RecommendedOpportunities Bookmark Toggle UI", () => {
  const mockOpportunities: Opportunity[] = [
    {
      id: "job-over99",
      jobId: "canonical-over99",
      title: "Frontend Engineer",
      company: "Over99",
      location: "Remote",
      fitScore: 95,
      isSaved: true,
      tags: ["React", "Next.js"],
    },
    {
      id: "job-google",
      jobId: "canonical-google",
      title: "Product Manager",
      company: "Google",
      location: "New York, NY",
      fitScore: 92,
      isSaved: false,
      tags: ["Product", "Strategy"],
    },
    {
      id: "job-stripe",
      jobId: "canonical-stripe",
      title: "Software Engineer",
      company: "Stripe",
      location: "San Francisco, CA",
      fitScore: 88,
      isSaved: false,
      tags: ["Backend", "TypeScript"],
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    } as any)
  })

  it("renders with saved bookmark button for Over99 and unsaves when clicked", async () => {
    render(<RecommendedOpportunities opportunities={mockOpportunities} />)

    // Over99 starts with isSaved: true -> label is "Remove from saved opportunities"
    const over99Btn = screen.getByLabelText("Remove from saved opportunities")
    expect(over99Btn).toBeTruthy()

    // Click to unsave
    fireEvent.click(over99Btn)

    // Should call API with action: "unsave"
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/jobs/discover",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            action: "unsave",
            jobId: "canonical-over99",
            companyName: "Over99",
            jobTitle: "Frontend Engineer",
          }),
        })
      )
    })

    // UI should immediately reflect un-saved state
    expect(screen.getAllByLabelText("Bookmark job").length).toBe(3)

    // Clicking it again should save it back
    const reBookmarkBtn = screen.getAllByLabelText("Bookmark job")[0]
    fireEvent.click(reBookmarkBtn)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/jobs/discover",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            action: "save",
            jobId: "canonical-over99",
            companyName: "Over99",
            jobTitle: "Frontend Engineer",
            location: "Remote",
            status: "Saved",
          }),
        })
      )
    })
  })
})
