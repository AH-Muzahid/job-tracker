import { z } from "zod"

export const JDAnalysisSchema = z.object({
  roleSnapshot: z.object({
    company: z.string().nullable().optional(),
    role: z.string().nullable().optional(),
    experienceAsked: z.string().nullable().optional(),
    keyStack: z.array(z.string()).optional(),
    workSetup: z.string().nullable().optional(),
  }),
  matchScore: z.number().min(0).max(100),
  confidence: z.string().optional(),
  verdict: z.string(),
  scoreBreakdown: z.array(z.object({
    dimension: z.string(),
    score: z.number(),
    max: z.number(),
    notes: z.string().optional(),
  })).optional(),
  whyThisScore: z.array(z.string()).optional(),
  missingGaps: z.object({
    missingKeywords: z.array(z.string()),
    missingProof: z.array(z.string()).optional(),
    missingTools: z.array(z.string()).optional(),
    stretchAreas: z.array(z.string()).optional(),
    fixableGaps: z.array(z.string()).optional(),
  }),
  resumeAdvice: z.object({
    emphasize: z.array(z.string()).optional(),
    addIfTruthful: z.array(z.string()).optional(),
    foregroundProjects: z.array(z.string()).optional(),
    needsCustomVersion: z.boolean().optional(),
    linkedInTweak: z.boolean().optional(),
  }).optional(),
  applyStrategy: z.object({
    bestPath: z.string().optional(),
    outreachNeeded: z.boolean().optional(),
    contactTarget: z.string().nullable().optional(),
    timing: z.string().nullable().optional(),
    angle: z.string().nullable().optional(),
  }).optional(),
  redFlags: z.string().nullable().optional(),
  finalRecommendation: z.string().nullable().optional(),
})

export const CoverLetterSchema = z.object({
  format: z.string().optional(),
  subject: z.string().optional(),
  body: z.string().optional(),
  checklist: z.array(z.string()).optional(),
  recipientEmail: z.string().optional(),
  companyName: z.string().optional(),
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
