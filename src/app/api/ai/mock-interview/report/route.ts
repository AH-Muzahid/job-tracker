import { AIAccessError, requireOwnedApplication } from "@/lib/ai/ownership"
import { InterviewReportSchema, EvaluationUnavailableError } from "@/lib/ai/interview-report-schema"
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getInternalUserId } from "@/lib/auth"
import { resilientGenerateText } from "@/lib/ai/resilience"
import { getSystemBase } from "@/lib/ai/prompts/system-base"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { sanitizeUntrustedContext } from "@/lib/ai/context-builder"

const ReportRequestSchema = z.object({
  targetRole: z.string().min(1).max(200),
  targetCompany: z.string().min(1).max(200),
  interviewType: z.string().min(1).max(100).default("Technical"),
  language: z.enum(["en", "bn", "mixed"]).default("en"),
  history: z.array(z.object({
    role: z.enum(["candidate", "interviewer", "user", "assistant"]),
    text: z.string().min(1).max(12000),
  })).max(100).min(2, "At least one full interview question and answer is required"),
  applicationId: z.string().min(1).max(100).nullable().optional(),
})

export async function POST(request: NextRequest) {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const rateCheck = checkRateLimit(`mock-report:${userId}`, 15, 60 * 1000)
  if (!rateCheck.success) {
    return rateLimitResponse(rateCheck)
  }

  try {
    const raw = await request.json()
    const parsed = ReportRequestSchema.safeParse(raw)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { interviewType, language, history, applicationId } = parsed.data
    if (applicationId) await requireOwnedApplication(userId, applicationId)
    const targetRole = sanitizeUntrustedContext(parsed.data.targetRole)
    const targetCompany = sanitizeUntrustedContext(parsed.data.targetCompany)

    const dialogueTranscript = history
      .map((h) => `${h.role === "interviewer" || h.role === "assistant" ? "INTERVIEWER" : "CANDIDATE"}: ${sanitizeUntrustedContext(h.text)}`)
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

    let report: any = null
    let graphProducedReport = false

    try {
      const { runInterviewCoachPipeline } = await import("@/lib/ai/graph/workflows/interview-coach")
      const agentResult = await runInterviewCoachPipeline({
        userId,
        applicationId: applicationId || undefined,
        targetCompany,
        targetRole,
        roundType: interviewType,
        dialogue: history,
      })
      if (agentResult?.evaluationReport && typeof agentResult.evaluationReport === "object") {
        report = InterviewReportSchema.parse(agentResult.evaluationReport)
        graphProducedReport = true
      }
    } catch (graphErr) {
      console.warn("[Interview Coach Graph fallback to direct resilient generator]:", graphErr)
    }

    if (!report || typeof report !== "object") {
      try {
        const res = await resilientGenerateText({
          userId,
          systemPrompt,
          messages: [{ role: "user", content: promptText }],
          temperature: 0.2,
          timeoutMs: 35000,
        })

        const cleaned = res.text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim()
        const jsonStart = cleaned.indexOf("{")
        const jsonEnd = cleaned.lastIndexOf("}")

        if (jsonStart !== -1 && jsonEnd !== -1) {
          report = InterviewReportSchema.parse(JSON.parse(cleaned.substring(jsonStart, jsonEnd + 1)))
        }
      } catch (llmErr) {
        console.warn(
          "[Report LLM Fallback]: Resilient text generation failed or returned invalid JSON, using emergency STAR report:",
          llmErr
        )
      }
    }

    // If upstream LLM failed across all providers, use deterministic emergency report
    if (!report || typeof report !== "object") {
      const { prisma } = await import("@/lib/prisma")
      const session = await prisma.interviewSession.create({ data: {
        userId, applicationId: applicationId || null, targetRole, targetCompany, interviewType, language,
        score: null, verdict: "Evaluation unavailable", dialogue: history,
        report: { status: "unavailable", retryable: true },
      } })
      return NextResponse.json({ error: new EvaluationUnavailableError().message, code: "EVALUATION_UNAVAILABLE", sessionId: session.id }, { status: 503 })
    }

    // Automatically persist the completed interview session to the database
    try {
      const { prisma } = await import("@/lib/prisma")
      let verifiedAppId: string | null = null
      if (applicationId) {
        const ownedApp = await prisma.application.findFirst({
          where: { id: applicationId, userId },
          select: { id: true },
        })
        if (ownedApp) verifiedAppId = ownedApp.id
      }

      const executeTransaction = typeof prisma.$transaction === "function"
        ? (fn: (tx: any) => Promise<any>) => prisma.$transaction(fn)
        : (fn: (tx: any) => Promise<any>) => fn(prisma)

      const session = await executeTransaction(async (tx) => {
        const newSession = await tx.interviewSession.create({
          data: {
            userId,
            applicationId: verifiedAppId,
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

        // Synchronize interview evaluation findings into ApplicationAnalysis & Application
        if (verifiedAppId && tx.applicationAnalysis?.findUnique) {
          try {
            const gapRecord = {
              interviewScore: report.overallScore,
              verdict: report.verdict,
              interviewType: interviewType || "Technical",
              knowledgeGaps: report.knowledgeGaps || [],
              evaluatedAt: new Date().toISOString(),
            }

            const existingAnalysis = await tx.applicationAnalysis.findUnique({
              where: { applicationId: verifiedAppId },
            })

            if (existingAnalysis) {
              await tx.applicationAnalysis.update({
                where: { applicationId: verifiedAppId },
                data: {
                  gapAnalysis: gapRecord,
                },
              })
            } else {
              await tx.applicationAnalysis.create({
                data: {
                  applicationId: verifiedAppId,
                  matchScore: null,
                  confidence: "medium",
                  verdict: report.verdict || "Interview Evaluated",
                  gapAnalysis: gapRecord,
                },
              })
            }

            const summaryNote = `[Interview ${interviewType || "Technical"} - Score: ${
              report.overallScore ?? "N/A"
            }/100, Verdict: ${report.verdict || "Evaluated"}]: ${report.executiveSummary || ""}`
            if (tx.application?.update) {
              await tx.application.update({
                where: { id: verifiedAppId },
                data: {
                  interviewNotes: summaryNote,
                  updatedAt: new Date(),
                },
              })
            }
          } catch (analysisErr) {
            console.warn("[ApplicationAnalysis Sync Error (non-fatal)]:", analysisErr)
          }
        }

        return newSession
      })

      if (!graphProducedReport) {
        // Automatically resolve previous weaknesses if candidate demonstrated strong STAR performance (>= 80%)
        if (typeof report.overallScore === "number" && report.overallScore >= 80) {
          try {
            const { resolveInterviewWeaknesses } = await import("@/lib/ai/memory")
            await resolveInterviewWeaknesses(userId, {
              targetRole,
              topics: Array.isArray(report.strengths) ? report.strengths : [],
              overallScore: report.overallScore,
            })
          } catch (resolveErr) {
            console.warn("[Memory Weakness Resolution Error (non-fatal)]:", resolveErr)
          }
        }

        // Persist identified knowledge gaps to long-term UserMemory
        if (Array.isArray(report.knowledgeGaps) && report.knowledgeGaps.length > 0) {
          try {
            const { persistInterviewWeaknesses } = await import("@/lib/ai/memory")
            await persistInterviewWeaknesses(userId, report.knowledgeGaps, {
              targetRole,
              targetCompany,
              roundType: interviewType,
            })
          } catch (memErr) {
            console.warn("[Memory Persistence Error (non-fatal)]:", memErr)
          }
        }
      }

      return NextResponse.json({ ...report, sessionId: session.id })
    } catch (saveErr) {
      console.warn("[Session Save Error (non-fatal)]:", saveErr)
      return NextResponse.json(report)
    }
  } catch (error) {
    if (error instanceof AIAccessError) return NextResponse.json({ error: "Application not found" }, { status: 404 })
    console.error("Mock interview report error:", error)
    return NextResponse.json({ error: "Failed to generate interview report" }, { status: 500 })
  }
}
