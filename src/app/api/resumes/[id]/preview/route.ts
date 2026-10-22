import { NextResponse } from "next/server"
import { prisma, withDbRetry } from "@/lib/prisma"
import { getInternalUserId } from "@/lib/auth"
import { readResumeFile } from "@/lib/storage"
import * as Sentry from "@sentry/nextjs"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getInternalUserId()
    if (!userId) return new NextResponse("Unauthorized", { status: 401 })

    const { id } = await params

    const resume = await withDbRetry(() =>
      prisma.resume.findFirst({
        where: { id, userId },
      })
    )

    if (!resume) return new NextResponse("Not found", { status: 404 })

    const fileBuffer = await readResumeFile(resume.fileUrl)

    if (fileBuffer) {
      const ext = resume.fileName.split(".").pop()?.toLowerCase() || "pdf"

      const mimeTypes: Record<string, string> = {
        pdf: "application/pdf",
        txt: "text/plain; charset=utf-8",
        md: "text/markdown; charset=utf-8",
      }

      return new NextResponse(new Uint8Array(fileBuffer), {
        status: 200,
        headers: {
          "Content-Type": mimeTypes[ext] || "application/octet-stream",
          "Content-Disposition": `inline; filename="${resume.fileName}"`,
          "Cache-Control": "private, max-age=3600",
        },
      })
    }

    // Graceful fallback if file is not on disk: return stored text content
    if (resume.textContent) {
      return new NextResponse(resume.textContent, {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Disposition": `inline; filename="${resume.fileName}.txt"`,
          "Cache-Control": "private, max-age=3600",
        },
      })
    }

    return new NextResponse("File not found on disk", { status: 404 })
  } catch (err) {
    console.error("Resume preview error:", err)
    Sentry.captureException(err)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
