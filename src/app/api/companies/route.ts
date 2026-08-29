import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getInternalUserId } from "@/lib/auth"
import { getCachedJson, setCachedJson, invalidateCache } from "@/lib/redis"
import { checkIdempotency, storeResult, generateIdempotencyKey } from "@/lib/ai/idempotency"

export async function GET(req: NextRequest) {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search")?.toLowerCase()

  const cacheKey = `user:companies:${userId}:${search || "all"}`
  const cached = await getCachedJson(cacheKey)
  if (cached) return NextResponse.json(cached)

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

  await setCachedJson(cacheKey, companies, 60)
  return NextResponse.json(companies)
}

export async function POST(req: Request) {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const idempotencyKey = req.headers.get("idempotency-key")
  if (idempotencyKey) {
    const { isDuplicate, existingResult } = await checkIdempotency(
      generateIdempotencyKey({ userId, action: "create", resourceType: "company", bodyHash: idempotencyKey })
    )
    if (isDuplicate) {
      return NextResponse.json(existingResult)
    }
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const name = (body.name as string)?.trim()
  if (!name) {
    return NextResponse.json({ error: "Company name is required" }, { status: 400 })
  }

  const existing = await prisma.company.findFirst({
    where: { userId, name: { equals: name, mode: "insensitive" } },
  })
  if (existing) {
    return NextResponse.json(existing)
  }

  const company = await prisma.company.create({
    data: {
      userId,
      name,
      website: (body.website as string) || null,
      industry: (body.industry as string) || null,
      notes: (body.notes as string) || null,
    },
  })

  if (idempotencyKey) {
    await storeResult(
      generateIdempotencyKey({ userId, action: "create", resourceType: "company", bodyHash: idempotencyKey }),
      company
    )
  }

  void invalidateCache(`user:companies:${userId}`)
  return NextResponse.json(company, { status: 201 })
}
