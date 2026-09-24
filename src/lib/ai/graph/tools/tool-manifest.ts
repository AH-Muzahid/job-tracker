/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from "zod"
import {
  executeCreateApplication,
  executeUpdateApplicationStatus,
  executeSearchApplications,
  executeDeleteApplication,
  executeGetPrepNotes,
  executeSavePrepNote,
  executeResearchCompanyIntel,
  executeGetPipelineStats,
  executeListUserApplications,
} from "./job-tools"
import {
  executeGetResumeDetails,
  executeGetResumeSummary,
  executeSyncCareerKnowledgeGraph,
  executeQueryCareerKnowledgeGraph,
  executeTailorResumeForJob,
} from "./resume-tools"
import {
  executeGetUserProfile,
  executeUpdateUserProfile,
  executeSaveUserMemory,
  executeForgetUserMemory,
  executeGetUserMemories,
} from "./profile-tools"
import { executeCreateWeeklyGoal } from "./goal-tools"
import { executeSendOutreachEmail } from "./email-tools"
import {
  executeSearchExternalJobs,
  executeSaveJobOpportunityToTracker,
} from "./discovery-tools"

import { ToolRisk } from "@/lib/ai/tool-registry"
export { ToolRisk }

export interface ToolDefinition<TSchema extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string
  description: string
  schema: TSchema
  risk: ToolRisk
  requiresConfirmation: boolean
  allowedInHeadless: boolean
  category: "job" | "profile" | "resume" | "discovery" | "email" | "goal" | "memory" | "intel"
  execute: (userId: string, input: z.infer<TSchema>) => Promise<{
    success: boolean
    result?: any
    error?: string
    message?: string
    [key: string]: any
  }>
}

// -------------------------------------------------------------
// Zod Input Schemas with Permissive Coercion
// -------------------------------------------------------------

export const SearchExternalJobsSchema = z.object({
  query: z.string().optional(),
  tags: z.array(z.string()).optional(),
  location: z.string().optional(),
  limit: z.number().int().min(1).max(50).optional().default(10),
}).passthrough()

export const SaveJobOpportunitySchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  jobTitle: z.string().min(1, "Job title is required"),
  jobUrl: z.string().optional(),
  location: z.string().optional(),
  salary: z.string().optional(),
  notes: z.string().optional(),
  status: z.string().optional().default("Saved"),
}).passthrough()

export const CreateApplicationSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  jobTitle: z.string().min(1, "Job title is required"),
  jobUrl: z.string().optional(),
  source: z.string().optional().default("Manual"),
  status: z.string().optional().default("Applied"),
  notes: z.string().optional(),
}).passthrough()

export const UpdateApplicationStatusSchema = z.object({
  companyOrTitle: z.string().min(1, "Target company or job title is required"),
  newStatus: z.string().min(1, "New application status is required"),
  notes: z.string().optional(),
}).passthrough()

export const SearchApplicationsSchema = z.object({
  query: z.string().optional(),
  status: z.string().optional(),
  limit: z.number().int().min(1).max(50).optional().default(10),
}).passthrough()

export const DeleteApplicationSchema = z.object({
  applicationId: z.string().optional(),
  companyOrTitle: z.string().optional(),
}).passthrough().refine(
  (data) => Boolean(data.applicationId || data.companyOrTitle),
  { message: "Either applicationId or companyOrTitle is required to delete an application" }
)

export const GetResumeDetailsSchema = z.object({
  resumeId: z.string().optional(),
}).passthrough()

export const TailorResumeForJobSchema = z.object({
  jobDescription: z.string().min(15, "A descriptive job description (at least 15 chars) is required"),
  companyName: z.string().optional(),
  jobTitle: z.string().optional(),
  resumeId: z.string().optional(),
}).passthrough()

export const SyncCareerKnowledgeGraphSchema = z.object({}).passthrough()

export const QueryCareerKnowledgeGraphSchema = z.object({
  jobDescription: z.string().min(5, "jobDescription is required"),
}).passthrough()

