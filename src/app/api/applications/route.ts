import { NextRequest, NextResponse } from "next/server"
import { auth, clerkClient } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

async function getInternalUserId() {
  const { userId: clerkUserId } = await auth()
  if (!clerkUserId) return null

  let user = await prisma.user.findUnique({
    where: { clerkUserId },
    select: { id: true },
  })

  if (!user) {
    const clerkUser = await (await clerkClient()).users.getUser(clerkUserId)
    const email = clerkUser.emailAddresses?.[0]?.emailAddress
    const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || email

    user = await prisma.user.create({
      data: {
        clerkUserId,
        name: name || "",
        email: email || "",
      },
      select: { id: true },
    })
  }

  return user.id
}

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

  const orderBy = sort === "oldest"
    ? { applicationDate: "asc" as const }
    : { applicationDate: "desc" as const }

  const applications = await prisma.application.findMany({
    where,
    orderBy,
  })

  return NextResponse.json(applications)
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
      },
    })

    return NextResponse.json(application, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    )
  }
}
