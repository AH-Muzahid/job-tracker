import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getInternalUserId } from "@/lib/auth"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { PDFParse } from "pdf-parse"
import { invalidateCache } from "@/lib/redis"
import { buildCareerGraphFromText, saveKnowledgeGraph } from "@/lib/ai/knowledge-graph"

export async function GET() {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const resumes = await prisma.resume.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  })

  return NextResponse.json(resumes)
}

export async function POST(req: Request) {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
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
      fileName = fileObj.name
      fileSize = fileObj.size
      isDefault = isDefaultVal === "true"

      // Read file buffer
      const buffer = Buffer.from(await fileObj.arrayBuffer())

      // Create uploads directory
      const uploadDir = path.join(process.cwd(), "public", "uploads", "resumes")
      await mkdir(uploadDir, { recursive: true })

      // Generate unique name
      const fileExt = fileName.split(".").pop() || "pdf"
      const finalFileName = `${crypto.randomUUID()}.${fileExt}`
      const filePath = path.join(uploadDir, finalFileName)

      // Write to disk
      await writeFile(filePath, new Uint8Array(buffer))
      fileUrl = `/uploads/resumes/${finalFileName}`

      // Extract text content
      if (fileObj.type === "application/pdf" || fileExt.toLowerCase() === "pdf") {
        try {
          const parser = new PDFParse({ data: buffer })
          const result = await parser.getText()
          textContent = result.text || ""
          await parser.destroy()
        } catch (err) {
          console.error("PDF parsing error:", err)
        }
      } else if (fileObj.type.startsWith("text/") || ["txt", "md"].includes(fileExt.toLowerCase())) {
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
      await prisma.resume.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      })
    }

    const resume = await prisma.resume.create({
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

    // Auto-generate & persist Career Knowledge Graph for Vector-less RAG
    if (textContent) {
      try {
        const profile = await prisma.userProfile.findUnique({ where: { userId } })
        const graph = buildCareerGraphFromText(textContent, profile)
        await saveKnowledgeGraph(userId, graph)
      } catch (graphErr) {
        console.warn("Failed to generate career knowledge graph:", graphErr)
      }
    }

    // Invalidate cached default resume and knowledge graph
    void invalidateCache(`user:resume:${userId}`, `user:knowledge-graph:${userId}`)

    return NextResponse.json(resume, { status: 201 })
  } catch (error) {
    console.error("Resume upload error:", error)
    return NextResponse.json({ error: "Failed to create resume" }, { status: 500 })
  }
}
