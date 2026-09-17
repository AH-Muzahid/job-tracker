import { describe, it, expect, vi, beforeEach } from "vitest"
import { ApplicationRepository } from "@/features/applications/application.repository"
import type { Application, CreateApplicationDto, UpdateApplicationDto } from "@/features/applications/application.types"

const mockPrismaCreate = vi.fn()
const mockPrismaUpdate = vi.fn()

vi.mock("@/lib/prisma", () => ({
  prisma: {
    application: {
      create: (...args: any[]) => mockPrismaCreate(...args),
      update: (...args: any[]) => mockPrismaUpdate(...args),
    },
  },
  withDbRetry: (fn: any) => fn(),
}))

vi.mock("@/lib/google-sheets", () => ({
  syncApplicationsToGoogleSheets: vi.fn().mockResolvedValue(undefined),
}))

describe("Application Interview Scheduling Fields (INT-08)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("persists interview scheduling fields on ApplicationRepository.create", async () => {
    const interviewDate = "2026-10-15T14:30:00.000Z"
    const createDto: CreateApplicationDto = {
      companyName: "Google",
      jobTitle: "Staff Software Engineer",
      source: "LinkedIn",
      applicationDate: "2026-09-17",
      status: "Interview",
      interviewDate,
      interviewRound: "System Design",
      interviewMeetingUrl: "https://meet.google.com/xyz-abc-123",
      interviewNotes: "Focus on Distributed Caching & Sharding",
    }

    mockPrismaCreate.mockResolvedValueOnce({
      id: "app-123",
      userId: "user-123",
      ...createDto,
      interviewDate: new Date(interviewDate),
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const result = await ApplicationRepository.create("user-123", createDto)

    expect(mockPrismaCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-123",
          companyName: "Google",
          jobTitle: "Staff Software Engineer",
          status: "Interview",
          interviewDate: new Date(interviewDate),
          interviewRound: "System Design",
          interviewMeetingUrl: "https://meet.google.com/xyz-abc-123",
          interviewNotes: "Focus on Distributed Caching & Sharding",
        }),
      })
    )
    expect(result.id).toBe("app-123")
  })

  it("updates interview scheduling fields on ApplicationRepository.update", async () => {
    const updatedDate = "2026-10-20T10:00:00.000Z"
    const updateDto: UpdateApplicationDto = {
      interviewDate: updatedDate,
      interviewRound: "Executive Culture Fit",
      interviewMeetingUrl: "https://zoom.us/j/987654321",
      interviewNotes: "Prepare leadership principles and project turnaround stories",
    }

    mockPrismaUpdate.mockResolvedValueOnce({
      id: "app-123",
      companyName: "Google",
      ...updateDto,
      interviewDate: new Date(updatedDate),
    })

    await ApplicationRepository.update("app-123", "Interview", updateDto)

    expect(mockPrismaUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "app-123" },
        data: expect.objectContaining({
          interviewDate: new Date(updatedDate),
          interviewRound: "Executive Culture Fit",
          interviewMeetingUrl: "https://zoom.us/j/987654321",
          interviewNotes: "Prepare leadership principles and project turnaround stories",
        }),
      })
    )
  })

  it("allows setting interview scheduling fields to null when canceled", async () => {
    const updateDto: UpdateApplicationDto = {
      interviewDate: null,
      interviewRound: null,
      interviewMeetingUrl: null,
      interviewNotes: null,
    }

    mockPrismaUpdate.mockResolvedValueOnce({
      id: "app-123",
      interviewDate: null,
      interviewRound: null,
      interviewMeetingUrl: null,
      interviewNotes: null,
    })

    await ApplicationRepository.update("app-123", "Interview", updateDto)

    expect(mockPrismaUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "app-123" },
        data: expect.objectContaining({
          interviewDate: null,
          interviewRound: null,
          interviewMeetingUrl: null,
          interviewNotes: null,
        }),
      })
    )
  })
})
