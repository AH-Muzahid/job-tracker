/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/auth", () => ({
  getInternalUserId: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    userJobMatch: {
      findFirst: vi.fn(),
      updateMany: vi.fn(),
      upsert: vi.fn(),
    },
    canonicalJob: {
      findUnique: vi.fn(),
    },
    application: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
  withDbRetry: vi.fn((cb) => cb()),
}))

vi.mock("@/lib/rate-limit", () => ({
  checkDistributedRateLimit: vi.fn(),
  rateLimitResponse: vi.fn(() =>
    new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
  ),
}))

vi.mock("@/lib/discovery/cover-letter-agent", () => ({
  generateApplicationMaterialsAgent: vi.fn(),
}))

vi.mock("@/lib/redis", () => ({
  invalidateCache: vi.fn(),
  getCachedJson: vi.fn().mockResolvedValue(null),
}))

vi.mock("@/lib/discovery/telemetry", () => ({
  logDiscoveryEvent: vi.fn(),
}))

vi.mock("@/lib/discovery/preferences", () => ({
  invalidateUserImplicitPreferences: vi.fn(),
}))

import { getInternalUserId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { checkDistributedRateLimit } from "@/lib/rate-limit"
import { generateApplicationMaterialsAgent } from "@/lib/discovery/cover-letter-agent"
import { invalidateCache } from "@/lib/redis"
import { POST } from "@/app/api/discovery/[id]/package/route"

describe("1-Click Package Application API (CAG-05)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(checkDistributedRateLimit as any).mockResolvedValue({ success: true })
  })

  it("returns 401 Unauthorized when candidate is not authenticated", async () => {
    ;(getInternalUserId as any).mockResolvedValue(null)

    const req = new NextRequest("http://localhost:3000/api/discovery/job-123/package", {
      method: "POST",
    })
    const res = await POST(req, { params: Promise.resolve({ id: "job-123" }) })
    expect(res.status).toBe(401)
  })

  it("returns 429 when rate limit is exceeded", async () => {
    ;(getInternalUserId as any).mockResolvedValue("user-1")
    ;(checkDistributedRateLimit as any).mockResolvedValue({ success: false })

    const req = new NextRequest("http://localhost:3000/api/discovery/job-123/package", {
      method: "POST",
    })
    const res = await POST(req, { params: Promise.resolve({ id: "job-123" }) })
    expect(res.status).toBe(429)
  })

  it("packages an opportunity into STAGED status and generates materials", async () => {
    ;(getInternalUserId as any).mockResolvedValue("user-1")

    const mockMatch = {
      id: "match-123",
      jobId: "canonical-job-1",
      fitScore: 94,
      matchRationale: "High overlap with React & TypeScript",
      job: {
        id: "canonical-job-1",
        company: "Stripe",
        title: "Staff Software Engineer",
        url: "https://stripe.com/jobs/123",
        location: "Remote, US",
        salary: "$180,000 - $240,000",
      },
    }
    ;(prisma.userJobMatch.findFirst as any).mockResolvedValue(mockMatch)
    ;(prisma.application.findFirst as any).mockResolvedValue(null)

    const createdApp = {
      id: "app-staged-999",
      userId: "user-1",
      companyName: "Stripe",
      jobTitle: "Staff Software Engineer",
      status: "STAGED",
      source: "Discovery Engine",
    }
    ;(prisma.application.create as any).mockResolvedValue(createdApp)
    ;(prisma.userJobMatch.updateMany as any).mockResolvedValue({ count: 1 })

    const mockMaterials = {
      coverLetter: "Dear Hiring Team at Stripe...",
      highlights: ["Built scalable payment microservices"],
      outreachPitch: "Hi! I noticed the Staff Software Engineer role at Stripe.",
      atsKeywords: ["typescript", "react", "distributed-systems"],
    }
    ;(generateApplicationMaterialsAgent as any).mockResolvedValue(mockMaterials)

    const req = new NextRequest("http://localhost:3000/api/discovery/match-123/package", {
      method: "POST",
      body: JSON.stringify({}),
    })
    const res = await POST(req, { params: Promise.resolve({ id: "match-123" }) })
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.applicationId).toBe("app-staged-999")
    expect(json.data.status).toBe("STAGED")
    expect(json.data.materials).toEqual(mockMaterials)

    // Verify application created with STAGED status and audit trail
    expect(prisma.application.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          companyName: "Stripe",
          jobTitle: "Staff Software Engineer",
          status: "STAGED",
          statusChanges: {
            create: {
              toStatus: "STAGED",
              metadata: { reason: "Packaged & staged from Discovery Hub" },
            },
          },
        }),
      })
    )

    // Verify agent was triggered with correct context including authentic fitScore
    expect(generateApplicationMaterialsAgent).toHaveBeenCalledWith(
      "user-1",
      "app-staged-999",
      expect.objectContaining({
        companyName: "Stripe",
        jobTitle: "Staff Software Engineer",
        jobUrl: "https://stripe.com/jobs/123",
        fitScore: 94,
      })
    )

    // Verify UserJobMatch upserted to isSaved: true and status: "STAGED" with authentic fitScore
    expect(prisma.userJobMatch.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_jobId: {
            userId: "user-1",
            jobId: "canonical-job-1",
          },
        },
        create: expect.objectContaining({
          userId: "user-1",
          jobId: "canonical-job-1",
          fitScore: 94,
          status: "STAGED",
          isSaved: true,
        }),
        update: expect.objectContaining({
          status: "STAGED",
          isSaved: true,
          fitScore: 94,
        }),
      })
    )

    // Verify cache invalidations
    expect(invalidateCache).toHaveBeenCalledWith("dashboard:stats:user-1")
    expect(invalidateCache).toHaveBeenCalledWith("applications:user-1")
    expect(invalidateCache).toHaveBeenCalledWith("user:stats:user-1")
  })

  it("updates existing application to STAGED instead of creating duplicate", async () => {
    ;(getInternalUserId as any).mockResolvedValue("user-1")
    ;(prisma.userJobMatch.findFirst as any).mockResolvedValue(null)
    ;(prisma.canonicalJob.findUnique as any).mockResolvedValue({
      id: "canon-456",
      company: "Linear",
      title: "Product Engineer",
      url: "https://linear.app/careers/pe",
    })

    const existingApp = {
      id: "app-existing-123",
      userId: "user-1",
      companyName: "Linear",
      jobTitle: "Product Engineer",
      status: "SAVED",
    }
    ;(prisma.application.findFirst as any).mockResolvedValue(existingApp)

    const updatedApp = {
      ...existingApp,
      status: "STAGED",
    }
    ;(prisma.application.update as any).mockResolvedValue(updatedApp)
    ;(prisma.userJobMatch.updateMany as any).mockResolvedValue({ count: 1 })
    ;(generateApplicationMaterialsAgent as any).mockResolvedValue({
      coverLetter: "Dear Linear Team...",
      highlights: [],
      outreachPitch: "Hi Linear!",
      atsKeywords: [],
    })

    const req = new NextRequest("http://localhost:3000/api/discovery/canon-456/package", {
      method: "POST",
    })
    const res = await POST(req, { params: Promise.resolve({ id: "canon-456" }) })
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.data.applicationId).toBe("app-existing-123")
    expect(json.data.status).toBe("STAGED")

    expect(prisma.application.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "app-existing-123" },
        data: expect.objectContaining({
          status: "STAGED",
          statusChanges: {
            create: {
              fromStatus: "SAVED",
              toStatus: "STAGED",
              metadata: { reason: "Packaged & staged from Discovery Hub" },
            },
          },
        }),
      })
    )
    expect(prisma.application.create).not.toHaveBeenCalled()
  })

  it("returns 400 when opportunity details cannot be resolved", async () => {
    ;(getInternalUserId as any).mockResolvedValue("user-1")
    ;(prisma.userJobMatch.findFirst as any).mockResolvedValue(null)
    ;(prisma.canonicalJob.findUnique as any).mockResolvedValue(null)

    const req = new NextRequest("http://localhost:3000/api/discovery/non-existent/package", {
      method: "POST",
      body: JSON.stringify({}),
    })
    const res = await POST(req, { params: Promise.resolve({ id: "non-existent" }) })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain("could not be resolved")
  })
})
