import { NextRequest, NextResponse } from "next/server"
import { generateObject } from "ai"
import { cookies } from "next/headers"
import { getInternalUserId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getProvider } from "@/lib/ai/client"
import { getSystemBase } from "@/lib/ai/prompts/system-base"
import { getApplicationPrompt } from "@/lib/ai/prompts/application"
import { CoverLetterSchema } from "@/lib/ai/structured-output"
import { decrypt } from "@/lib/encryption"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const cookieStore = await cookies()
  const encrypted = cookieStore.get("ai_config")?.value
  if (!encrypted) {
    return NextResponse.json({ error: "AI provider not configured" }, { status: 400 })
  }

  let aiConfig: { providerType: string; apiKey: string; baseUrl?: string; model?: string }
  try {
    const decrypted = decrypt(encrypted)
    aiConfig = JSON.parse(decrypted)
  } catch {
    return NextResponse.json({ error: "Invalid AI configuration" }, { status: 400 })
  }

  const applicationId = id
  const app = await prisma.application.findUnique({
    where: { id: applicationId, userId },
    include: { analysis: true },
  })

  if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 })

  const defaultResume = await prisma.resume.findFirst({
    where: { userId, isDefault: true },
    select: { textContent: true },
  })

  const jdText = app.analysis?.rawJd || app.notes || ""
  const resumeText = defaultResume?.textContent || ""

  const systemPrompt = `${getSystemBase()}\n\n${getApplicationPrompt()}\n\n## Job Details\n- Company: ${app.companyName}\n- Title: ${app.jobTitle}\n\n## Resume Context\n${resumeText || "No resume text content available."}`

  const resolvedProvider = getProvider({
    providerType: aiConfig.providerType as "openai" | "anthropic" | "google" | "custom-openai",
    apiKey: aiConfig.apiKey,
    baseUrl: aiConfig.baseUrl,
    model: aiConfig.model,
  })

  try {
    const result = await generateObject({
      model: resolvedProvider.model(aiConfig.model || resolvedProvider.defaultModel),
      mode: "json",
      system: systemPrompt + "\n\nCRITICAL: Respond ONLY with a valid JSON object matching the requested schema. Do not write markdown blocks or commentary outside the JSON structure. Your output must be a single, valid JSON object.",
      prompt: `Generate outreach drafts for the application. JD:\n\n${jdText}`,
      schema: CoverLetterSchema,
    })

    return NextResponse.json(result.object)
  } catch (error: unknown) {
    console.error(error)
    const errMsg = error instanceof Error ? error.message : "Failed to generate outreach materials"
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}
