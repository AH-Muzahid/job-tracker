import { NextRequest, NextResponse } from "next/server"
import { getInternalUserId } from "@/lib/auth"
import { prisma, withDbRetry } from "@/lib/prisma"
import { resilientGenerateText } from "@/lib/ai/resilience"
import { PDFParse } from "pdf-parse"
import { storeResumeFile } from "@/lib/storage"
import * as Sentry from "@sentry/nextjs"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const userId = await getInternalUserId()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

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
        const fileName = fileObj.name || "resume.pdf"
        const fileExt = fileName.split(".").pop()?.toLowerCase() || "pdf"

        // Resiliently store file across persistent disk, tmpdir, or virtual fallback
        const fileUrl = await storeResumeFile(buffer, fileName)

        if (fileObj.type === "application/pdf" || fileExt === "pdf") {
          try {
            const parser = new PDFParse({ data: buffer })
            const result = await parser.getText()
            rawResumeText = result.text || ""
            await parser.destroy()
          } catch (pdfErr) {
            console.error("PDF parsing error during extract:", pdfErr)
            rawResumeText = buffer.toString("utf-8")
          }
        } else {
          rawResumeText = buffer.toString("utf-8")
        }

        // Save as resume record (gracefully caught so DB hitch never blocks profile extraction)
        try {
          await withDbRetry(() =>
            prisma.resume.create({
              data: {
                userId,
                title: (fileName || "Resume").replace(/\.[^/.]+$/, ""),
                fileName,
                fileUrl,
                fileSize: fileObj.size || buffer.length || 0,
                isDefault: true,
                textContent: rawResumeText,
              },
            })
          )
        } catch (dbErr) {
          console.warn("Failed to auto-save resume record during extraction:", dbErr)
          Sentry.captureException(dbErr)
        }
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

    let parsedData: Record<string, unknown> = {}

    try {
      const aiResponse = await resilientGenerateText({
        userId,
        systemPrompt: "You are a precise JSON extractor. Output only strict JSON.",
        messages: [{ role: "user", content: extractionPrompt }],
        temperature: 0.1,
      })

      const cleaned = aiResponse.text
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim()
      parsedData = JSON.parse(cleaned)
    } catch (aiErr) {
      console.warn("AI resume extraction failed, attempting regex heuristic fallback:", aiErr)
      const phoneMatch = rawResumeText.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\b01\d{9}\b/)
      const linkedinMatch = rawResumeText.match(/https?:\/\/(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+/i)
      const githubMatch = rawResumeText.match(/https?:\/\/(?:www\.)?github\.com\/[a-zA-Z0-9_-]+/i)
      const portfolioMatch = rawResumeText.match(/https?:\/\/(?:www\.)?(?!linkedin|github)[a-zA-Z0-9_-]+\.[a-z]{2,}(?:\/[^\s]*)?/i)

      parsedData = {
        phone: phoneMatch ? phoneMatch[0] : "",
        location: "",
        linkedInUrl: linkedinMatch ? linkedinMatch[0] : "",
        githubUrl: githubMatch ? githubMatch[0] : "",
        portfolioUrl: portfolioMatch ? portfolioMatch[0] : "",
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
  } catch (error: unknown) {
    console.error("Resume profile extraction error:", error)
    Sentry.captureException(error)
    const message = error instanceof Error ? error.message : "Failed to extract profile from resume"
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
