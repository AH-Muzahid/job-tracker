import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getInternalUserId } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const category = searchParams.get("category")
  const applicationId = searchParams.get("applicationId")

  const where: Record<string, unknown> = { userId }
  if (category) where.category = category
  if (applicationId) where.applicationId = applicationId

  const notes = await prisma.prepNote.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { application: { select: { id: true, companyName: true, jobTitle: true } } },
  })

  return NextResponse.json(notes)
}

export async function POST(req: Request) {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    if (!body.title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    const note = await prisma.prepNote.create({
      data: {
        userId,
        title: body.title.trim(),
        content: body.content || "",
        category: body.category || "General",
        applicationId: body.applicationId || null,
      },
    })

    return NextResponse.json(note, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
