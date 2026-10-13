import { buildVerifiedResume, TailoredResumeSchema } from "@/lib/ai/verified-resume"
/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { getInternalUserId } from "@/lib/auth"
import { prisma, withDbRetry } from "@/lib/prisma"
import { buildResumePdfBuffer } from "@/lib/pdf/generator"
import type { TailoredResumeData } from "@/types/tailored-resume"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getInternalUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: "Resume ID is required" }, { status: 400 })
  }

  try {
    const resume = await withDbRetry<any>(() => prisma.resume.findFirst({ where: { id, userId } }))

    if (!resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 })
    }

    let structuredData: TailoredResumeData

    // Check if textContent is stored as structured JSON
    try {
      if (resume.textContent && resume.textContent.trim().startsWith("{")) {
        structuredData = TailoredResumeSchema.parse(JSON.parse(resume.textContent))
      } else {
        throw new Error("Plain text")
      }
    } catch {
      const verified = await buildVerifiedResume(userId, { jdText: "General resume preview without tailoring", resumeId: id })
      structuredData = verified.data

    }

    const pdfBuffer = await buildResumePdfBuffer(structuredData)
    const sanitizedFileName = (resume.title || "Tailored-Resume")
      .replace(/[^a-zA-Z0-9-_]/g, "_")
      .slice(0, 40)

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${sanitizedFileName}.pdf"`,
        "Cache-Control": "private, max-age=3600",
      },
    })
  } catch (error: any) {
    console.error("[Resume Download PDF Error]:", error)
    return NextResponse.json({ error: error?.message || "Failed to generate PDF" }, { status: 500 })
  }
}
