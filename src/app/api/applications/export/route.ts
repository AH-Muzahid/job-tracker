import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getInternalUserId } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const userId = await getInternalUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")

  const where: Record<string, unknown> = { userId }
  if (status && status !== "all") where.status = status

  const applications = await prisma.application.findMany({
    where,
    orderBy: { applicationDate: "desc" },
  })

  const headers = ["Company Name", "Job Title", "Source", "Status", "Application Date", "Job URL", "Notes", "Created At"]
  const rows = applications.map((a) => [
    escapeCsv(a.companyName),
    escapeCsv(a.jobTitle),
    escapeCsv(a.source),
    escapeCsv(a.status),
    a.applicationDate.toISOString().split("T")[0],
    escapeCsv(a.jobUrl || ""),
    escapeCsv(a.notes || ""),
    a.createdAt.toISOString(),
  ])

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n")

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="applications-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  })
}

function escapeCsv(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}
