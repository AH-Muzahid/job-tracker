import { NextRequest, NextResponse } from "next/server"
import { getInternalUserId } from "@/lib/auth"
import { ApplicationService } from "@/features/applications"
import { MAX_PAGE_SIZE } from "@/features/applications/application.constants"
import { checkIdempotency, storeResult, generateIdempotencyKey } from "@/lib/ai/idempotency"

export async function GET(req: NextRequest) {
  const userId = await getInternalUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search")
  const status = searchParams.get("status")
  const source = searchParams.get("source")
  const sort = searchParams.get("sort")
  const tag = searchParams.get("tag")
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(searchParams.get("pageSize") || "100", 10)))

  const result = await ApplicationService.listApplications(userId, {
    search,
    status,
    source,
    sort,
    tag,
    page,
    pageSize,
  })

  return NextResponse.json(result)
}

export async function POST(req: Request) {
  const userId = await getInternalUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const idempotencyKey = req.headers.get("idempotency-key")
  if (idempotencyKey) {
    const { isDuplicate, existingResult } = await checkIdempotency(
      generateIdempotencyKey({ userId, action: "create", resourceType: "application", bodyHash: idempotencyKey })
    )
    if (isDuplicate) {
      return NextResponse.json(existingResult)
    }
  }

  try {
    const body = await req.json()
    const result = await ApplicationService.createApplication(userId, body)

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    if (idempotencyKey) {
      await storeResult(
        generateIdempotencyKey({ userId, action: "create", resourceType: "application", bodyHash: idempotencyKey }),
        result.data
      )
    }

    return NextResponse.json(result.data, { status: result.status })
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    )
  }
}

