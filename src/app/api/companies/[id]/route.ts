import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getInternalUserId } from "@/lib/auth"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      applications: {
        orderBy: { applicationDate: "desc" },
        include: { tags: { include: { tag: true } } },
      },
    },
  })

  if (!company || company.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json(company)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const existing = await prisma.company.findUnique({ where: { id } })
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const body = await req.json()
  const company = await prisma.company.update({
    where: { id },
    data: {
      ...(body.name && { name: body.name }),
      ...(body.website !== undefined && { website: body.website }),
      ...(body.industry !== undefined && { industry: body.industry }),
      ...(body.notes !== undefined && { notes: body.notes }),
    },
  })

  return NextResponse.json(company)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const existing = await prisma.company.findUnique({ where: { id } })
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await prisma.company.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
