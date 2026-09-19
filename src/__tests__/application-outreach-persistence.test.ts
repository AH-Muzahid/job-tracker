/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/auth", () => ({
  getInternalUserId: vi.fn(),
}))

vi.mock("@/lib/prisma", () => {
  const mockPrisma = {
    application: {
      findFirst: vi.fn(),
    },
    applicationAnalysis: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  }
  return {
    prisma: mockPrisma,
    withDbRetry: vi.fn((fn: any) => fn()),
  }
})

import { getInternalUserId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { GET, PATCH, POST } from "@/app/api/applications/[id]/analysis/route"

describe("CAG-02: Outreach Drafts PostgreSQL Persistence & Tenant Security", () => {
  const mockUserId = "user-alice-123"
  const mockAppId = "app-456"

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getInternalUserId).mockResolvedValue(mockUserId)
  })

  it("rejects unauthenticated requests on PATCH with 401", async () => {
    vi.mocked(getInternalUserId).mockResolvedValueOnce(null)

    const req = new NextRequest(`http://localhost:3000/api/applications/${mockAppId}/analysis`, {
      method: "PATCH",
      body: JSON.stringify({ outreachSubject: "Hello" }),
    })

    const res = await PATCH(req, { params: Promise.resolve({ id: mockAppId }) })
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe("Unauthorized")
    expect(prisma.applicationAnalysis.upsert).not.toHaveBeenCalled()
  })

  it("enforces tenant isolation and returns 404 if application belongs to another user", async () => {
    // Application not found for Alice
    vi.mocked(prisma.application.findFirst).mockResolvedValueOnce(null)

    const req = new NextRequest(`http://localhost:3000/api/applications/${mockAppId}/analysis`, {
      method: "PATCH",
      body: JSON.stringify({
        outreachSubject: "Application for Senior Engineer",
        outreachBody: "Dear Hiring Team, ...",
      }),
    })

    const res = await PATCH(req, { params: Promise.resolve({ id: mockAppId }) })
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toBe("Not found")
    expect(prisma.applicationAnalysis.upsert).not.toHaveBeenCalled()
  })

  it("validates input payloads with Zod and rejects malformed types", async () => {
    vi.mocked(prisma.application.findFirst).mockResolvedValueOnce({
      id: mockAppId,
      userId: mockUserId,
    } as any)

    // Pass invalid type for outreachChecklist (must be array of strings)
    const req = new NextRequest(`http://localhost:3000/api/applications/${mockAppId}/analysis`, {
      method: "PATCH",
      body: JSON.stringify({
        outreachChecklist: "not-an-array",
      }),
    })

    const res = await PATCH(req, { params: Promise.resolve({ id: mockAppId }) })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe("Invalid request payload")
    expect(prisma.applicationAnalysis.upsert).not.toHaveBeenCalled()
  })

  it("persists outreach subject, body, checklist, and timestamp to Postgres via upsert", async () => {
    vi.mocked(prisma.application.findFirst).mockResolvedValueOnce({
      id: mockAppId,
      userId: mockUserId,
    } as any)

    const mockSavedAnalysis = {
      id: "analysis-789",
      applicationId: mockAppId,
      outreachSubject: "Application for Principal Engineer - Alice",
      outreachBody: "Dear Stripe Team,\n\nI am writing to express my strong enthusiasm...",
      outreachChecklist: [
        "Verified GitHub/LinkedIn/portfolio links included",
        "Mentioned 3+ matching skills from JD",
      ],
      outreachGeneratedAt: new Date("2026-09-19T10:00:00.000Z"),
      matchScore: 92,
    }

    vi.mocked(prisma.applicationAnalysis.upsert).mockResolvedValueOnce(mockSavedAnalysis as any)

    const req = new NextRequest(`http://localhost:3000/api/applications/${mockAppId}/analysis`, {
      method: "PATCH",
      body: JSON.stringify({
        outreachSubject: mockSavedAnalysis.outreachSubject,
        outreachBody: mockSavedAnalysis.outreachBody,
        outreachChecklist: mockSavedAnalysis.outreachChecklist,
        outreachGeneratedAt: "2026-09-19T10:00:00.000Z",
      }),
    })

    const res = await PATCH(req, { params: Promise.resolve({ id: mockAppId }) })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.outreachSubject).toBe(mockSavedAnalysis.outreachSubject)
    expect(json.outreachBody).toBe(mockSavedAnalysis.outreachBody)
    expect(json.outreachChecklist).toEqual(mockSavedAnalysis.outreachChecklist)

    expect(prisma.applicationAnalysis.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { applicationId: mockAppId },
        create: expect.objectContaining({
          applicationId: mockAppId,
          outreachSubject: mockSavedAnalysis.outreachSubject,
          outreachBody: mockSavedAnalysis.outreachBody,
        }),
        update: expect.objectContaining({
          outreachSubject: mockSavedAnalysis.outreachSubject,
          outreachBody: mockSavedAnalysis.outreachBody,
        }),
      })
    )
  })

  it("returns persisted outreach draft on GET", async () => {
    vi.mocked(prisma.application.findFirst).mockResolvedValueOnce({
      id: mockAppId,
      userId: mockUserId,
    } as any)

    const mockAnalysis = {
      id: "analysis-789",
      applicationId: mockAppId,
      outreachSubject: "Application for Staff Software Engineer",
      outreachBody: "Dear Hiring Team,\n\nI built resilient distributed systems...",
      outreachChecklist: ["Checklist item 1"],
      matchScore: 88,
    }

    vi.mocked(prisma.applicationAnalysis.findUnique).mockResolvedValueOnce(mockAnalysis as any)

    const req = new NextRequest(`http://localhost:3000/api/applications/${mockAppId}/analysis`, {
      method: "GET",
    })

    const res = await GET(req, { params: Promise.resolve({ id: mockAppId }) })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.outreachSubject).toBe(mockAnalysis.outreachSubject)
    expect(json.outreachBody).toBe(mockAnalysis.outreachBody)
  })

  it("verifies POST analysis endpoint validates payload structure with Zod", async () => {
    vi.mocked(prisma.application.findFirst).mockResolvedValueOnce({
      id: mockAppId,
      userId: mockUserId,
    } as any)

    const req = new NextRequest(`http://localhost:3000/api/applications/${mockAppId}/analysis`, {
      method: "POST",
      body: JSON.stringify({
        invalidKey: true,
      }),
    })

    const res = await POST(req, { params: Promise.resolve({ id: mockAppId }) })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe("Invalid analysis payload")
  })
})
