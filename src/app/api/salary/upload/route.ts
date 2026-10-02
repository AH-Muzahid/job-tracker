import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma, withDbRetry } from "@/lib/prisma"
import { getInternalUserId } from "@/lib/auth"
import type { Prisma } from "@prisma/client"

export const runtime = "nodejs"

const SalaryUploadItemSchema = z.object({
  company: z.string().min(1, "Company is required"),
  role: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  salaryMin: z.coerce.number().positive().optional().nullable(),
  salaryMax: z.coerce.number().positive().optional().nullable(),
  salaryMedian: z.coerce.number().positive().optional().nullable(),
  currency: z.string().default("USD"),
  source: z.string().default("User BYO Upload"),
  confidence: z.coerce.number().default(1.0),
})

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim())
      current = ""
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

function parseCsv(csvText: string): Record<string, string>[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  if (lines.length < 2) return []

  const headerLine = parseCsvLine(lines[0])
  const headerMap: Record<number, string> = {}

  headerLine.forEach((h, idx) => {
    const normalized = h.toLowerCase().replace(/[^a-z0-9]/g, "")
    if (normalized === "company" || normalized === "employer" || normalized === "companyname") {
      headerMap[idx] = "company"
    } else if (
      normalized === "role" ||
      normalized === "title" ||
      normalized === "jobtitle" ||
      normalized === "position"
    ) {
      headerMap[idx] = "role"
    } else if (normalized === "location" || normalized === "city" || normalized === "region") {
      headerMap[idx] = "location"
    } else if (normalized === "salarymin" || normalized === "min" || normalized === "minsalary") {
      headerMap[idx] = "salaryMin"
    } else if (normalized === "salarymax" || normalized === "max" || normalized === "maxsalary") {
      headerMap[idx] = "salaryMax"
    } else if (
      normalized === "salarymedian" ||
      normalized === "median" ||
      normalized === "salary" ||
      normalized === "base"
    ) {
      headerMap[idx] = "salaryMedian"
    } else if (normalized === "currency") {
      headerMap[idx] = "currency"
    } else if (normalized === "source") {
      headerMap[idx] = "source"
    }
  })

  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i])
    const row: Record<string, string> = {}
    let hasValue = false

    values.forEach((val, idx) => {
      const field = headerMap[idx]
      if (field && val) {
        row[field] = val
        hasValue = true
      }
    })

    if (hasValue && row.company) {
      rows.push(row)
    }
  }

  return rows
}

export async function POST(req: Request) {
  const userId = await getInternalUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const contentType = req.headers.get("content-type") || ""
    let rawRecords: unknown[] = []

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData()
      const file = formData.get("file") as File | string | null

      if (!file) {
        return NextResponse.json({ error: "File is required in form-data" }, { status: 400 })
      }

      let text = ""
      if (typeof file === "string") {
        text = file
      } else {
        if (file.size > 5 * 1024 * 1024) {
          return NextResponse.json({ error: "File exceeds 5MB size limit" }, { status: 400 })
        }

        if ("text" in file && typeof file.text === "function") {
          try {
            text = await file.text()
          } catch {
            // ignore
          }
        }
        if (!text || text === "undefined") {
          try {
            const buf = Buffer.from(await file.arrayBuffer())
            text = buf.toString("utf-8")
          } catch {
            // ignore
          }
        }
      }

      const fileName = typeof file === "string" ? "" : (file?.name || "").toLowerCase()

      if (fileName.endsWith(".json")) {
        const parsed = JSON.parse(text)
        rawRecords = Array.isArray(parsed) ? parsed : (parsed as { records?: unknown[] }).records || []
      } else {
        rawRecords = parseCsv(text)
      }
    } else {
      const body = await req.json()
      rawRecords = Array.isArray(body) ? body : (body as { records?: unknown[] }).records || []
    }

    if (!Array.isArray(rawRecords) || rawRecords.length === 0) {
      return NextResponse.json(
        { error: "No valid salary benchmark records found in upload" },
        { status: 400 }
      )
    }

    // Limit to 1000 items per batch
    const recordsToProcess = rawRecords.slice(0, 1000)
    const validRecords: Prisma.SalaryBenchmarkCreateManyInput[] = []

    for (const raw of recordsToProcess) {
      const parsed = SalaryUploadItemSchema.safeParse(raw)
      if (!parsed.success) continue

      const item = parsed.data
      let median = item.salaryMedian
      if (!median && item.salaryMin && item.salaryMax) {
        median = Math.round((item.salaryMin + item.salaryMax) / 2)
      } else if (!median && item.salaryMin) {
        median = item.salaryMin
      } else if (!median && item.salaryMax) {
        median = item.salaryMax
      }

      validRecords.push({
        company: item.company.trim(),
        role: item.role?.trim() || null,
        location: item.location?.trim() || null,
        salaryMin: item.salaryMin || null,
        salaryMax: item.salaryMax || null,
        salaryMedian: median || null,
        currency: item.currency.toUpperCase().trim() || "USD",
        source: item.source || "User BYO Upload",
        confidence: item.confidence || 1.0,
      })
    }

    if (validRecords.length === 0) {
      return NextResponse.json(
        { error: "No records satisfied the schema requirements (missing company name)" },
        { status: 400 }
      )
    }

    // Batch insert into database
    const created = await withDbRetry(() =>
      prisma.salaryBenchmark.createMany({
        data: validRecords,
      })
    )

    return NextResponse.json({
      success: true,
      count: created.count,
      message: `Successfully imported ${created.count} salary benchmark(s)`,
    })
  } catch (error: unknown) {
    console.error("[SalaryUploadAPI] Error importing salary data:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to process salary dataset"
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
