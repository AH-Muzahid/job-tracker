import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getInternalUserId } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search")?.toLowerCase()

  const where: Record<string, unknown> = { userId }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { industry: { contains: search, mode: "insensitive" } },
    ]
  }

  const companies = await prisma.company.findMany({
    where,
    orderBy: { name: "asc" },
    include: {
      _count: { select: { applications: true } },
    },
  })

  return NextResponse.json(companies)
}

export async function POST(req: Request) {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const company = await prisma.company.create({
      data: {
        userId,
        name: body.name.trim(),
        website: body.website || null,
        industry: body.industry || null,
        notes: body.notes || null,
      },
    })

    return NextResponse.json(company, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
