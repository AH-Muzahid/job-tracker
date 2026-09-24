/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma, withDbRetry } from "@/lib/prisma"
import { invalidateCache } from "@/lib/redis"

export async function executeCreateApplication(userId: string, input: {
  companyName: string
  jobTitle: string
  jobUrl?: string
  source?: string
  status?: string
  notes?: string
}) {
  if (!userId) return { success: false, error: "Unauthorized" }
  if (!input.companyName || !input.jobTitle) {
    return { success: false, error: "Company name and job title are required" }
  }

  try {
    const status = input.status || "Applied"
    const source = input.source || "Manual"

    const trimmedCompany = input.companyName.trim()
    const trimmedTitle = input.jobTitle.trim()

    // 1. Check for existing application to enforce strict idempotency and prevent duplicates
    const existingApp = await withDbRetry<any>(() =>
      prisma.application.findFirst({
        where: {
          userId,
          companyName: { equals: trimmedCompany, mode: "insensitive" },
          jobTitle: { equals: trimmedTitle, mode: "insensitive" },
        },
      })
    )

    let application: any
    if (existingApp) {
      application = await withDbRetry<any>(() =>
        prisma.application.update({
          where: { id: existingApp.id },
          data: {
            status,
            updatedAt: new Date(),
            jobUrl: input.jobUrl?.trim() || existingApp.jobUrl,
            notes: input.notes?.trim() || existingApp.notes,
            ...(existingApp.status !== status
              ? {
                  statusChanges: {
                    create: {
                      fromStatus: existingApp.status,
                      toStatus: status,
                    },
                  },
                }
              : {}),
          },
        })
      )
    } else {
      application = await withDbRetry<any>(() =>
        prisma.application.create({
          data: {
            userId,
            companyName: trimmedCompany,
            jobTitle: trimmedTitle,
            jobUrl: input.jobUrl?.trim() || null,
            source,
            status,
            notes: input.notes?.trim() || null,
            applicationDate: new Date(),
            statusChanges: {
              create: {
                toStatus: status,
              },
            },
          },
        })
      )
    }

    await invalidateCache(`dashboard:stats:${userId}`)
    await invalidateCache(`user:stats:v2:${userId}`)
    await invalidateCache(`applications:${userId}`)

    return {
      success: true,
      message: `Created application for ${application.jobTitle} at ${application.companyName} with status ${application.status}`,
      applicationId: application.id,
      application,
    }
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to create application" }
  }
}

export async function executeUpdateApplicationStatus(userId: string, input: {
  companyOrTitle: string
  newStatus: string
  notes?: string
}) {
  if (!userId) return { success: false, error: "Unauthorized" }

  try {
    const apps = await withDbRetry<any[]>(() =>
      prisma.application.findMany({
        where: {
          userId,
          OR: [
            { companyName: { contains: input.companyOrTitle, mode: "insensitive" } },
            { jobTitle: { contains: input.companyOrTitle, mode: "insensitive" } },
          ],
        },
        orderBy: { updatedAt: "desc" },
        take: 1,
      })
    )

    if (apps.length === 0) {
      return { success: false, error: `No application matching "${input.companyOrTitle}" was found.` }
    }

    const app = apps[0]
    const updated = await withDbRetry<any>(() =>
      prisma.application.update({
        where: { id: app.id },
        data: {
          status: input.newStatus,
          notes: input.notes ? `${app.notes ? app.notes + "\n" : ""}${input.notes}` : app.notes,
          statusChanges: {
            create: {
              fromStatus: app.status,
              toStatus: input.newStatus,
            },
          },
        },
      })
    )

    await invalidateCache(`dashboard:stats:${userId}`)
    await invalidateCache(`applications:${userId}`)

    return {
      success: true,
      message: `Updated ${updated.jobTitle} at ${updated.companyName} from ${app.status} to ${updated.status}`,
      application: updated,
    }
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to update application status" }
  }
}

export async function executeSearchApplications(userId: string, input: {
  query?: string
  status?: string
  limit?: number
}) {
  if (!userId) return { success: false, error: "Unauthorized" }

  try {
    const where: any = { userId }
    if (input.status) {
      where.status = { equals: input.status, mode: "insensitive" }
    }
    if (input.query) {
      where.OR = [
        { companyName: { contains: input.query, mode: "insensitive" } },
        { jobTitle: { contains: input.query, mode: "insensitive" } },
      ]
    }

    const applications = await withDbRetry<any[]>(() =>
      prisma.application.findMany({
        where,
        orderBy: { applicationDate: "desc" },
        take: input.limit || 10,
      })
    )

    return {
      success: true,
      count: applications.length,
      applications,
    }
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to search applications" }
  }
}

export async function executeDeleteApplication(userId: string, input: {
  applicationId?: string
  companyOrTitle?: string
}) {
  if (!userId) return { success: false, error: "Unauthorized" }

  try {
    let targetId = input.applicationId

    if (!targetId && input.companyOrTitle) {
      const match = await withDbRetry<any>(() =>
        prisma.application.findFirst({
          where: {
            userId,
            OR: [
              { companyName: { contains: input.companyOrTitle, mode: "insensitive" } },
              { jobTitle: { contains: input.companyOrTitle, mode: "insensitive" } },
            ],
          },
          orderBy: { updatedAt: "desc" },
        })
      )
      if (match) {
        targetId = match.id
      }
    }

    if (!targetId) {
      return { success: false, error: "Target application not found to delete." }
    }

    const deleted = await withDbRetry<any>(() =>
      prisma.application.delete({
        where: { id: targetId, userId },
      })
    )

    await invalidateCache(`dashboard:stats:${userId}`)
    await invalidateCache(`applications:${userId}`)

    return {
      success: true,
      message: `Deleted application for ${deleted.jobTitle} at ${deleted.companyName}`,
      deletedId: targetId,
    }
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to delete application" }
  }
}

