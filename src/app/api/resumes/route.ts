import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getInternalUserId } from "@/lib/auth"

export async function GET() {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const resumes = await prisma.resume.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  })

  return NextResponse.json(resumes)
}

export async function POST(req: Request) {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    if (!body.title?.trim() || !body.fileName || !body.fileUrl) {
      return NextResponse.json({ error: "Title, fileName, and fileUrl are required" }, { status: 400 })
    }

    if (body.isDefault) {
      await prisma.resume.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      })
    }

    const resume = await prisma.resume.create({
      data: {
        userId,
        title: body.title.trim(),
        fileName: body.fileName,
        fileUrl: body.fileUrl,
        fileSize: body.fileSize || 0,
        isDefault: body.isDefault || false,
      },
    })

    return NextResponse.json(resume, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
