import { NextResponse } from "next/server"
import { getInternalUserId } from "@/lib/auth"
import { checkDistributedRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { PDFParse } from "pdf-parse"
import * as Sentry from "@sentry/nextjs"

export async function POST(req: Request) {
  try {
    const userId = await getInternalUserId()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const rl = await checkDistributedRateLimit(`parse-jd:${userId}`, 10, 60)
    if (!rl.success) return rateLimitResponse(rl)

    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Limit file size to 5MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    let text = ""
    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      try {
        const parser = new PDFParse({ data: buffer })
        const parsed = await parser.getText()
        text = parsed.text || ""
        await parser.destroy()
      } catch (pdfErr) {
        console.error("PDF parse JD error:", pdfErr)
        text = buffer.toString("utf-8")
      }
    } else {
      text = buffer.toString("utf-8")
    }

    if (!text.trim()) {
      return NextResponse.json({ error: "Could not extract text from file" }, { status: 400 })
    }

    return NextResponse.json({ text: text.trim(), fileName: file.name })
  } catch (error: unknown) {
    console.error("parse-jd-file error:", error)
    Sentry.captureException(error)
    const message = error instanceof Error ? error.message : "Failed to parse file"
    return NextResponse.json(
      { error: message, message },
      { status: 500 }
    )
  }
}
