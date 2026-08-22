import { NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { getInternalUserId } from "@/lib/auth"
import { getProvider } from "@/lib/ai/client"
import { getUserAIConfig } from "@/lib/ai/config"
import { getSystemBase } from "@/lib/ai/prompts/system-base"
import { MockInterviewEvaluationSchema } from "@/lib/ai/structured-output"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { z } from "zod"

export async function POST(request: NextRequest) {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const rateCheck = checkRateLimit(`mock-eval:${userId}`, 15, 60 * 1000)
  if (!rateCheck.success) {
    return rateLimitResponse(rateCheck)
  }

  const aiConfig = await getUserAIConfig(userId)
  if (!aiConfig) {
    return NextResponse.json({ error: "AI provider not configured" }, { status: 400 })
  }

  try {
    const body = await request.json()
    const { question, category, difficulty, userAnswer, targetRole } = body

    if (!question || !userAnswer || typeof userAnswer !== "string" || !userAnswer.trim()) {
      return NextResponse.json({ error: "question and userAnswer are required" }, { status: 400 })
    }

    const resolvedProvider = getProvider({
      providerType: aiConfig.providerType as "openai" | "anthropic" | "google" | "custom-openai",
      apiKey: aiConfig.apiKey,
      baseUrl: aiConfig.baseUrl,
      model: aiConfig.model,
    })

    const targetModel = resolvedProvider.model(aiConfig.model || resolvedProvider.defaultModel)

    const systemPrompt = `${getSystemBase()}

You are a Principal Engineering Director & Senior Hiring Bar Raiser evaluating a candidate's spoken mock interview response.

## Instructions:
1. Deconstruct the response using the **STAR Method** (Situation, Task, Action, Result).
2. Grade **Technical Accuracy** (0-100), **Communication Clarity** (0-100), and calculate an **Overall Score** (0-100).
3. Identify precise strengths and actionable improvement areas.
4. Craft an **Ideal Model Answer** that demonstrates senior-level communication, technical depth, and business impact.

CRITICAL OUTPUT RULE: Respond ONLY with a single valid JSON object strictly conforming to the requested schema. Do NOT wrap with markdown backticks or commentary outside JSON.`

    const promptText = `
Interview Context:
- Target Role: ${targetRole || "Software Engineer"}
- Category: ${category || "Technical / System Design"}
- Difficulty: ${difficulty || "Medium"}

Interview Question:
"${question}"

Candidate Spoken Answer:
"${userAnswer.trim()}"
`

    const textResult = await generateText({
      model: targetModel,
      system: systemPrompt,
      prompt: promptText,
    })

    const evaluation = parseAndNormalizeEvaluation(textResult.text)
    return NextResponse.json(evaluation)
  } catch (error) {
    console.error("Mock interview evaluation error:", error)
    return NextResponse.json({ error: "Failed to evaluate mock interview response" }, { status: 500 })
  }
}

function parseAndNormalizeEvaluation(rawText: string): z.infer<typeof MockInterviewEvaluationSchema> {
  const cleaned = rawText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim()
  const jsonStart = cleaned.indexOf("{")
  const jsonEnd = cleaned.lastIndexOf("}")

  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error("Could not find valid JSON object in evaluation response")
  }

  const jsonStr = cleaned.substring(jsonStart, jsonEnd + 1)
  const parsed = JSON.parse(jsonStr)

  return {
    overallScore: typeof parsed.overallScore === "number" ? Math.min(Math.max(parsed.overallScore, 0), 100) : 75,
    technicalScore: typeof parsed.technicalScore === "number" ? Math.min(Math.max(parsed.technicalScore, 0), 100) : 75,
    clarityScore: typeof parsed.clarityScore === "number" ? Math.min(Math.max(parsed.clarityScore, 0), 100) : 80,
    starBreakdown: {
      situation: parsed.starBreakdown?.situation || "Adequate context provided",
      task: parsed.starBreakdown?.task || "Goal stated clearly",
      action: parsed.starBreakdown?.action || "Key technical steps outlined",
      result: parsed.starBreakdown?.result || "Outcome mentioned with room for quantifiable metrics",
    },
    strengths: Array.isArray(parsed.strengths) && parsed.strengths.length > 0 ? parsed.strengths : ["Direct answer to the prompt", "Sound technical foundation"],
    improvementAreas: Array.isArray(parsed.improvementAreas) && parsed.improvementAreas.length > 0 ? parsed.improvementAreas : ["Include more quantifiable metrics in results", "Structure using STAR methodology explicitly"],
    idealModelAnswer: parsed.idealModelAnswer || "In my previous role, I tackled this by...",
  }
}
