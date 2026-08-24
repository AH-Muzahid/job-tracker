import { NextRequest, NextResponse } from "next/server"
import { getInternalUserId } from "@/lib/auth"
import { prisma, withDbRetry } from "@/lib/prisma"
import { resilientGenerateText } from "@/lib/ai/resilience"
import { PDFParse } from "pdf-parse"
import path from "path"
import { writeFile, mkdir } from "fs/promises"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const contentType = req.headers.get("content-type") || ""
    let rawResumeText = ""

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData()
      const fileObj = formData.get("file") as File | null
      const resumeId = formData.get("resumeId") as string | null

      if (resumeId) {
        const existingResume = await withDbRetry(() =>
          prisma.resume.findFirst({
            where: { id: resumeId, userId },
          })
        )
        if (existingResume?.textContent) {
          rawResumeText = existingResume.textContent
        }
      }

      if (!rawResumeText && fileObj) {
        const buffer = Buffer.from(await fileObj.arrayBuffer())
        const fileName = fileObj.name
        const fileExt = fileName.split(".").pop() || "pdf"

        // Save resume for user
        const uploadDir = path.join(process.cwd(), "public", "uploads", "resumes")
        await mkdir(uploadDir, { recursive: true })
        const finalFileName = `${crypto.randomUUID()}.${fileExt}`
        const filePath = path.join(uploadDir, finalFileName)
        await writeFile(filePath, new Uint8Array(buffer))
        const fileUrl = `/uploads/resumes/${finalFileName}`

        if (fileObj.type === "application/pdf" || fileExt.toLowerCase() === "pdf") {
          const parser = new PDFParse({ data: buffer })
          const result = await parser.getText()
          rawResumeText = result.text || ""
          await parser.destroy()
        } else {
          rawResumeText = buffer.toString("utf-8")
        }

        // Save as resume record
        await withDbRetry(() =>
          prisma.resume.create({
            data: {
              userId,
              title: fileName.replace(/\.[^/.]+$/, ""),
              fileName,
              fileUrl,
              fileSize: fileObj.size,
              isDefault: true,
              textContent: rawResumeText,
            },
          })
        )
      }
    } else {
      const body = await req.json()
      if (body.resumeId) {
        const resume = await withDbRetry(() =>
          prisma.resume.findFirst({
            where: { id: body.resumeId, userId },
          })
        )
        if (resume?.textContent) {
          rawResumeText = resume.textContent
        }
      } else if (body.text) {
        rawResumeText = body.text
      }
    }

    // Fallback: If no resume was provided, check user's default resume
    if (!rawResumeText) {
      const defaultResume = await withDbRetry(() =>
        prisma.resume.findFirst({
          where: { userId },
          orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
        })
      )
      if (defaultResume?.textContent) {
        rawResumeText = defaultResume.textContent
      }
    }

    if (!rawResumeText || rawResumeText.trim().length < 20) {
      return NextResponse.json(
        { error: "No readable resume content found. Please upload a PDF or text resume." },
        { status: 400 }
      )
    }

    // Truncate to reasonable token limit
    const truncatedText = rawResumeText.slice(0, 15000)

    const extractionPrompt = `You are an expert career intelligence data extractor.
Analyze this resume text and extract candidate profile fields for their job search tracker.

Return ONLY a valid JSON object with EXACTLY this structure (no markdown fences, no explanatory text):
{
  "phone": "Extracted phone number or empty string",
  "location": "City, Country or Region",
  "linkedInUrl": "Full LinkedIn URL if mentioned, else empty string",
  "githubUrl": "Full GitHub URL if mentioned, else empty string",
  "portfolioUrl": "Portfolio/Website URL if mentioned, else empty string",
  "targetRoles": ["Primary Title/Role", "Secondary Target Role"],
  "experienceLevel": "Senior" | "Mid" | "Junior" | "Entry" | "Lead",
  "strengths": "Comma-separated top 8-12 technical skills, languages, and frameworks",
  "preferredIndustries": "Comma-separated inferred industries (e.g. Fintech, SaaS, AI/ML)",
  "bestProjects": [
    {
      "name": "Project Name",
      "stack": "Tech stack used",
      "description": "Short 1-sentence impact description"
    }
  ]
}

Resume Content:
${truncatedText}`

    const aiResponse = await resilientGenerateText({
      userId,
      systemPrompt: "You are a precise JSON extractor. Output only strict JSON.",
      messages: [{ role: "user", content: extractionPrompt }],
      temperature: 0.1,
    })

    let parsedData: Record<string, unknown> = {}
    try {
      const cleaned = aiResponse.text
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim()
      parsedData = JSON.parse(cleaned)
    } catch {
      console.warn("Could not parse AI JSON output directly:", aiResponse.text)
      parsedData = {
        phone: "",
        location: "",
        targetRoles: [],
        strengths: "",
        bestProjects: [],
      }
    }

    return NextResponse.json({
      success: true,
      extracted: parsedData,
      rawLength: rawResumeText.length,
    })
  } catch (error) {
    console.error("Resume profile extraction error:", error)
    return NextResponse.json(
      { error: "Failed to extract profile from resume" },
      { status: 500 }
    )
  }
}