export async function executeGetPrepNotes(userId: string, input: {
  applicationId?: string
  category?: string
  query?: string
  limit?: number
}) {
  if (!userId) return { success: false, error: "Unauthorized" }

  try {
    const where: any = { userId }
    if (input.applicationId) {
      where.applicationId = input.applicationId
    }
    if (input.category) {
      where.category = { equals: input.category, mode: "insensitive" }
    }
    if (input.query) {
      where.OR = [
        { title: { contains: input.query, mode: "insensitive" } },
        { content: { contains: input.query, mode: "insensitive" } },
      ]
    }

    const notes = await withDbRetry<any[]>(() =>
      prisma.prepNote.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take: Math.min(input.limit || 10, 50),
        include: {
          application: {
            select: { id: true, companyName: true, jobTitle: true },
          },
        },
      })
    )

    return {
      success: true,
      count: notes.length,
      notes,
    }
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to retrieve prep notes" }
  }
}

export async function executeSavePrepNote(userId: string, input: {
  title: string
  content: string
  category?: string
  applicationId?: string
}) {
  if (!userId) return { success: false, error: "Unauthorized" }
  if (!input.title || !input.content) {
    return { success: false, error: "Title and content are required" }
  }

  try {
    if (input.applicationId) {
      const ownedApp = await withDbRetry<any>(() =>
        prisma.application.findFirst({
          where: { id: input.applicationId, userId },
        })
      )
      if (!ownedApp) {
        return { success: false, error: "Unauthorized application access" }
      }
    }

    const note = await withDbRetry<any>(() =>
      prisma.prepNote.create({
        data: {
          userId,
          title: input.title.trim(),
          content: input.content.trim(),
          category: input.category?.trim() || "General",
          applicationId: input.applicationId || null,
        },
      })
    )

    return {
      success: true,
      message: `Saved prep note "${note.title}"`,
      note,
    }
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to save prep note" }
  }
}

export async function executeResearchCompanyIntel(userId: string, input: {
  companyName: string
  website?: string
  industry?: string
}) {
  if (!userId) return { success: false, error: "Unauthorized" }
  if (!input.companyName || !input.companyName.trim()) {
    return { success: false, error: "Company name is required" }
  }

  const normalizedName = input.companyName.trim()

  try {
    let company = await withDbRetry<any>(() =>
      prisma.company.findFirst({
        where: {
          userId,
          name: { equals: normalizedName, mode: "insensitive" },
        },
        include: {
          applications: {
            select: { id: true, jobTitle: true, status: true, interviewDate: true },
          },
        },
      })
    )

    if (!company) {
      company = await withDbRetry<any>(() =>
        prisma.company.create({
          data: {
            userId,
            name: normalizedName,
            website: input.website?.trim() || null,
            industry: input.industry?.trim() || null,
            notes: `Researched via Career Assistant for ${normalizedName}.`,
          },
          include: {
            applications: {
              select: { id: true, jobTitle: true, status: true, interviewDate: true },
            },
          },
        })
      )
    }

    const recentSessions = await withDbRetry<any[]>(() =>
      prisma.interviewSession.findMany({
        where: {
          userId,
          targetCompany: { equals: normalizedName, mode: "insensitive" },
        },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { id: true, score: true, verdict: true, createdAt: true },
      })
    )

    return {
      success: true,
      company: {
        id: company.id,
        name: company.name,
        website: company.website,
        industry: company.industry,
        notes: company.notes,
        activeApplications: company.applications || [],
        recentMockInterviewSessions: recentSessions,
      },
      message: `Retrieved company intelligence for ${company.name}`,
    }
  } catch (error: any) {
    return { success: false, error: error?.message || `Failed to research company intel for ${normalizedName}` }
  }
}

export async function executeGetPipelineStats(userId: string) {
  if (!userId) return { success: false, error: "Unauthorized" }

  try {
    const [groups, total] = await withDbRetry(() =>
      Promise.all([
        prisma.application.groupBy({
          by: ["status"],
          where: { userId },
          _count: true,
        }),
        prisma.application.count({ where: { userId } }),
      ])
    )

    const breakdown: Record<string, number> = {
      Staged: 0,
      Saved: 0,
      Applied: 0,
      Assessment: 0,
      Interview: 0,
      Rejected: 0,
      Offer: 0,
      Archived: 0,
    }

    groups.forEach((g: any) => {
      breakdown[g.status] = g._count
    })

    return {
      success: true,
      total,
      breakdown,
      message: `Total applications: ${total}. Saved: ${breakdown.Saved || 0}, Applied: ${breakdown.Applied || 0}, Interview: ${breakdown.Interview || 0}, Offer: ${breakdown.Offer || 0}, Rejected: ${breakdown.Rejected || 0}`,
    }
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to retrieve pipeline stats" }
  }
}

export async function executeListUserApplications(
  userId: string,
  input: { status?: string; limit?: number } = {}
) {
  return await executeSearchApplications(userId, {
    status: input.status,
    limit: input.limit || 15,
  })
}
