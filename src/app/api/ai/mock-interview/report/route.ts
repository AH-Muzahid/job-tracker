/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { getInternalUserId } from "@/lib/auth"
import { getProvider } from "@/lib/ai/client"
import { getUserAIConfig } from "@/lib/ai/config"
import { getSystemBase } from "@/lib/ai/prompts/system-base"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"

export async function POST(request: NextRequest) {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const rateCheck = checkRateLimit(`mock-report:${userId}`, 15, 60 * 1000)
  if (!rateCheck.success) {
    return rateLimitResponse(rateCheck)
  }

  const aiConfig = await getUserAIConfig(userId)
  if (!aiConfig) {
    return NextResponse.json({ error: "AI provider not configured" }, { status: 400 })
  }

  try {
    const body = await request.json()
    const { targetRole, targetCompany, interviewType, language = "en", history = [], applicationId } = body

    if (!Array.isArray(history) || history.length < 2) {
      return NextResponse.json({
        error: "At least one full interview question and answer is required to generate a report.",
      }, { status: 400 })
    }

    const resolvedProvider = getProvider({
      providerType: aiConfig.providerType as any,
      apiKey: aiConfig.apiKey,
      baseUrl: aiConfig.baseUrl,
      model: aiConfig.model,
    })

    const targetModel = resolvedProvider.model(aiConfig.model || resolvedProvider.defaultModel)

    const dialogueTranscript = history
      .map((h: any) => `${h.role === "interviewer" ? "INTERVIEWER" : "CANDIDATE"}: ${h.text}`)
      .join("\n\n")

    const systemPrompt = `${getSystemBase()}

You are the Principal Bar Raiser on a hiring committee evaluating a completed mock interview for ${targetRole} at ${targetCompany} (${interviewType} Round).

Analyze the entire interview transcript below and return an exhaustive debrief strictly formatted as JSON.

Schema requirements:
{
  "verdict": "Strong Hire" | "Hire" | "Lean Hire" | "No Hire",
  "overallScore": number (0-100),
  "technicalScore": number (0-100),
  "clarityScore": number (0-100),
  "starBreakdown": {
    "situation": string,
    "task": string,
    "action": string,
    "result": string
  },
  "strengths": string[],
  "improvementAreas": string[],
  "executiveSummary": string,
  "knowledgeGaps": [
    {
      "id": "gap-1",
      "topic": "Specific technical topic or behavioral situation (e.g. Distributed Caching or Conflict Resolution)",
      "type": "technical" | "behavioral",
      "severity": "high" | "medium" | "low",
      "questionAsked": "The question the interviewer asked",
      "candidateAnswerSummary": "Summary of what the candidate answered",
      "weaknessReason": "Why this answer was insufficient or lacked depth/STAR structure",
      "idealAnswer": "Exemplary 10/10 Staff-level answer demonstrating deep expertise and crisp clarity",
      "starBreakdown": {
        "situation": "Crisp 1-2 sentence context",
        "task": "Specific goal/ownership",
        "action": "Concrete actions taken ('I did X, Y, Z')",
        "result": "Measurable business/engineering impact"
      },
      "keyTakeaways": ["Key bullet 1", "Key bullet 2", "Key bullet 3"],
      "followUpPracticePrompt": "Follow-up question to re-test retention"
    }
  ]
}

Knowledge Gap Extraction Rules:
- Identify 2 to 4 concrete knowledge gaps or communication shortcomings from the transcript.
- For each gap, provide an exceptional, production-grade 10/10 ideal answer.
- For behavioral gaps, ALWAYS include the 4-part starBreakdown.
- Language note: If language is "bn" or "mixed", write the explanations, ideal answers, and takeaways in natural Bengali (বাংলা) keeping tech terms in English. Otherwise, write in English.
CRITICAL: Respond ONLY with the single valid JSON object without markdown fences.`

    const promptText = `
Role: ${targetRole}
Company: ${targetCompany}
Round: ${interviewType}
Language: ${language}

FULL INTERVIEW TRANSCRIPT:
${dialogueTranscript}
`

    const res = await generateText({
      model: targetModel,
      system: systemPrompt,
      prompt: promptText,
    })

    const cleaned = res.text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim()
    const jsonStart = cleaned.indexOf("{")
    const jsonEnd = cleaned.lastIndexOf("}")

    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error("Invalid JSON from AI report generation")
    }

    const report = JSON.parse(cleaned.substring(jsonStart, jsonEnd + 1))

    // Automatically persist the completed interview session to the database
    try {
      const { prisma } = await import("@/lib/prisma")
      const session = await (prisma as any).interviewSession.create({
        data: {
          userId,
          targetRole: targetRole || "Software Engineer",
          targetCompany: targetCompany || "Tech Company",
          interviewType: interviewType || "Technical",
          language: language || "mixed",
          score: typeof report.overallScore === "number" ? report.overallScore : null,
          verdict: report.verdict || "Hire",
          dialogue: history,
          report,
        },
      })
      return NextResponse.json({ ...report, sessionId: session.id })
    } catch (saveErr) {
      console.warn("[Session Save Error (non-fatal)]:", saveErr)
      return NextResponse.json(report)
    }
  } catch (error) {
    console.error("Mock interview report error:", error)
    return NextResponse.json({ error: "Failed to generate interview report" }, { status: 500 })
  }
}
