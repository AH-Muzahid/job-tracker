/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { VALID_STATUSES, CANONICAL_STATUSES } from "@/features/applications/application.constants"
import {
  validateCreateApplication,
  validateUpdateApplication,
} from "@/features/applications/application.validation"
import { boardColumns, STATUS_OPTIONS } from "@/components/dashboard/types"

vi.mock("@/lib/auth", () => ({
  getInternalUserId: vi.fn(),
}))

vi.mock("@/lib/redis", () => ({
  getCachedJson: vi.fn().mockResolvedValue(null),
  setCachedJson: vi.fn().mockResolvedValue(undefined),
  invalidateCache: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/prisma", () => {
  const mockPrisma = {
    application: {
      findMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      deleteMany: vi.fn(),
      updateMany: vi.fn(),
    },
    userJobMatch: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    canonicalJob: {
      count: vi.fn(),
    },
    statusChange: {
      createMany: vi.fn(),
    },
    $queryRaw: vi.fn(),
    $transaction: vi.fn((fns: any) => Promise.all(fns)),
  }
  return {
    prisma: mockPrisma,
    withDbRetry: vi.fn((fn: any) => fn()),
  }
})

import { ApplicationRepository } from "@/features/applications/application.repository"
import { prisma } from "@/lib/prisma"
import { GET as getDashboardStats } from "@/app/api/dashboard/stats/route"
import { getInternalUserId } from "@/lib/auth"

describe("CAG-04: Formalize STAGED Application Status Pipeline", () => {
  const mockUserId = "user-staged-test-123"

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getInternalUserId).mockResolvedValue(mockUserId)
  })

  describe("1. Validation & Constants", () => {
    it("recognizes Staged and STAGED in VALID_STATUSES and CANONICAL_STATUSES", () => {
      expect(VALID_STATUSES).toContain("Staged")
      expect(VALID_STATUSES).toContain("STAGED")
      expect(CANONICAL_STATUSES).toContain("Staged")
      expect(STATUS_OPTIONS).toContain("Staged")
    })

    it("validates create application with Staged and STAGED successfully", () => {
      const validStaged = validateCreateApplication({
        companyName: "Acme AI",
        jobTitle: "Founding Engineer",
        applicationDate: new Date().toISOString(),
        source: "LinkedIn",
        status: "Staged",
      })
      expect(validStaged.isValid).toBe(true)
      expect(validStaged.error).toBeUndefined()

      const validUpperStaged = validateCreateApplication({
        companyName: "Acme AI",
        jobTitle: "Founding Engineer",
        applicationDate: new Date().toISOString(),
        source: "LinkedIn",
        status: "STAGED",
      })
      expect(validUpperStaged.isValid).toBe(true)
    })

    it("rejects invalid application status with descriptive error message", () => {
      const invalid = validateCreateApplication({
        companyName: "Acme AI",
        jobTitle: "Founding Engineer",
        applicationDate: new Date().toISOString(),
        source: "LinkedIn",
        status: "Flying",
      })
      expect(invalid.isValid).toBe(false)
      expect(invalid.error).toContain("Invalid status")
    })

    it("validates update application with Staged successfully", () => {
      const updateResult = validateUpdateApplication({
        status: "Staged",
      })
      expect(updateResult.isValid).toBe(true)
    })
  })

  describe("2. ApplicationRepository Status Filtering", () => {
    it("queries { in: ['Staged', 'STAGED'] } when filtering by status='staged'", async () => {
      vi.mocked(prisma.application.findMany).mockResolvedValueOnce([])
      vi.mocked(prisma.application.count).mockResolvedValueOnce(0)

      await ApplicationRepository.findManyByUser(mockUserId, {
        status: "staged",
      })

      expect(prisma.application.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: mockUserId,
            status: { in: ["Staged", "STAGED"] },
          }),
        })
      )
    })
  })

  describe("3. Dashboard Stats & Velocity Metric Isolation", () => {
    it("returns staged count while strictly isolating activeApplications to applied, assessment, and interview", async () => {
      // Setup mock data for dashboard stats
      vi.mocked(prisma.application.groupBy).mockImplementation((({ by }: any) => {
        if (by.includes("status")) {
          return Promise.resolve([
            { status: "STAGED", _count: 4 },
            { status: "Staged", _count: 2 },
            { status: "Applied", _count: 5 },
            { status: "Assessment", _count: 1 },
            { status: "Interview", _count: 2 },
            { status: "Offer", _count: 1 },
          ])
        }
        return Promise.resolve([])
      }) as any)

      vi.mocked(prisma.application.findMany).mockResolvedValue([])
      vi.mocked(prisma.application.count).mockResolvedValue(15)
      vi.mocked(prisma.userJobMatch.count).mockResolvedValue(10)
      vi.mocked(prisma.userJobMatch.findMany).mockResolvedValue([])
      vi.mocked(prisma.canonicalJob.count).mockResolvedValue(5)
      vi.mocked(prisma.$queryRaw).mockResolvedValue([])

      const response = await getDashboardStats()
      expect(response.status).toBe(200)

      const stats = await response.json()

      // Staged count must be aggregated (4 STAGED + 2 Staged = 6)
      expect(stats.staged).toBe(6)

      // Active applications must NOT include staged!
      // 5 (Applied) + 1 (Assessment) + 2 (Interview) = 8
      expect(stats.activeApplications).toBe(8)
      expect(stats.kpi.applications.inProgress).toBe(8)
    })
  })

  describe("4. Kanban Board Layout & Icon Guardrails", () => {
    it("has staged as the first column in boardColumns", () => {
      expect(boardColumns[0].key).toBe("staged")
      expect(boardColumns[0].title).toBe("Staged")
      expect(boardColumns[0].statuses).toContain("Staged")
      expect(boardColumns[0].statuses).toContain("STAGED")
    })

    it("verifies NO Sparkles icon is used in boardColumns", () => {
      // Must use intentional, functional icons
      for (const col of boardColumns) {
        expect((col.icon as any).name || col.icon.displayName).not.toMatch(/sparkle/i)
      }
    })
  })
})