export const GetUserProfileSchema = z.object({}).passthrough()

export const UpdateUserProfileSchema = z.object({
  headline: z.string().optional(),
  bio: z.string().optional(),
  skills: z.array(z.string()).optional(),
  targetRoles: z.array(z.string()).optional(),
  location: z.string().optional(),
  salaryExpectation: z.string().optional(),
  experienceLevel: z.string().optional(),
  currentStatus: z.string().optional(),
  linkedInUrl: z.string().optional(),
  githubUrl: z.string().optional(),
  portfolioUrl: z.string().optional(),
  strengths: z.string().optional(),
  weaknesses: z.string().optional(),
}).passthrough()

export const SaveUserMemorySchema = z.object({
  category: z.enum(["preference", "skill", "experience", "constraint", "general"]).catch("general"),
  content: z.string().min(2, "Memory content is required").max(3000),
}).passthrough()

export const ForgetUserMemorySchema = z.object({
  memoryId: z.string().min(1, "memoryId is required"),
}).passthrough()

export const GetUserMemoriesSchema = z.object({
  category: z.string().optional(),
}).passthrough()

export const CreateWeeklyGoalSchema = z.object({
  goal1: z.string().min(1, "Goal 1 is required"),
  goal1Target: z.number().int().optional(),
  goal2: z.string().optional(),
  goal2Target: z.number().int().optional(),
  goal3: z.string().optional(),
  goal3Target: z.number().int().optional(),
}).passthrough()

export const SendOutreachEmailSchema = z.object({
  toEmail: z.string().email("Valid recipient email is required"),
  subject: z.string().min(1, "Subject is required"),
  bodyText: z.string().min(1, "Body text is required"),
  candidateName: z.string().optional(),
  companyName: z.string().optional(),
  jobTitle: z.string().optional(),
}).passthrough()

export const ResearchCompanyIntelSchema = z.object({
  companyName: z.string().min(1, "companyName is required"),
  website: z.string().optional(),
  industry: z.string().optional(),
}).passthrough()

export const GetPrepNotesSchema = z.object({
  applicationId: z.string().optional(),
  category: z.string().optional(),
  query: z.string().optional(),
  limit: z.number().int().min(1).max(50).optional(),
}).passthrough()

export const SavePrepNoteSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  category: z.string().optional().default("General"),
  applicationId: z.string().optional(),
}).passthrough()

export const EmptyInputSchema = z.object({}).passthrough()

// -------------------------------------------------------------
// Unified Tool Registry / Manifest
// -------------------------------------------------------------

