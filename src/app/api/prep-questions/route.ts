import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getInternalUserId } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const category = searchParams.get("category")
  const search = searchParams.get("search")?.toLowerCase()

  const where: Record<string, unknown> = { userId }
  if (category) where.category = category
  if (search) {
    where.OR = [
      { question: { contains: search, mode: "insensitive" } },
      { answer: { contains: search, mode: "insensitive" } },
    ]
  }

  const questions = await prisma.prepQuestion.findMany({
    where,
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(questions)
}

export async function POST(req: Request) {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    if (!body.question?.trim()) {
      return NextResponse.json({ error: "Question is required" }, { status: 400 })
    }

    const question = await prisma.prepQuestion.create({
      data: {
        userId,
        question: body.question.trim(),
        answer: body.answer || null,
        category: body.category || "General",
        difficulty: body.difficulty || "Medium",
      },
    })

    return NextResponse.json(question, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
