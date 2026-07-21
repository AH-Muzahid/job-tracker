import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getInternalUserId } from "@/lib/auth"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const q = await prisma.prepQuestion.findUnique({ where: { id } })
  if (!q || q.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json(q)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const existing = await prisma.prepQuestion.findUnique({ where: { id } })
  if (!existing || existing.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()
  const question = await prisma.prepQuestion.update({
    where: { id },
    data: {
      ...(body.question && { question: body.question }),
      ...(body.answer !== undefined && { answer: body.answer }),
      ...(body.category && { category: body.category }),
      ...(body.difficulty && { difficulty: body.difficulty }),
    },
  })

  return NextResponse.json(question)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const existing = await prisma.prepQuestion.findUnique({ where: { id } })
  if (!existing || existing.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.prepQuestion.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
