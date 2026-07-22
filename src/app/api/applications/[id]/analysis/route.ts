import { NextRequest, NextResponse } from "next/server"
import { getInternalUserId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const app = await prisma.application.findFirst({ where: { id, userId } })
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const analysis = await prisma.applicationAnalysis.findUnique({
    where: { applicationId: id },
  })

  return NextResponse.json(analysis || {})
}
