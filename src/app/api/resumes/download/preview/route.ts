/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { getInternalUserId } from "@/lib/auth"
import { buildResumePdfBuffer } from "@/lib/pdf/generator"
import type { TailoredResumeData } from "@/types/tailored-resume"

export async function POST(req: NextRequest) {
  const userId = await getInternalUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const data = (await req.json()) as TailoredResumeData
    if (!data || !data.header) {
      return NextResponse.json({ error: "Invalid resume data payload" }, { status: 400 })
    }

    const pdfBuffer = await buildResumePdfBuffer(data)
    const sanitizedFileName = (data.targetCompany ? `${data.targetCompany}-Tailored-Resume` : "Tailored-Resume")
      .replace(/[^a-zA-Z0-9-_]/g, "_")
      .slice(0, 40)

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${sanitizedFileName}.pdf"`,
      },
    })
  } catch (error: any) {
    console.error("[Resume Preview PDF Error]:", error)
    return NextResponse.json({ error: error?.message || "Failed to generate PDF" }, { status: 500 })
  }
}
