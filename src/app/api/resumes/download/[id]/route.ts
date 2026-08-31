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
    const [resume, profile, user] = await Promise.all([
      withDbRetry<any>(() => prisma.resume.findFirst({ where: { id, userId } })),
      withDbRetry<any>(() => prisma.userProfile.findUnique({ where: { userId } })),
      withDbRetry<any>(() => prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } })),
    ])

    if (!resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 })
    }

    let structuredData: TailoredResumeData

    // Check if textContent is stored as structured JSON
    try {
      if (resume.textContent && resume.textContent.trim().startsWith("{")) {
        structuredData = JSON.parse(resume.textContent)
      } else {
        throw new Error("Plain text")
      }
    } catch {
      // Fallback: construct structured resume from plain text & profile
      const rawText = resume.textContent || ""
      const lines = rawText.split("\n").map((l: string) => l.trim()).filter(Boolean)
      const bullets = lines.filter((l: string) => l.startsWith("-") || l.startsWith("•")).map((l: string) => l.replace(/^[-•]\s*/, ""))

      structuredData = {
        header: {
          fullName: user?.name || profile?.targetRoles?.[0] || "Software Engineer",
          title: profile?.targetRoles?.[0] || resume.title || "Software Engineer",
          email: user?.email || "candidate@example.com",
          location: profile?.location || undefined,
          linkedinUrl: profile?.linkedInUrl || undefined,
          githubUrl: profile?.githubUrl || undefined,
          portfolioUrl: profile?.portfolioUrl || undefined,
        },
        summary: lines.find((l: string) => l.length > 50 && !l.startsWith("-")) || profile?.strengths || "Experienced engineer specialized in modern scalable web systems.",
        skillsByDomain: [
          {
            domain: "Core Skills",
            skills: profile?.strengths ? profile.strengths.split(/[,/|\n]+/).map((s: string) => s.trim()) : ["TypeScript", "React", "Node.js", "PostgreSQL"],
          },
        ],
        experience: [
          {
            role: profile?.targetRoles?.[0] || "Software Engineer",
            company: "Professional Experience",
            duration: "2022 - Present",
            bullets: bullets.length > 0 ? bullets.slice(0, 5) : [
              "Designed and built scalable distributed application features reducing response latency.",
              "Collaborated with cross-functional teams to deliver production-ready software solutions.",
            ],
          },
        ],
        projects: [
          {
            name: "Featured Engineering Project",
            stack: ["TypeScript", "React", "PostgreSQL"],
            bullets: ["Architected high-throughput backend services and modern responsive client interfaces."],
          },
        ],
        education: [
          {
            degree: "B.S. in Computer Science or Related Field",
            institution: "University / Institute",
            year: "2020",
          },
        ],
      }
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
