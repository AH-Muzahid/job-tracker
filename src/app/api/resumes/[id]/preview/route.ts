import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getInternalUserId } from "@/lib/auth"
import { readFile } from "fs/promises"
import path from "path"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getInternalUserId()
  if (!userId) return new NextResponse("Unauthorized", { status: 401 })

  const { id } = await params

  const resume = await prisma.resume.findFirst({
    where: { id, userId },
  })

  if (!resume) return new NextResponse("Not found", { status: 404 })

  // fileUrl is like /uploads/resumes/uuid.pdf
  const filePath = path.join(process.cwd(), "public", resume.fileUrl)

  try {
    const fileBuffer = await readFile(filePath)
    const ext = resume.fileName.split(".").pop()?.toLowerCase() || "pdf"

    const mimeTypes: Record<string, string> = {
      pdf: "application/pdf",
      txt: "text/plain; charset=utf-8",
      md: "text/markdown; charset=utf-8",
    }

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": mimeTypes[ext] || "application/octet-stream",
        "Content-Disposition": `inline; filename="${resume.fileName}"`,
        "Cache-Control": "private, max-age=3600",
      },
    })
  } catch {
    return new NextResponse("File not found on disk", { status: 404 })
  }
}
