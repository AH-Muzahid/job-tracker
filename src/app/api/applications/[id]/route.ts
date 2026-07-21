import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getInternalUserId } from "@/lib/auth"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getInternalUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const application = await prisma.application.findUnique({ where: { id } })

  if (!application) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  if (application.userId !== userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  return NextResponse.json(application)
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getInternalUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const existing = await prisma.application.findUnique({ where: { id } })

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  if (existing.userId !== userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const body = await req.json()

    const validStatuses = ["Saved", "Applied", "Assessment", "Interview", "Rejected", "Offer"]
    if (body.status && !validStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      )
    }

    const validSources = [
      "LinkedIn", "Bdjobs", "Indeed", "Wellfound",
      "Facebook", "Referral", "Other",
    ]
    if (body.source && !validSources.includes(body.source)) {
      return NextResponse.json(
        { error: `Invalid source. Must be one of: ${validSources.join(", ")}` },
        { status: 400 }
      )
    }

    const application = await prisma.application.update({
      where: { id },
      data: {
        ...(body.companyName && { companyName: body.companyName }),
        ...(body.jobTitle && { jobTitle: body.jobTitle }),
        ...(body.jobUrl !== undefined && { jobUrl: body.jobUrl }),
        ...(body.source && { source: body.source }),
        ...(body.applicationDate && { applicationDate: new Date(body.applicationDate) }),
        ...(body.status && { status: body.status }),
        ...(body.notes !== undefined && { notes: body.notes }),
      },
    })

    return NextResponse.json(application)
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    )
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getInternalUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const existing = await prisma.application.findUnique({ where: { id } })

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  if (existing.userId !== userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  await prisma.application.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
