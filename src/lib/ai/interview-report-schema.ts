import { z } from "zod"

const text = z.string().max(12000)
const star = z.object({ situation: text, task: text, action: text, result: text })
export const InterviewReportSchema = z.object({
  verdict: z.enum(["Strong Hire", "Hire", "Lean Hire", "No Hire"]),
  overallScore: z.number().min(0).max(100), technicalScore: z.number().min(0).max(100),
  clarityScore: z.number().min(0).max(100), starBreakdown: star,
  strengths: z.array(text).max(20), improvementAreas: z.array(text).max(20), executiveSummary: text,
  knowledgeGaps: z.array(z.object({
    id: z.string().max(200), topic: text, type: z.enum(["technical", "behavioral"]),
    severity: z.enum(["high", "medium", "low"]), questionAsked: text, candidateAnswerSummary: text,
    weaknessReason: text, idealAnswer: text, starBreakdown: star.optional(),
    keyTakeaways: z.array(text).max(20), followUpPracticePrompt: text,
  })).max(10),
})

export class EvaluationUnavailableError extends Error {
  constructor() { super("Evaluation unavailable. Your transcript is preserved; please retry."); this.name = "EvaluationUnavailableError" }
}
