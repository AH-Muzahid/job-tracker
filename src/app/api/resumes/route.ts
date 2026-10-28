import { NextResponse } from "next/server"
import { prisma, withDbRetry } from "@/lib/prisma"
import { getInternalUserId } from "@/lib/auth"
import { extractTextFromPdf } from "@/lib/pdf/pdf-parser"
import { invalidateCache } from "@/lib/redis"
import { buildCareerGraphFromText, saveKnowledgeGraph } from "@/lib/ai/knowledge-graph"
import { storeResumeFile } from "@/lib/storage"
import * as Sentry from "@sentry/nextjs"

export async function GET() {
  try {
    const userId = await getInternalUserId()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const resumes = await withDbRetry(() =>
      prisma.resume.findMany({
        where: { userId },
        orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
      })
    )

    return NextResponse.json(resumes)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("GET /api/resumes error:", message)
    Sentry.captureException(err)
    return NextResponse.json({ error: message, message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getInternalUserId()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const contentType = req.headers.get("content-type") || ""
    
    let title = ""
    let fileName = ""
    let fileUrl = ""
    let fileSize = 0
    let isDefault = false
    let textContent: string | null = null

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData()
      const fileObj = formData.get("file") as File | null
      const titleVal = formData.get("title") as string | null
      const isDefaultVal = formData.get("isDefault") as string | null

      if (!fileObj || !titleVal?.trim()) {
        return NextResponse.json({ error: "Title and file are required" }, { status: 400 })
      }

      title = titleVal.trim()
      fileName = fileObj.name || "resume.pdf"
      fileSize = fileObj.size || 0
      isDefault = isDefaultVal === "true"

      // Enforce 5MB payload limit to prevent memory exhaustion DoS
      const MAX_FILE_SIZE = 5 * 1024 * 1024
      if (fileSize > MAX_FILE_SIZE) {
        return NextResponse.json({ error: "File size exceeds 5MB limit" }, { status: 400 })
      }

      // Read file buffer
      const buffer = Buffer.from(await fileObj.arrayBuffer())

      // Resiliently store file across persistent disk, tmpdir, or virtual fallback
      fileUrl = await storeResumeFile(buffer, fileName)

      // Extract text content
      const fileExt = fileName.split(".").pop()?.toLowerCase() || "pdf"
      if (fileObj.type === "application/pdf" || fileExt === "pdf") {
        textContent = await extractTextFromPdf(buffer)
      } else if (fileObj.type.startsWith("text/") || ["txt", "md"].includes(fileExt)) {
        textContent = buffer.toString("utf-8")
      }
    } else {
      // Backwards compatibility for URL-based POST
      const body = await req.json()
      if (!body.title?.trim() || !body.fileName || !body.fileUrl) {
        return NextResponse.json({ error: "Title, fileName, and fileUrl are required" }, { status: 400 })
      }
      title = body.title.trim()
      fileName = body.fileName
      fileUrl = body.fileUrl
      fileSize = body.fileSize || 0
      isDefault = body.isDefault || false
      textContent = body.textContent || null
    }

    if (isDefault) {
      await withDbRetry(() =>
        prisma.resume.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        })
      )
    }

    const resume = await withDbRetry(() =>
      prisma.resume.create({
        data: {
          userId,
          title,
          fileName,
          fileUrl,
          fileSize,
          isDefault,
          textContent,
        },
      })
    )

    // Auto-generate & persist Career Knowledge Graph for Vector-less RAG
    if (textContent) {
      try {
        const profile = await withDbRetry(() =>
          prisma.userProfile.findUnique({ where: { userId } })
        )
        const graph = buildCareerGraphFromText(textContent, profile)
        await saveKnowledgeGraph(userId, graph)
      } catch (graphErr) {
        console.warn("Failed to generate career knowledge graph:", graphErr)
      }
    }

    // Invalidate cached default resume and knowledge graph
    void invalidateCache(`user:resume:${userId}`, `user:knowledge-graph:${userId}`)

    return NextResponse.json(resume, { status: 201 })
  } catch (error: unknown) {
    console.error("Resume upload error:", error)
    Sentry.captureException(error)
    const message = error instanceof Error ? error.message : "Failed to create resume"
    return NextResponse.json(
      {
        error: message,
        message,
        code: typeof error === "object" && error !== null && "code" in error ? String(error.code) : "SERVER_ERROR",
      },
      { status: 500 }
    )
  }
}
