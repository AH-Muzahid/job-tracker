import { z } from "zod"

export const JDAnalysisSchema = z.object({
  roleSnapshot: z.object({
    company: z.string().nullable().optional(),
    role: z.string(),
    experienceAsked: z.string(),
    keyStack: z.array(z.string()),
    workSetup: z.string().nullable().optional(),
  }),
  matchScore: z.number().min(0).max(100),
  confidence: z.enum(["High", "Medium", "Low"]),
  verdict: z.enum([
    "Strong Apply",
    "Apply After Minor Tweaks",
    "Stretch Apply",
    "Low ROI / Skip",
    "Likely Scam / Avoid",
  ]),
  whyThisScore: z.array(z.string()).min(3).max(6),
  missingGaps: z.object({
    missingKeywords: z.array(z.string()),
    missingProof: z.array(z.string()),
    missingTools: z.array(z.string()),
    stretchAreas: z.array(z.string()),
    fixableGaps: z.array(z.string()),
  }),
  resumeAdvice: z.object({
    emphasize: z.array(z.string()),
    addIfTruthful: z.array(z.string()),
    foregroundProjects: z.array(z.string()),
    needsCustomVersion: z.boolean(),
    linkedInTweak: z.boolean(),
  }),
  applyStrategy: z.object({
    bestPath: z.string(),
    outreachNeeded: z.boolean(),
    contactTarget: z.string().nullable().optional(),
    timing: z.string().nullable().optional(),
    angle: z.string().nullable().optional(),
  }),
  redFlags: z.string().nullable().optional(),
  finalRecommendation: z.string(),
})

export const CoverLetterSchema = z.object({
  recommendation: z.string().default("Recommended direct email application").describe("Recommendation and rationale"),
  email: z.string().default("").describe("The body text of the application email ONLY. Do NOT include subject lines, 'Subject:', 'Body:', or 'Cover Letter:' labels in this field."),
  coverLetter: z.string().nullable().optional().describe("Clean standalone cover letter text ONLY"),
  alternateShort: z.string().nullable().optional().describe("Alternative short DM version"),
  subjectLines: z.array(z.string()).default([]).describe("Array of plain subject line strings without 'Subject Line 1:' prefixes"),
  beforeSendChecklist: z.array(z.string()).default([]).describe("Checklist items before sending"),
})

export const TrackerUpdateSchema = z.object({
  action: z.enum(["create", "update", "none"]),
  entity: z.string(),
  filter: z.record(z.string(), z.unknown()).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  summary: z.string(),
  nextStep: z.string().optional(),
})

export const MessageClassificationSchema = z.object({
  type: z.enum([
    "generic-rejection",
    "soft-rejection",
    "request-for-info",
    "screening-request",
    "task-invitation",
    "interview-invitation",
    "scheduling-mail",
    "ambiguous",
  ]),
  tone: z.string(),
  intent: z.string(),
  draftResponse: z.string(),
  nextStep: z.string(),
})

export const MockInterviewEvaluationSchema = z.object({
  overallScore: z.number().min(0).max(100),
  technicalScore: z.number().min(0).max(100),
  clarityScore: z.number().min(0).max(100),
  starBreakdown: z.object({
    situation: z.string().describe("Evaluation of context and setup"),
    task: z.string().describe("Evaluation of candidate's stated objective"),
    action: z.string().describe("Evaluation of specific technical actions and tools used"),
    result: z.string().describe("Evaluation of quantifiable outcome and business impact"),
  }),
  strengths: z.array(z.string()).min(1),
  improvementAreas: z.array(z.string()).min(1),
  idealModelAnswer: z.string().describe("A high-impact STAR model response tailored for this question"),
})
