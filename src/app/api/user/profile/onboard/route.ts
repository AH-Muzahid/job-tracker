import { NextRequest, NextResponse } from "next/server"
import { getInternalUserId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()

  const profile = await prisma.userProfile.upsert({
    where: { userId },
    create: { userId, ...body },
    update: body,
  })

  return NextResponse.json(profile)
}
