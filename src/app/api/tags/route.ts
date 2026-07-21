import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getInternalUserId } from "@/lib/auth"

export async function GET() {
  const userId = await getInternalUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tags = await prisma.tag.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  })

  return NextResponse.json(tags)
}

export async function POST(req: Request) {
  const userId = await getInternalUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const name = body.name?.trim()
    if (!name) {
      return NextResponse.json({ error: "Tag name is required" }, { status: 400 })
    }

    const existing = await prisma.tag.findUnique({
      where: { userId_name: { userId, name } },
    })
    if (existing) {
      return NextResponse.json(existing)
    }

    const tag = await prisma.tag.create({ data: { userId, name } })
    return NextResponse.json(tag, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}

export async function DELETE(req: Request) {
  const userId = await getInternalUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) {
    return NextResponse.json({ error: "Tag ID is required" }, { status: 400 })
  }

  const tag = await prisma.tag.findUnique({ where: { id } })
  if (!tag || tag.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await prisma.tag.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
