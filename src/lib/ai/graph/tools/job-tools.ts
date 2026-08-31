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

    const application = await withDbRetry<any>(() =>
      prisma.application.create({
        data: {
          userId,
          companyName: input.companyName.trim(),
          jobTitle: input.jobTitle.trim(),
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

    await invalidateCache(`dashboard:stats:${userId}`)
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
