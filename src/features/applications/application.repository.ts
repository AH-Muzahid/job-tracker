import { prisma, withDbRetry } from "@/lib/prisma"
import { syncApplicationsToGoogleSheets } from "@/lib/google-sheets"
import type {
  ApplicationQueryFilters,
  CreateApplicationDto,
  UpdateApplicationDto,
} from "./application.types"
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "./application.constants"

export class ApplicationRepository {
  static async findManyByUser(userId: string, filters: ApplicationQueryFilters) {
    const search = filters.search?.toLowerCase()
    const { status, source, sort, tag } = filters

    const where: Record<string, unknown> = { userId }

    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: "insensitive" } },
        { jobTitle: { contains: search, mode: "insensitive" } },
      ]
    }

    if (status) {
      const lower = status.toLowerCase()
      if (lower === "staged") {
        where.status = { in: ["Staged", "STAGED"] }
      } else if (lower === "saved") {
        where.status = { in: ["Saved", "SAVED"] }
      } else if (lower === "applied") {
        where.status = { in: ["Applied", "APPLIED"] }
      } else if (lower === "assessment") {
        where.status = { in: ["Assessment", "ASSESSMENT"] }
      } else if (lower === "interview" || lower === "interviewing") {
        where.status = { in: ["Interview", "INTERVIEW", "Interviewing"] }
      } else if (lower === "rejected") {
        where.status = { in: ["Rejected", "REJECTED"] }
      } else if (lower === "offer" || lower === "offered") {
        where.status = { in: ["Offer", "OFFER", "Accepted"] }
      } else if (lower === "archived") {
        where.status = { in: ["Archived", "ARCHIVED"] }
      } else {
        where.status = status
      }
    }

    if (source) {
      where.source = source
    }

    if (tag) {
      where.tags = { some: { tagId: tag } }
    }

    const page = Math.max(1, filters.page || 1)
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, filters.pageSize || DEFAULT_PAGE_SIZE))
    const skip = (page - 1) * pageSize

    let orderBy: Record<string, string>
    switch (sort) {
      case "oldest":
        orderBy = { applicationDate: "asc" }
        break
      case "company":
        orderBy = { companyName: "asc" }
        break
      case "status":
        orderBy = { status: "asc" }
        break
      default:
        orderBy = { applicationDate: "desc" }
    }

    const [applications, total] = await withDbRetry(() =>
      Promise.all([
        prisma.application.findMany({
          where,
          orderBy,
          skip,
          take: pageSize,
          include: {
            tags: { include: { tag: { select: { id: true, name: true } } } },
          },
        }),
        prisma.application.count({ where }),
      ])
    )

    return { data: applications, total, page, pageSize }
  }

  static async findById(id: string) {
    return withDbRetry(() =>
      prisma.application.findUnique({
        where: { id },
        include: {
          tags: { include: { tag: true } },
          statusChanges: { orderBy: { changedAt: "desc" } },
        },
      })
    )
  }

  static async findDuplicate(userId: string, companyName: string, jobTitle: string) {
    return withDbRetry(() =>
      prisma.application.findFirst({
        where: {
          userId,
          companyName: { equals: companyName, mode: "insensitive" },
          jobTitle: { equals: jobTitle, mode: "insensitive" },
        },
        select: { id: true, companyName: true, jobTitle: true, status: true },
      })
    )
  }

  static async create(userId: string, data: CreateApplicationDto) {
    const createdApp = await withDbRetry(() =>
      prisma.application.create({
        data: {
          userId,
          companyName: data.companyName,
          jobTitle: data.jobTitle,
          jobUrl: data.jobUrl || null,
          source: data.source,
          applicationDate: new Date(data.applicationDate),
          status: data.status,
          notes: data.notes || null,
          interviewDate: data.interviewDate ? new Date(data.interviewDate) : null,
          interviewRound: data.interviewRound || null,
          interviewMeetingUrl: data.interviewMeetingUrl || null,
          interviewNotes: data.interviewNotes || null,
          statusChanges: { create: { toStatus: data.status } },
          ...(data.tagIds?.length
            ? { tags: { create: data.tagIds.map((id) => ({ tagId: id })) } }
            : {}),
        },
        include: { tags: { include: { tag: true } } },
      })
    )

    // Fire non-blocking auto-sync to Google Sheets in background
    void syncApplicationsToGoogleSheets(userId, [
      {
        id: createdApp.id,
        companyName: createdApp.companyName,
        jobTitle: createdApp.jobTitle,
        status: createdApp.status,
        source: createdApp.source,
        applicationDate: createdApp.applicationDate,
        jobUrl: createdApp.jobUrl,
        notes: createdApp.notes,
      },
    ])

    return createdApp
  }

  static async update(id: string, existingStatus: string, data: UpdateApplicationDto) {
    const newStatus = data.status
    const statusChanged = Boolean(newStatus && newStatus !== existingStatus)

    const updated = await withDbRetry(() =>
      prisma.application.update({
        where: { id },
        data: {
          ...(data.companyName && { companyName: data.companyName }),
          ...(data.jobTitle && { jobTitle: data.jobTitle }),
          ...(data.jobUrl !== undefined && { jobUrl: data.jobUrl }),
          ...(data.source && { source: data.source }),
          ...(data.applicationDate && { applicationDate: new Date(data.applicationDate) }),
          ...(newStatus && { status: newStatus }),
          ...(data.notes !== undefined && { notes: data.notes }),
          ...(data.interviewDate !== undefined && {
            interviewDate: data.interviewDate ? new Date(data.interviewDate) : null,
          }),
          ...(data.interviewRound !== undefined && { interviewRound: data.interviewRound }),
          ...(data.interviewMeetingUrl !== undefined && {
            interviewMeetingUrl: data.interviewMeetingUrl,
          }),
          ...(data.interviewNotes !== undefined && { interviewNotes: data.interviewNotes }),
          ...(statusChanged
            ? { statusChanges: { create: { fromStatus: existingStatus, toStatus: newStatus! } } }
            : {}),
          ...(data.tagIds
            ? { tags: { deleteMany: {}, create: data.tagIds.map((tagId) => ({ tagId })) } }
            : {}),
        },
        include: {
          tags: { include: { tag: true } },
          statusChanges: { orderBy: { changedAt: "desc" } },
        },
      })
    )

    // Trigger company research & interview dossier agent when moving to Interview stage
    if (statusChanged && newStatus === "Interview") {
      try {
        const { inngest } = await import("@/inngest/client")
        await inngest.send({
          name: "application/interview.scheduled",
          data: {
            applicationId: id,
            userId: updated.userId,
          },
        })
      } catch (err) {
        console.warn("[Interview Status Change Inngest dispatch failed]:", err)
      }
    }

    return updated
  }

  static async delete(id: string) {
    return withDbRetry(() =>
      prisma.application.delete({ where: { id } })
    )
  }
}
