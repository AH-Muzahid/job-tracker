import { NextResponse } from "next/server"
import { getInternalUserId } from "@/lib/auth"
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse")

export async function POST(req: Request) {
  try {
    const userId = await getInternalUserId()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    let text = ""
    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      const parsed = await pdfParse(buffer)
      text = parsed.text || ""
    } else {
      text = buffer.toString("utf-8")
    }

    if (!text.trim()) {
      return NextResponse.json({ error: "Could not extract text from file" }, { status: 400 })
    }

    return NextResponse.json({ text: text.trim(), fileName: file.name })
  } catch (error: unknown) {
    console.error("Parse JD file error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to parse file" },
      { status: 500 }
    )
  }
}
