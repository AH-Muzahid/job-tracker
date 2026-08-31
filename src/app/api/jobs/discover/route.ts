/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { getInternalUserId } from "@/lib/auth"
import {
  executeSearchExternalJobs,
  executeSaveJobOpportunityToTracker,
} from "@/lib/ai/graph/tools/discovery-tools"
import { ResponseUtil } from "@/lib/api-response"

export async function GET(request: NextRequest) {
  const userId = await getInternalUserId()
  if (!userId) {
    return NextResponse.json(ResponseUtil.error("Unauthorized", 401), { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const query = searchParams.get("query") || undefined
  const location = searchParams.get("location") || undefined
  const tags = searchParams.get("tags") ? searchParams.get("tags")!.split(",") : undefined
  const limit = parseInt(searchParams.get("limit") || "8", 10)

  try {
    const result = await executeSearchExternalJobs(userId, {
      query,
      location,
      tags,
      limit,
    })

    if (!result.success) {
      return NextResponse.json(ResponseUtil.error(result.error || "Failed to discover jobs"), { status: 500 })
    }

    return NextResponse.json(ResponseUtil.success(result))
  } catch (error: any) {
    return NextResponse.json(ResponseUtil.error(error?.message || "Internal server error"), { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const userId = await getInternalUserId()
  if (!userId) {
    return NextResponse.json(ResponseUtil.error("Unauthorized", 401), { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const { action } = body

    if (action === "save") {
      const { companyName, jobTitle, jobUrl, location, salary, notes } = body
      if (!companyName || !jobTitle) {
        return NextResponse.json(ResponseUtil.error("companyName and jobTitle are required"), { status: 400 })
      }

      const saveResult = await executeSaveJobOpportunityToTracker(userId, {
        companyName,
        jobTitle,
        jobUrl,
        location,
        salary,
        notes,
      })

      if (!saveResult.success) {
        return NextResponse.json(ResponseUtil.error(saveResult.error || "Failed to save job"), { status: 500 })
      }

      return NextResponse.json(ResponseUtil.success(saveResult))
    }

    // Default: Search via POST body
    const { query, location, tags, limit } = body
    const searchResult = await executeSearchExternalJobs(userId, {
      query,
      location,
      tags,
      limit: limit || 8,
    })

    return NextResponse.json(ResponseUtil.success(searchResult))
  } catch (error: any) {
    return NextResponse.json(ResponseUtil.error(error?.message || "Internal server error"), { status: 500 })
  }
}