export const TOOL_MANIFEST: Record<string, ToolDefinition<any>> = {
  // 1. External Discovery
  searchExternalJobs: {
    name: "searchExternalJobs",
    description: "Search live external jobs matching query, role keywords, or location.",
    schema: SearchExternalJobsSchema,
    risk: ToolRisk.READ_ONLY,
    requiresConfirmation: false,
    allowedInHeadless: true,
    category: "discovery",
    execute: (userId, input) => executeSearchExternalJobs(userId, input),
  },

  saveJobOpportunityToTracker: {
    name: "saveJobOpportunityToTracker",
    description: "Save an externally discovered job opportunity directly to user application tracker.",
    schema: SaveJobOpportunitySchema,
    risk: ToolRisk.HIGH_MUTATION,
    requiresConfirmation: false,
    allowedInHeadless: true,
    category: "discovery",
    execute: (userId, input) => executeSaveJobOpportunityToTracker(userId, input),
  },

  // 2. Applications Pipeline Management
  createApplication: {
    name: "createApplication",
    description: "Add a new application to tracker (companyName, jobTitle, status, notes).",
    schema: CreateApplicationSchema,
    risk: ToolRisk.HIGH_MUTATION,
    requiresConfirmation: false,
    allowedInHeadless: true,
    category: "job",
    execute: (userId, input) => executeCreateApplication(userId, input),
  },

  updateApplicationStatus: {
    name: "updateApplicationStatus",
    description: "Update status of an existing job application (companyOrTitle, newStatus, notes).",
    schema: UpdateApplicationStatusSchema,
    risk: ToolRisk.HIGH_MUTATION,
    requiresConfirmation: false,
    allowedInHeadless: true,
    category: "job",
    execute: (userId, input) => executeUpdateApplicationStatus(userId, input),
  },

  searchApplications: {
    name: "searchApplications",
    description: "Search through user applications by company name, job title, or status.",
    schema: SearchApplicationsSchema,
    risk: ToolRisk.READ_ONLY,
    requiresConfirmation: false,
    allowedInHeadless: true,
    category: "job",
    execute: (userId, input) => executeSearchApplications(userId, input),
  },

  listUserApplications: {
    name: "listUserApplications",
    description: "List recent job applications from the tracker with status filter.",
    schema: SearchApplicationsSchema,
    risk: ToolRisk.READ_ONLY,
    requiresConfirmation: false,
    allowedInHeadless: true,
    category: "job",
    execute: (userId, input) => executeListUserApplications(userId, input),
  },

  getPipelineStats: {
    name: "getPipelineStats",
    description: "Get counts and distribution of applications across all stages (Saved, Applied, Interview, Offer, Rejected).",
    schema: EmptyInputSchema,
    risk: ToolRisk.READ_ONLY,
    requiresConfirmation: false,
    allowedInHeadless: true,
    category: "job",
    execute: (userId) => executeGetPipelineStats(userId),
  },

  deleteApplication: {
    name: "deleteApplication",
    description: "Permanently delete an application from the tracker. DESTRUCTIVE action.",
    schema: DeleteApplicationSchema,
    risk: ToolRisk.DESTRUCTIVE,
    requiresConfirmation: true,
    allowedInHeadless: false,
    category: "job",
    execute: (userId, input) => executeDeleteApplication(userId, input),
  },

  // 3. Resume & Career Knowledge Graph
  getResumeDetails: {
    name: "getResumeDetails",
    description: "Fetch uploaded resumes on profile including file names and length.",
    schema: GetResumeDetailsSchema,
    risk: ToolRisk.READ_ONLY,
    requiresConfirmation: false,
    allowedInHeadless: true,
    category: "resume",
    execute: (userId, input) => executeGetResumeDetails(userId, input),
  },

  getResumeSummary: {
    name: "getResumeSummary",
    description: "Fetch summary excerpt and details of default active resume.",
    schema: EmptyInputSchema,
    risk: ToolRisk.READ_ONLY,
    requiresConfirmation: false,
    allowedInHeadless: true,
    category: "resume",
    execute: (userId) => executeGetResumeSummary(userId),
  },

  tailorResumeForJob: {
    name: "tailorResumeForJob",
    description: "Synthesize ATS-targeted tailored resume for a specific job description.",
    schema: TailorResumeForJobSchema,
    risk: ToolRisk.HIGH_MUTATION,
    requiresConfirmation: false,
    allowedInHeadless: true,
    category: "resume",
    execute: (userId, input) => executeTailorResumeForJob(userId, input),
  },

  syncCareerKnowledgeGraph: {
    name: "syncCareerKnowledgeGraph",
    description: "Extract nodes and relationships from resume/profile into semantic Career Knowledge Graph.",
    schema: SyncCareerKnowledgeGraphSchema,
    risk: ToolRisk.LOW_MUTATION,
    requiresConfirmation: false,
    allowedInHeadless: true,
    category: "resume",
    execute: (userId) => executeSyncCareerKnowledgeGraph(userId),
  },

  queryCareerKnowledgeGraph: {
    name: "queryCareerKnowledgeGraph",
    description: "Query Career Knowledge Graph against a JD to discover matched skills and graph overlap.",
    schema: QueryCareerKnowledgeGraphSchema,
    risk: ToolRisk.READ_ONLY,
    requiresConfirmation: false,
    allowedInHeadless: true,
    category: "resume",
    execute: (userId, input) => executeQueryCareerKnowledgeGraph(userId, input),
  },

  // 4. User Profile & Constraints
  getUserProfile: {
    name: "getUserProfile",
    description: "Fetch user profile attributes, target roles, salary expectations, and preferences.",
    schema: GetUserProfileSchema,
    risk: ToolRisk.READ_ONLY,
    requiresConfirmation: false,
    allowedInHeadless: true,
    category: "profile",
    execute: (userId) => executeGetUserProfile(userId),
  },

  updateUserProfile: {
    name: "updateUserProfile",
    description: "Update user profile details (headline, bio, targetRoles, location, salaryExpectation).",
    schema: UpdateUserProfileSchema,
    risk: ToolRisk.LOW_MUTATION,
    requiresConfirmation: false,
    allowedInHeadless: true,
    category: "profile",
    execute: (userId, input) => executeUpdateUserProfile(userId, input),
  },

  // 5. Memory
  saveUserMemory: {
    name: "saveUserMemory",
    description: "Persist a career fact or constraint to UserMemory (category, content).",
    schema: SaveUserMemorySchema,
    risk: ToolRisk.LOW_MUTATION,
    requiresConfirmation: false,
    allowedInHeadless: true,
    category: "memory",
    execute: (userId, input) => executeSaveUserMemory(userId, input),
  },

  forgetUserMemory: {
    name: "forgetUserMemory",
    description: "Permanently delete a specific memory from UserMemory. DESTRUCTIVE action.",
    schema: ForgetUserMemorySchema,
    risk: ToolRisk.DESTRUCTIVE,
    requiresConfirmation: true,
    allowedInHeadless: false,
    category: "memory",
    execute: (userId, input) => executeForgetUserMemory(userId, input),
  },

  getUserMemories: {
    name: "getUserMemories",
    description: "Fetch remembered user career preferences, skills, and constraints.",
    schema: GetUserMemoriesSchema,
    risk: ToolRisk.READ_ONLY,
    requiresConfirmation: false,
    allowedInHeadless: true,
    category: "memory",
    execute: (userId, input) => executeGetUserMemories(userId, input),
  },

  // 6. Goals & Accountability
  createWeeklyGoal: {
    name: "createWeeklyGoal",
    description: "Set or update the 3 weekly career placement and effort goals.",
    schema: CreateWeeklyGoalSchema,
    risk: ToolRisk.LOW_MUTATION,
    requiresConfirmation: false,
    allowedInHeadless: true,
    category: "goal",
    execute: (userId, input) => executeCreateWeeklyGoal(userId, input),
  },

  setWeeklyGoals: {
    name: "setWeeklyGoals",
    description: "Alias for createWeeklyGoal to set weekly career targets.",
    schema: CreateWeeklyGoalSchema,
    risk: ToolRisk.LOW_MUTATION,
    requiresConfirmation: false,
    allowedInHeadless: true,
    category: "goal",
    execute: (userId, input) => executeCreateWeeklyGoal(userId, input),
  },

  // 7. Outreach
  sendOutreachEmailViaResend: {
    name: "sendOutreachEmailViaResend",
    description: "Dispatch an external email to a recruiter or company contact. EXTERNAL action.",
    schema: SendOutreachEmailSchema,
    risk: ToolRisk.EXTERNAL,
    requiresConfirmation: true,
    allowedInHeadless: false,
    category: "email",
    execute: (userId, input) => executeSendOutreachEmail(userId, input),
  },

  // 8. Company Intel & Prep Notes
  researchCompanyIntel: {
    name: "researchCompanyIntel",
    description: "Look up or store company intelligence, interview rounds, and application context.",
    schema: ResearchCompanyIntelSchema,
    risk: ToolRisk.LOW_MUTATION,
    requiresConfirmation: false,
    allowedInHeadless: true,
    category: "intel",
    execute: (userId, input) => executeResearchCompanyIntel(userId, input),
  },

  getPrepNotes: {
    name: "getPrepNotes",
    description: "Retrieve interview preparation notes and cheatsheets.",
    schema: GetPrepNotesSchema,
    risk: ToolRisk.READ_ONLY,
    requiresConfirmation: false,
    allowedInHeadless: true,
    category: "intel",
    execute: (userId, input) => executeGetPrepNotes(userId, input),
  },

  savePrepNote: {
    name: "savePrepNote",
    description: "Save a new interview prep note or cheatsheet for an application.",
    schema: SavePrepNoteSchema,
    risk: ToolRisk.LOW_MUTATION,
    requiresConfirmation: false,
    allowedInHeadless: true,
    category: "intel",
    execute: (userId, input) => executeSavePrepNote(userId, input),
  },

  // Legacy / Safe Stubs for complete backward compatibility
  draftOutreachEmail: {
    name: "draftOutreachEmail",
    description: "Draft an outreach email without sending it.",
    schema: z.object({ companyName: z.string().optional(), role: z.string().optional() }).passthrough(),
    risk: ToolRisk.READ_ONLY,
    requiresConfirmation: false,
    allowedInHeadless: true,
    category: "email",
    execute: async () => ({
      success: true,
      message: "Outreach email draft generated in conversational context.",
    }),
  },

  scrapeJobLink: {
    name: "scrapeJobLink",
    description: "Extract clean job description from an external link.",
    schema: z.object({ url: z.string().url() }).passthrough(),
    risk: ToolRisk.EXTERNAL,
    requiresConfirmation: false,
    allowedInHeadless: true,
    category: "discovery",
    execute: async (_userId, input) => {
      try {
        const url = input.url
        const res = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
          signal: AbortSignal.timeout(8000),
        })
        if (!res.ok) {
          return { success: false, error: `Failed to fetch page content (HTTP ${res.status})` }
        }
        const html = await res.text()
        const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 5000)
        return { success: true, text }
      } catch (err: any) {
        return { success: false, error: err?.message || "Failed to scrape job link" }
      }
    },
  },

  syncToGoogleSheets: {
    name: "syncToGoogleSheets",
    description: "Sync tracked applications to Google Sheets.",
    schema: EmptyInputSchema,
    risk: ToolRisk.EXTERNAL,
    requiresConfirmation: false,
    allowedInHeadless: true,
    category: "job",
    execute: async (userId) => {
      try {
        const { syncApplicationsToGoogleSheets } = await import("@/lib/google-sheets")
        const { prisma, withDbRetry } = await import("@/lib/prisma")
        const apps = await withDbRetry(() =>
          prisma.application.findMany({
            where: { userId },
            take: 50,
            orderBy: { applicationDate: "desc" },
          })
        )
        const res = await syncApplicationsToGoogleSheets(userId, apps as any)
        return { success: res.success, count: res.count, message: res.error || "Synced applications to Google Sheets" }
      } catch (err: any) {
        return { success: false, error: err?.message || "Google Sheets sync unavailable" }
      }
    },
  },

  batchImportApplications: {
    name: "batchImportApplications",
    description: "Batch import multiple applications. Requires confirmation.",
    schema: z.object({ applications: z.array(z.record(z.string(), z.any())) }).passthrough(),
    risk: ToolRisk.HIGH_MUTATION,
    requiresConfirmation: true,
    allowedInHeadless: false,
    category: "job",
    execute: async () => ({
      success: false,
      error: "Batch import requires manual CSV upload via dashboard settings.",
    }),
  },
}

