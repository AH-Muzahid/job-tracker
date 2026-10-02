import { NextRequest, NextResponse } from "next/server"
import { getInternalUserId } from "@/lib/auth"
import {
  findSalaryBenchmark,
  computeSalaryIndex,
  parseSalaryString,
} from "@/lib/salary/benchmark-engine"
import { checkDistributedRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { z } from "zod"

export const dynamic = "force-dynamic"

const SalaryQuerySchema = z.object({
  company: z.string().min(1, "Company name is required"),
  role: z.string().optional(),
  location: z.string().optional(),
  offeredSalary: z.string().optional(),
  currency: z.string().optional(),
})

export async function GET(request: NextRequest) {
  const userId = await getInternalUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rateLimit = await checkDistributedRateLimit(`salary:${userId}`, 30, 60)
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit)
  }

  const { searchParams } = new URL(request.url)
  const validation = SalaryQuerySchema.safeParse({
    company: searchParams.get("company") ?? "",
    role: searchParams.get("role") || undefined,
    location: searchParams.get("location") || undefined,
    offeredSalary: searchParams.get("offeredSalary") || undefined,
    currency: searchParams.get("currency") || undefined,
  })

  if (!validation.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: validation.error.flatten() },
      { status: 400 }
    )
  }

  const { company, role, location, offeredSalary, currency } = validation.data

  try {
    const parsedSalary = offeredSalary ? parseSalaryString(offeredSalary) : null
    const targetCurrency = currency || parsedSalary?.currency

    const benchmarkResult = await findSalaryBenchmark({
      company,
      role,
      location,
      currency: targetCurrency,
    })

    if (!benchmarkResult) {
      return NextResponse.json(
        { message: "No salary benchmark found", benchmark: null, assessment: null },
        { status: 200 }
      )
    }

    let assessment = null
    if (parsedSalary) {
      assessment = computeSalaryIndex(parsedSalary.midpoint, benchmarkResult.benchmark)
    } else if (offeredSalary) {
      const num = parseFloat(offeredSalary.replace(/[^0-9.]/g, ""))
      if (!isNaN(num) && num > 0) {
        assessment = computeSalaryIndex(num, benchmarkResult.benchmark)
      }
    }

    return NextResponse.json({
      success: true,
      company,
      benchmark: benchmarkResult.benchmark,
      matchScore: benchmarkResult.matchScore,
      source: benchmarkResult.source,
      assessment,
    })
  } catch (error) {
    console.error("[SalaryRouteError]:", error)
    return NextResponse.json(
      { error: "Internal server error fetching salary benchmark" },
      { status: 500 }
    )
  }
}
