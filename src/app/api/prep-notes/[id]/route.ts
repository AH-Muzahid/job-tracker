import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getInternalUserId } from "@/lib/auth"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const note = await prisma.prepNote.findUnique({
    where: { id },
    include: { application: { select: { id: true, companyName: true, jobTitle: true } } },
  })
  if (!note || note.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json(note)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const existing = await prisma.prepNote.findUnique({ where: { id } })
  if (!existing || existing.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()
  const note = await prisma.prepNote.update({
    where: { id },
    data: {
      ...(body.title && { title: body.title }),
      ...(body.content !== undefined && { content: body.content }),
      ...(body.category && { category: body.category }),
      ...(body.applicationId !== undefined && { applicationId: body.applicationId }),
    },
  })

  return NextResponse.json(note)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const existing = await prisma.prepNote.findUnique({ where: { id } })
  if (!existing || existing.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.prepNote.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