// -------------------------------------------------------------
// Manifest Utility Methods
// -------------------------------------------------------------

export function getToolDefinition(toolName: string): ToolDefinition | undefined {
  return TOOL_MANIFEST[toolName]
}

export function isHITLRequired(toolName: string): boolean {
  const tool = TOOL_MANIFEST[toolName]
  return tool ? tool.requiresConfirmation : false
}

export function isAllowedInHeadless(toolName: string): boolean {
  const tool = TOOL_MANIFEST[toolName]
  return tool ? tool.allowedInHeadless : true
}

export function getToolRisk(toolName: string): ToolRisk {
  return TOOL_MANIFEST[toolName]?.risk ?? ToolRisk.LOW_MUTATION
}

export function requiresConfirmation(toolName: string): boolean {
  return isHITLRequired(toolName)
}

export function getToolsByRisk(risk: ToolRisk): string[] {
  return Object.values(TOOL_MANIFEST)
    .filter((entry) => entry.risk === risk)
    .map((entry) => entry.name)
}

export function getSafeTools(): string[] {
  return Object.values(TOOL_MANIFEST)
    .filter((entry) => entry.risk === ToolRisk.READ_ONLY || entry.risk === ToolRisk.LOW_MUTATION)
    .map((entry) => entry.name)
}

