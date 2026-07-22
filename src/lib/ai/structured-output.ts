import { z } from "zod"

export const JDAnalysisSchema = z.object({
  roleSnapshot: z.object({
    company: z.string().optional(),
    role: z.string(),
    experienceAsked: z.string(),
    keyStack: z.array(z.string()),
    workSetup: z.string().optional(),
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
    contactTarget: z.string().optional(),
    timing: z.string().optional(),
    angle: z.string().optional(),
  }),
  redFlags: z.string().optional(),
  finalRecommendation: z.string(),
})

export const CoverLetterSchema = z.object({
  recommendation: z.string(),
  email: z.string(),
  coverLetter: z.string().optional(),
  alternateShort: z.string().optional(),
  subjectLines: z.array(z.string()),
  beforeSendChecklist: z.array(z.string()),
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
