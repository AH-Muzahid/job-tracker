import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getInternalUserId } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const userId = await getInternalUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search")?.toLowerCase()
  const status = searchParams.get("status")
  const source = searchParams.get("source")
  const sort = searchParams.get("sort") || "newest"
  const tag = searchParams.get("tag")

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

  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
  const pageSize = Math.min(500, Math.max(1, parseInt(searchParams.get("pageSize") || "100", 10)))
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

  return NextResponse.json({ data: applications, total, page, pageSize })
}

export async function POST(req: Request) {
  const userId = await getInternalUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()

    const requiredFields = ["companyName", "jobTitle", "applicationDate", "status", "source"]
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        )
      }
    }

    const validStatuses = ["Saved", "Applied", "Assessment", "Interview", "Rejected", "Offer"]
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      )
    }

    const validSources = [
      "LinkedIn", "Bdjobs", "Indeed", "Wellfound",
      "Facebook", "Referral", "Other",
    ]
    if (!validSources.includes(body.source)) {
      return NextResponse.json(
        { error: `Invalid source. Must be one of: ${validSources.join(", ")}` },
        { status: 400 }
      )
    }

    const application = await prisma.application.create({
      data: {
        userId,
        companyName: body.companyName,
        jobTitle: body.jobTitle,
        jobUrl: body.jobUrl || null,
        source: body.source,
        applicationDate: new Date(body.applicationDate),
        status: body.status,
        notes: body.notes || null,
        statusChanges: { create: { toStatus: body.status } },
        ...(body.tagIds?.length
          ? { tags: { create: body.tagIds.map((id: string) => ({ tagId: id })) } }
          : {}),
      },
      include: { tags: { include: { tag: true } } },
    })

    return NextResponse.json(application, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    )
  }
}