/**
 * Dynamically formats all active tools into a structured catalog for the LLM Planner.
 * Guarantees zero split-brain between the prompt and the runtime dispatcher.
 */
export function getToolCatalogForPlanner(): string {
  const tools = Object.values(TOOL_MANIFEST)
    // Filter out internal aliases or deprecated stubs from planner prompt
    .filter((t) => t.name !== "setWeeklyGoals" && t.name !== "batchImportApplications")

  return tools
    .map((tool) => {
      let schemaHint = "{}"
      if (tool.schema instanceof z.ZodObject) {
        const shape = tool.schema.shape
        const keys = Object.keys(shape)
        if (keys.length > 0) {
          const formatted = keys
            .map((k) => {
              const field = shape[k]
              const isOptional = field.isOptional()
              return `${k}${isOptional ? "?" : ""}`
            })
            .join(", ")
          schemaHint = `{ ${formatted} }`
        }
      }
      const hitlMarker = tool.requiresConfirmation ? " [REQUIRES CONFIRMATION]" : ""
      return `- ${tool.name}: ${schemaHint} — ${tool.description}${hitlMarker}`
    })
    .join("\n")
}

/**
 * Universal Tool Execution Dispatcher with Zod validation, Headless safety, and error classification.
 */
export async function executeToolByName(
  toolName: string,
  rawInput: Record<string, any> = {},
  userId: string,
  options?: { isHeadless?: boolean }
): Promise<{
  success: boolean
  result?: any
  error?: string
  message?: string
  retryable?: boolean
  [key: string]: any
}> {
  if (!userId) {
    return {
      success: false,
      error: "Unauthorized: Missing user authentication context.",
      retryable: false,
    }
  }

  const tool = TOOL_MANIFEST[toolName]
  if (!tool) {
    return {
      success: false,
      error: `Tool "${toolName}" is not recognized in CareerTrack catalog.`,
      retryable: false,
    }
  }

  // Headless Mode Protection: Block destructive or sensitive tools in background tasks
  if (options?.isHeadless && !tool.allowedInHeadless) {
    return {
      success: false,
      error: `Tool "${toolName}" is restricted and cannot be executed in headless background mode without user confirmation.`,
      retryable: false,
    }
  }

  // Pre-Execution Zod Input Validation
  const parseResult = tool.schema.safeParse(rawInput)
  if (!parseResult.success) {
    const errorDetails = parseResult.error.issues
      .map((issue: z.ZodIssue) => `${issue.path.join(".") || "input"}: ${issue.message}`)
      .join("; ")

    return {
      success: false,
      error: `Invalid input for tool "${toolName}": ${errorDetails}`,
      retryable: false, // Invalid inputs are not retryable without schema changes
    }
  }

  try {
    const result = await tool.execute(userId, parseResult.data)
    return {
      ...result,
      retryable: !result.success,
    }
  } catch (err: any) {
    const errorMsg = err?.message || `Execution error on tool ${toolName}`
    // Connection drops or timeouts may be retryable; application validation errors are not
    const isRetryable =
      errorMsg.includes("timeout") ||
      errorMsg.includes("ECONNRESET") ||
      errorMsg.includes("fetch failed") ||
      errorMsg.includes("network")

    return {
      success: false,
      error: errorMsg,
      retryable: isRetryable,
    }
  }
}
