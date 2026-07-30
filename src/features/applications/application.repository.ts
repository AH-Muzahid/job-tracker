import { prisma } from "@/lib/prisma"
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
      where.status = status
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

    const [applications, total] = await Promise.all([
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

    return { data: applications, total, page, pageSize }
  }

  static async findById(id: string) {
    return prisma.application.findUnique({
      where: { id },
      include: {
        tags: { include: { tag: true } },
        statusChanges: { orderBy: { changedAt: "desc" } },
      },
    })
  }

  static async create(userId: string, data: CreateApplicationDto) {
    return prisma.application.create({
      data: {
        userId,
        companyName: data.companyName,
        jobTitle: data.jobTitle,
        jobUrl: data.jobUrl || null,
        source: data.source,
        applicationDate: new Date(data.applicationDate),
        status: data.status,
        notes: data.notes || null,
        statusChanges: { create: { toStatus: data.status } },
        ...(data.tagIds?.length
          ? { tags: { create: data.tagIds.map((id) => ({ tagId: id })) } }
          : {}),
      },
      include: { tags: { include: { tag: true } } },
    })
  }

  static async update(id: string, existingStatus: string, data: UpdateApplicationDto) {
    const newStatus = data.status
    const statusChanged = Boolean(newStatus && newStatus !== existingStatus)

    return prisma.application.update({
      where: { id },
      data: {
        ...(data.companyName && { companyName: data.companyName }),
        ...(data.jobTitle && { jobTitle: data.jobTitle }),
        ...(data.jobUrl !== undefined && { jobUrl: data.jobUrl }),
        ...(data.source && { source: data.source }),
        ...(data.applicationDate && { applicationDate: new Date(data.applicationDate) }),
        ...(newStatus && { status: newStatus }),
        ...(data.notes !== undefined && { notes: data.notes }),
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
  }

  static async delete(id: string) {
    return prisma.application.delete({ where: { id } })
  }
}
