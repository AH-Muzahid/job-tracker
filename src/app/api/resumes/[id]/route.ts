import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getInternalUserId } from "@/lib/auth"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const existing = await prisma.resume.findUnique({ where: { id } })
  if (!existing || existing.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()

  if (body.isDefault) {
    await prisma.resume.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    })
  }

  const resume = await prisma.resume.update({
    where: { id },
    data: {
      ...(body.title && { title: body.title }),
      ...(body.isDefault !== undefined && { isDefault: body.isDefault }),
    },
  })

  return NextResponse.json(resume)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const existing = await prisma.resume.findUnique({ where: { id } })
  if (!existing || existing.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.resume.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
