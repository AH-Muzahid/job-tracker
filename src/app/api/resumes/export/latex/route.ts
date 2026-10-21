/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { getInternalUserId } from "@/lib/auth"
import { prisma, withDbRetry } from "@/lib/prisma"
import { generateLatexResume } from "@/lib/pdf/latex-generator"
import { buildVerifiedResume, TailoredResumeSchema } from "@/lib/ai/verified-resume"
import type { TailoredResumeData } from "@/types/tailored-resume"

export async function POST(req: NextRequest) {
  const userId = await getInternalUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const parsedData = TailoredResumeSchema.safeParse(body)
    if (!parsedData.success) {
      return NextResponse.json({ error: "Invalid resume structure" }, { status: 400 })
    }

    const latexSource = generateLatexResume(parsedData.data)
    const fileName = `${(parsedData.data.header.fullName || "Tailored-Resume")
      .replace(/[^a-zA-Z0-9-_]/g, "_")
      .slice(0, 40)}.tex`

    return new NextResponse(latexSource, {
      status: 200,
      headers: {
        "Content-Type": "text/x-tex; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to generate LaTeX resume" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const userId = await getInternalUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const resumeId = searchParams.get("resumeId")
  if (!resumeId) {
    return NextResponse.json({ error: "resumeId is required" }, { status: 400 })
  }

  try {
    const resume = await withDbRetry<any>(() => prisma.resume.findFirst({ where: { id: resumeId, userId } }))
    if (!resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 })
    }

    let structuredData: TailoredResumeData
    try {
      if (resume.textContent && resume.textContent.trim().startsWith("{")) {
        structuredData = TailoredResumeSchema.parse(JSON.parse(resume.textContent))
      } else {
        throw new Error("Plain text")
      }
    } catch {
      const verified = await buildVerifiedResume(userId, { jdText: "General resume export", resumeId })
      structuredData = verified.data
    }

    const latexSource = generateLatexResume(structuredData)
    const fileName = `${(structuredData.header.fullName || "Tailored-Resume")
      .replace(/[^a-zA-Z0-9-_]/g, "_")
      .slice(0, 40)}.tex`

    return new NextResponse(latexSource, {
      status: 200,
      headers: {
        "Content-Type": "text/x-tex; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to export LaTeX resume" }, { status: 500 })
  }
}
