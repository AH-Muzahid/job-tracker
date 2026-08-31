/* eslint-disable @typescript-eslint/no-explicit-any */
import { tool } from "ai"
import { z } from "zod"
import { prisma, withDbRetry } from "@/lib/prisma"
import { requiresConfirmation } from "./tool-registry"
import { invalidateCache } from "@/lib/redis"
import {
  buildCareerGraphFromText,
  traverseGraphForJD,
  getCachedKnowledgeGraph,
  saveKnowledgeGraph,
} from "@/lib/ai/knowledge-graph"
import { sendEmail, formatOutreachEmailHtml } from "@/lib/email"
import { syncApplicationsToGoogleSheets, getGoogleSheetsConfig } from "@/lib/google-sheets"
import { generateEmbedding, serializeEmbedding } from "./memory-search"

function parseToolArgs(raw: any): Record<string, any> {
  if (!raw) return {}
  let current = raw
  if (typeof current === "string") {
    try {
      current = JSON.parse(current)
    } catch {
      const jsonMatch = current.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          current = JSON.parse(jsonMatch[0])
        } catch {}
      }
    }
  }
  if (current && typeof current === "object") {
    if (typeof current.arguments === "string") {
      try {
        return { ...current, ...JSON.parse(current.arguments) }
      } catch {}
    }
    if (typeof current.input === "string") {
      try {
        return { ...current, ...JSON.parse(current.input) }
      } catch {}
    }
    if (current.arguments && typeof current.arguments === "object") {
      return { ...current, ...current.arguments }
    }
    if (current.input && typeof current.input === "object") {
      return { ...current, ...current.input }
    }
    if (current.parameters && typeof current.parameters === "object") {
      return { ...current, ...current.parameters }
    }
  }
  return typeof current === "object" && current !== null ? current : {}
}

function extractCompanyFromText(text: string): string {
  if (!text) return ""
  // Clean punctuation but preserve spaces/alphanumerics
  const clean = text.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ").replace(/\s+/g, " ").trim()

  const patterns = [
    /(?:delete|remove|dlt|cancel|drop|forget)\s+(?:the\s+)?(?:application\s+)?(?:for\s+)?([A-Za-z0-9\s&-]{2,25})/i,
    /([A-Za-z0-9\s&-]{2,25})\s+(?:delete|remove|dlt|sorao|bad|hatao)\s+(?:koro|den|dite|felo)/i,
  ]

  for (const regex of patterns) {
    const match = clean.match(regex)
    if (match && match[1]) {
      const candidate = match[1].trim()
      const generic = ["it", "this", "that", "application", "job", "my"]
      if (!generic.includes(candidate.toLowerCase())) {
        return candidate
      }
    }
  }
  return ""
}

async function resolveHITLArgs(args: any, sessionId?: string): Promise<any> {
  if (!sessionId) return args

  try {
    const lastMsg = await prisma.chatMessage.findFirst({
      where: { sessionId, role: "user" },
      orderBy: { createdAt: "desc" },
    })

    if (lastMsg && lastMsg.content.includes("Original args:")) {
      const jsonMatch = lastMsg.content.match(/Original args:\s*(\{[\s\S]*?\})/)
      if (jsonMatch) {
        const originalArgs = JSON.parse(jsonMatch[1])
        console.log(`[Tool] HITL confirmation detected. Extracted original args:`, JSON.stringify(originalArgs))
        return { ...args, ...originalArgs }
      }
    }
  } catch (err) {
    console.error("[Tool] Failed to resolve HITL args:", err)
  }

  return args
}

function extractCompanyAndRole(rawStr: string): { company: string; title: string } {
  if (!rawStr) return { company: "", title: "" }
  let str = rawStr.replace(/\{[\s\S]*?"reason":\s*"|"\}|^\s*["']|["']\s*$/g, "").trim()
  str = str.replace(/^(?:creating|adding|add|create|track|record|save|new application for|application for)\s+/i, "").trim()
  str = str.replace(/\s+in\s+(?:applied|interview|saved|assessment|offer|rejected)\s+status.*$/i, "").trim()
  str = str.replace(/\s+status.*$/i, "").trim()

  // Pattern 1: "Company - Job Title" or "Company – Job Title" or "Company : Job Title"
  let match = str.match(/^\s*([A-Za-z0-9\s._&]+?)\s*[-–—:]\s*([A-Za-z0-9\s._&]+?)\s*$/i)
  if (match && match[1] && match[2]) {
    return { company: match[1].trim(), title: match[2].trim() }
  }

  // Pattern 2: "for Company as Job Title" or "Company as Job Title"
  match = str.match(/^(?:for\s+)?([A-Za-z0-9\s._&]+?)\s+as\s+([A-Za-z0-9\s._&]+?)$/i)
  if (match && match[1] && match[2]) {
    return { company: match[1].trim(), title: match[2].trim() }
  }

  // Pattern 3: "Job Title at Company" or "Job Title @ Company"
  match = str.match(/^([A-Za-z0-9\s._&]+?)\s+(?:at|@)\s+([A-Za-z0-9\s._&]+?)$/i)
  if (match && match[1] && match[2]) {
    return { company: match[2].trim(), title: match[1].trim() }
  }

  // Pattern 4: "Company (Job Title)"
  match = str.match(/^([A-Za-z0-9\s._&]+?)\s*\(([^)]+)\)$/i)
  if (match && match[1] && match[2]) {
    return { company: match[1].trim(), title: match[2].trim() }
  }

  // Fallback: Check anywhere inside the raw string
  match = rawStr.match(/(?:for|add|create)\s+([A-Za-z0-9\s._&]+?)\s*(?:as|[-–—:])\s*([A-Za-z0-9\s._&]+?)(?:\s+in\s+|$|"|\\)/i)
  if (match && match[1] && match[2]) {
    return { company: match[1].trim(), title: match[2].trim() }
  }

  return { company: "", title: "" }
}

export function cleanCompanyName(company: string): string {
  if (!company) return ""
  let cleaned = company.trim()
  cleaned = cleaned.replace(/^["'`]+|["'`]+$/g, "").trim()
  cleaned = cleaned.replace(/^(?:an?\s+)?(?:new\s+)?(?:job\s+|role\s+|position\s+|opening\s+)?(?:application\s+)?(?:for|at|with|in|to)\s+/i, "")
  cleaned = cleaned.replace(/^(?:the\s+)?(?:company|firm|org|organization)\s+(?:called|named)?\s*/i, "")
  cleaned = cleaned.replace(/^["'`]+|["'`]+$/g, "").trim()
  return cleaned
}

export function cleanJobTitle(title: string): string {
  if (!title) return ""
  let cleaned = title.trim()
  cleaned = cleaned.replace(/^["'`]+|["'`]+$/g, "").trim()
  cleaned = cleaned.replace(/^(?:as\s+(?:a\s+|an\s+)?|role\s+of\s+|position\s+of\s+|title\s+of\s+|job\s+title\s+of\s+|for\s+(?:the\s+)?(?:role|position)\s+of\s+)/i, "")
  cleaned = cleaned.replace(/^["'`]+|["'`]+$/g, "").trim()
  return cleaned
}

export function createAiTools(userId: string, sessionId?: string) {
  return {
    updateApplicationStatus: tool({
      description: "Update application status. Extract company/title from conversation context if not explicit.",
      parameters: z.object({
        companyOrTitle: z.string().describe("Company name or job title"),
        newStatus: z.string().describe("New status: Saved, Applied, Assessment, Interview, Rejected, Offer"),
        notes: z.string().optional().describe("Optional note"),
      }),
      execute: async (rawArgs: any) => {
        try {
          const args = parseToolArgs(rawArgs)

          let companyOrTitle = (
            args?.companyOrTitle ||
            args?.companyName ||
            args?.company ||
            args?.jobTitle ||
            args?.title ||
            args?.role ||
            ""
          ).trim()

          // Extract status from args or reason text
          let rawStatus = args?.newStatus || args?.status || ""
          const combinedStr = `${JSON.stringify(rawArgs)} ${args?.reason || ""} ${args?.notes || ""}`.toLowerCase()

          if (!rawStatus) {
            if (combinedStr.includes("applied")) rawStatus = "Applied"
            else if (combinedStr.includes("interview")) rawStatus = "Interview"
            else if (combinedStr.includes("assessment")) rawStatus = "Assessment"
            else if (combinedStr.includes("offer")) rawStatus = "Offer"
            else if (combinedStr.includes("rejected")) rawStatus = "Rejected"
            else if (combinedStr.includes("saved")) rawStatus = "Saved"
            else rawStatus = "Applied"
          }

          const normalizedStatusMap: Record<string, string> = {
            saved: "Saved",
            applied: "Applied",
            assessment: "Assessment",
            interview: "Interview",
            interviewing: "Interview",
            rejected: "Rejected",
            offer: "Offer",
          }
          const newStatus = normalizedStatusMap[rawStatus.toLowerCase()] || "Applied"

          // Natural entity extraction from reason if companyOrTitle is empty
          if (!companyOrTitle && args?.reason) {
            const extracted = extractCompanyAndRole(args.reason)
            if (extracted.company) {
              companyOrTitle = extracted.company
            } else {
              const match = args.reason.match(/(?:update|for|status of)\s+([A-Za-z0-9._-]+)/i)
              if (match && match[1]) {
                companyOrTitle = match[1].trim()
              }
            }
          }

          companyOrTitle = cleanCompanyName(companyOrTitle)

          let app: any = null

          if (companyOrTitle) {
            app = await withDbRetry(() =>
              prisma.application.findFirst({
                where: {
                  userId,
                  OR: [
                    { companyName: { contains: companyOrTitle, mode: "insensitive" } },
                    { jobTitle: { contains: companyOrTitle, mode: "insensitive" } },
                  ],
                },
                orderBy: { updatedAt: "desc" },
              })
            )
          }

          // Fallback: If no company specified or found, target the user's most recent application
          if (!app) {
            app = await withDbRetry(() =>
              prisma.application.findFirst({
                where: { userId },
                orderBy: { updatedAt: "desc" },
              })
            )
          }

          if (!app) {
            return {
              success: false,
              message: "No active application found to update. Please specify the company name (e.g. 'Update Stripe status to Applied').",
            }
          }

          const notes = args?.notes
          const prevStatus = app.status

          await withDbRetry(async () => {
            await prisma.application.update({
              where: { id: app.id },
              data: {
                status: newStatus,
                notes: notes ? `${app.notes ? app.notes + "\n" : ""}[${new Date().toLocaleDateString()}] ${notes}` : app.notes,
              },
            })

            await prisma.statusChange.create({
              data: {
                applicationId: app.id,
                fromStatus: prevStatus,
                toStatus: newStatus,
                changedAt: new Date(),
              },
            })
          })

          void invalidateCache(`user:pipeline-stats:${userId}`)
          void invalidateCache(`user:applications:${userId}`)

          return {
            success: true,
            applicationId: app.id,
            companyName: app.companyName,
            jobTitle: app.jobTitle,
            fromStatus: prevStatus,
            toStatus: newStatus,
            message: `✅ **Status Updated:** **${app.companyName}** (*${app.jobTitle}*) is now in **${newStatus}** status (was *${prevStatus}*).\n\n[Open Application Details →](/applications/${app.id})`,
          }
        } catch (error) {
          // silent
          return { success: false, message: "Failed to update application status." }
        }
      },
    } as any),

    createApplication: tool({
      description: "Create a new job application. Extract company/title from conversation context if not explicit.",
      parameters: z.object({
        companyName: z.string().describe("Company name (e.g. 'Stripe', 'Google')"),
        jobTitle: z.string().describe("Job title (e.g. 'Senior Backend Engineer')"),
        status: z.string().optional().describe("Status: Saved, Applied, Assessment, Interview, Rejected, Offer"),
        jobUrl: z.string().optional().describe("Job listing URL"),
        notes: z.string().optional().describe("Notes about the role"),
      }),
      execute: async (rawArgs: any) => {
        try {
          const args = parseToolArgs(rawArgs)

          let finalCompany = (
            args?.companyName ||
            args?.company ||
            args?.company_name ||
            args?.organization ||
            ""
          ).trim()

          let finalTitle = (
            args?.jobTitle ||
            args?.title ||
            args?.job_title ||
            args?.role ||
            args?.position ||
            ""
          ).trim()

          // Natural entity extraction if parameters were inside reason or string-wrapped
          if (!finalCompany || !finalTitle) {
            const searchStr = args?.reason || JSON.stringify(rawArgs)
            const extracted = extractCompanyAndRole(searchStr)
            if (!finalCompany && extracted.company) finalCompany = extracted.company
            if (!finalTitle && extracted.title) finalTitle = extracted.title
          }

          finalCompany = cleanCompanyName(finalCompany)
          finalTitle = cleanJobTitle(finalTitle)

          // Extract status intelligently
          let rawStatus = args?.status || args?.applicationStatus || ""
          const rawStr = `${JSON.stringify(rawArgs)} ${args?.reason || ""}`
          const rawStrLower = rawStr.toLowerCase()

          if (!rawStatus) {
            if (rawStrLower.includes("applied")) rawStatus = "Applied"
            else if (rawStrLower.includes("interview")) rawStatus = "Interview"
            else if (rawStrLower.includes("assessment")) rawStatus = "Assessment"
            else if (rawStrLower.includes("offer")) rawStatus = "Offer"
            else if (rawStrLower.includes("rejected")) rawStatus = "Rejected"
            else rawStatus = "Saved"
          }

          const normalizedStatusMap: Record<string, string> = {
            saved: "Saved",
            applied: "Applied",
            assessment: "Assessment",
            interview: "Interview",
            interviewing: "Interview",
            rejected: "Rejected",
            offer: "Offer",
          }
          const status = normalizedStatusMap[rawStatus.toLowerCase()] || "Saved"

          const jobUrl = args?.jobUrl
          const source = args?.source || "Other"
          const notes = args?.notes

          if (!finalCompany || !finalTitle) {
            return {
              success: false,
              message: "Please specify both the company name and the job title to track this application (e.g. company: 'Stripe', role: 'Senior Backend Engineer').",
            }
          }

          // 1. Check for duplicate application (same company + job title)
          const existingApp = await withDbRetry(() =>
            prisma.application.findFirst({
              where: {
                userId,
                companyName: { equals: finalCompany, mode: "insensitive" },
                jobTitle: { equals: finalTitle, mode: "insensitive" },
              },
            })
          )

          if (existingApp) {
            return {
              success: false,
              isDuplicate: true,
              applicationId: existingApp.id,
              companyName: existingApp.companyName,
              jobTitle: existingApp.jobTitle,
              status: existingApp.status,
              message: `⚠️ **Duplicate Detected:** You already have an active application for **${existingApp.companyName}** (*${existingApp.jobTitle}*) in **${existingApp.status}** status.\n\n[Open Application Details →](/applications/${existingApp.id})\n\nTo prevent duplicate records, this was not added again. You can ask me to update its status, log an interview, or add notes instead.`,
            }
          }

          const newApp = await withDbRetry(() =>
            prisma.application.create({
              data: {
                userId,
                companyName: finalCompany,
                jobTitle: finalTitle,
                status: status || "Saved",
                jobUrl: jobUrl || null,
                source: source || "Other",
                notes: notes || null,
                applicationDate: new Date(),
                statusChanges: { create: { toStatus: status || "Saved" } },
              },
            })
          )

          // Invalidate Redis caches
          void invalidateCache(`user:pipeline-stats:${userId}`)
          void invalidateCache(`user:stats:${userId}`)
          void invalidateCache(`user:applications:${userId}`)

          // Fire non-blocking auto-sync to Google Sheets
          void syncApplicationsToGoogleSheets(userId, [
            {
              id: newApp.id,
              companyName: newApp.companyName,
              jobTitle: newApp.jobTitle,
              status: newApp.status,
              source: newApp.source,
              applicationDate: newApp.applicationDate,
              jobUrl: newApp.jobUrl,
              notes: newApp.notes,
            },
          ])

          return {
            success: true,
            applicationId: newApp.id,
            companyName: newApp.companyName,
            jobTitle: newApp.jobTitle,
            status: newApp.status,
            message: `**Successfully Tracked:** Added **${finalCompany}** — *${finalTitle}* in **${status || "Saved"}** status.\n\n- **Company:** ${finalCompany}\n- **Role:** ${finalTitle}\n- **Status:** ${status || "Saved"}\n- **Date:** ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}\n\n[Open Application Details →](/applications/${newApp.id})\n\nWould you like me to draft an outreach email, analyze the requirements, or prepare a tailored cover letter?`,
          }
        } catch (error) {
          // silent
          return { success: false, message: "Failed to create application in database." }
        }
      },
    } as any),

    deleteApplication: tool({
      description: "Delete or remove an application from the user's tracker by company name or job title. You MUST extract the company name or job title from the conversation context. If the user says 'delete it' or 'delete koro', look at the previous messages to find which company they're referring to.",
      parameters: z.object({
        companyOrTitle: z.string().describe("Company name or job title of the application to remove. Extract from conversation context if not explicitly stated."),
        confirmed: z.boolean().optional().describe("Internal flag for HITL confirmation"),
      }),
      execute: async (rawArgs: any) => {
        try {
          let args = parseToolArgs(rawArgs)
          console.log("[Tool] deleteApplication args:", JSON.stringify(args))

          // Resolve parameters from UI confirmation if present
          args = await resolveHITLArgs(args, sessionId)

          let companyOrTitle = (
            args?.companyOrTitle ||
            args?.companyName ||
            args?.company ||
            args?.jobTitle ||
            args?.title ||
            args?.role ||
            ""
          ).trim()

          // Try extracting from reason or chat history if empty or unknown
          if (!companyOrTitle || companyOrTitle.toLowerCase() === "unknown") {
            if (args?.reason) {
              companyOrTitle = extractCompanyFromText(args.reason)
            }
            if ((!companyOrTitle || companyOrTitle.toLowerCase() === "unknown") && sessionId) {
              const lastMsg = await prisma.chatMessage.findFirst({
                where: { sessionId, role: "user" },
                orderBy: { createdAt: "desc" }
              })
              if (lastMsg) {
                companyOrTitle = extractCompanyFromText(lastMsg.content)
              }
            }
          }

          companyOrTitle = cleanCompanyName(companyOrTitle)
          args.companyOrTitle = companyOrTitle // Update args so HITL uses it

          // HITL confirmation check
          if (requiresConfirmation("deleteApplication") && !args?.confirmed) {
            const target = args?.companyOrTitle || "unknown"
            return {
              success: false,
              requiresConfirmation: true,
              message: `⚠️ Confirm deletion: Delete application for "${target}"? This cannot be undone.`,
              toolName: "deleteApplication",
              args,
            }
          }

          const genericPhrases = ["the application", "application", "this", "it", "that", "current", "latest", "recent", "job"]
          const isGeneric = !companyOrTitle || genericPhrases.includes(companyOrTitle.toLowerCase())

          let app: any = null

          if (!isGeneric) {
            app = await withDbRetry(() =>
              prisma.application.findFirst({
                where: {
                  userId,
                  OR: [
                    { companyName: { contains: companyOrTitle, mode: "insensitive" } },
                    { jobTitle: { contains: companyOrTitle, mode: "insensitive" } },
                  ],
                },
                orderBy: { updatedAt: "desc" },
              })
            )
          }

          // Fallback: If generic reference (e.g. "delete the application", "delete it") or not found by exact string, target user's most recent application
          if (!app) {
            app = await withDbRetry(() =>
              prisma.application.findFirst({
                where: { userId },
                orderBy: { updatedAt: "desc" },
              })
            )
          }

          if (!app) {
            return {
              success: false,
              message: "No active application found in your tracker to delete.",
            }
          }

          await withDbRetry(() =>
            prisma.application.delete({
              where: { id: app.id },
            })
          )

          void invalidateCache(`user:pipeline-stats:${userId}`)
          void invalidateCache(`user:stats:${userId}`)
          void invalidateCache(`user:applications:${userId}`)

          return {
            success: true,
            deletedCompany: app.companyName,
            deletedTitle: app.jobTitle,
            message: `**Successfully Deleted:** Removed **${app.companyName}** (*${app.jobTitle}*) from your application tracker.`,
          }
        } catch (error) {
          // silent
          return { success: false, message: "Failed to delete application." }
        }
      },
    } as any),

    setWeeklyGoals: tool({
      description: "Set or update the user's 3 weekly goals for job search accountability.",
      parameters: z.object({
        goal1: z.string().describe("Goal 1: Placement-oriented primary goal e.g. Secure 1 interview this week"),
        goal2: z.string().optional().describe("Goal 2: Activity support goal e.g. Apply to 15 targeted roles"),
        goal3: z.string().optional().describe("Goal 3: Readiness/practice goal e.g. 2 mock interviews"),
      }),
      execute: async (rawArgs: any) => {
        try {
          const args = parseToolArgs(rawArgs)
          const goal1 = args?.goal1 || "Apply to targeted roles"
          const goal2 = args?.goal2 || null
          const goal3 = args?.goal3 || null

          const now = new Date()
          const weekStart = new Date(now)
          weekStart.setDate(now.getDate() - now.getDay() + 1)
          weekStart.setHours(0, 0, 0, 0)

          const goal = await withDbRetry(() =>
            prisma.weeklyGoal.upsert({
              where: { userId_weekStart: { userId, weekStart } },
              update: {
                goal1,
                goal2,
                goal3,
              },
              create: {
                userId,
                weekStart,
                goal1,
                goal2,
                goal3,
              },
            })
          )

          return {
            success: true,
            goalId: goal.id,
            message: `Updated weekly goals for week starting ${weekStart.toLocaleDateString()}:\n1. ${goal1}${goal2 ? `\n2. ${goal2}` : ""}${goal3 ? `\n3. ${goal3}` : ""}`,
          }
        } catch (error) {
          // silent
          return { success: false, message: "Failed to update weekly goals." }
        }
      },
    } as any),

    addPrepQuestions: tool({
      description: "Add interview preparation questions to the user's question bank.",
      parameters: z.object({
        category: z.string().describe("Category e.g. React, Node.js, System Design, Behavioral"),
        questions: z.array(
          z.object({
            question: z.string(),
            suggestedAnswer: z.string().optional(),
            difficulty: z.enum(["Easy", "Medium", "Hard"]).optional().default("Medium"),
          })
        ).describe("List of questions to add"),
      }),
      execute: async (rawArgs: any) => {
        try {
          const args = parseToolArgs(rawArgs)
          const category = args?.category || "General Technical"
          const questions = Array.isArray(args?.questions) ? args.questions : []

          if (questions.length === 0) {
            return { success: false, message: "No questions provided to add." }
          }

          await withDbRetry(() =>
            prisma.prepQuestion.createMany({
              data: questions.map((q: any) => ({
                userId,
                category,
                question: q.question || String(q),
                answer: q.suggestedAnswer || null,
                difficulty: q.difficulty || "Medium",
              })),
            })
          )

          return {
            success: true,
            addedCount: questions.length,
            message: `Successfully added ${questions.length} questions to ${category} question bank.`,
          }
        } catch (error) {
          // silent
          return { success: false, message: "Failed to add prep questions." }
        }
      },
    } as any),

    searchApplications: tool({
      description: "Search user's job applications by company name, job title, or status.",
      parameters: z.object({
        query: z.string().optional().describe("Search term for company or job title"),
        status: z.enum(["Saved", "Applied", "Assessment", "Interview", "Rejected", "Offer"]).optional().describe("Filter by application status"),
        limit: z.number().optional().default(10).describe("Maximum number of results to return"),
      }),
      execute: async (rawArgs: any) => {
        try {
          const args = parseToolArgs(rawArgs)
          const query = args?.query
          const status = args?.status
          const limit = Math.min(args?.limit || 10, 25)

          const whereClause: any = { userId }
          if (status) whereClause.status = status
          if (query) {
            whereClause.OR = [
              { companyName: { contains: query, mode: "insensitive" } },
              { jobTitle: { contains: query, mode: "insensitive" } },
              { notes: { contains: query, mode: "insensitive" } },
            ]
          }
          const apps = await withDbRetry(() =>
            prisma.application.findMany({
              where: whereClause,
              orderBy: { updatedAt: "desc" },
              take: limit,
              select: {
                id: true, companyName: true, jobTitle: true, status: true,
                source: true, applicationDate: true, notes: true, updatedAt: true,
              },
            })
          )

          const formattedList = apps.map((a, idx) =>
            `${idx + 1}. **${a.companyName}** — *${a.jobTitle}* (${a.status})`
          ).join("\n")

          return {
            success: true,
            count: apps.length,
            applications: apps,
            message: apps.length === 0
              ? `No applications found matching "${query || status || "search"}".`
              : `Found **${apps.length}** matching application${apps.length === 1 ? "" : "s"}:\n\n${formattedList}`,
          }
        } catch (error) {
          // silent
          return { success: false, message: "Failed to search applications." }
        }
      },
    } as any),

    getPrepNotes: tool({
      description: "Search or fetch interview preparation notes.",
      parameters: z.object({
        query: z.string().optional().describe("Search keyword for prep notes"),
        category: z.string().optional().describe("Category of prep notes"),
      }),
      execute: async (rawArgs: any) => {
        try {
          const args = parseToolArgs(rawArgs)
          const query = args?.query
          const category = args?.category

          const whereClause: any = { userId }
          if (category) whereClause.category = { contains: category, mode: "insensitive" }
          if (query) {
            whereClause.OR = [
              { title: { contains: query, mode: "insensitive" } },
              { content: { contains: query, mode: "insensitive" } },
            ]
          }
          const notes = await withDbRetry(() =>
            prisma.prepNote.findMany({
              where: whereClause,
              orderBy: { createdAt: "desc" },
              take: 10,
              select: { id: true, title: true, category: true, content: true, createdAt: true },
            })
          )

          const formattedList = notes.map((n, idx) =>
            `${idx + 1}. **${n.title}** (${n.category})`
          ).join("\n")

          return {
            success: true,
            count: notes.length,
            notes,
            message: notes.length === 0
              ? "No prep notes found."
              : `Found **${notes.length}** prep note${notes.length === 1 ? "" : "s"}:\n\n${formattedList}`,
          }
        } catch (error) {
          // silent
          return { success: false, message: "Failed to fetch prep notes." }
        }
      },
    } as any),

    scrapeJobLink: tool({
      description: "Scrape a job posting URL or any webpage to extract its text content in Markdown format. Use this whenever the user provides a link.",
      parameters: z.object({
        url: z.string().url().describe("The URL of the job posting or webpage to scrape"),
      }),
      execute: async ({ url }: { url: string }) => {
        try {
          const parsedUrl = new URL(url)
          if (!["http:", "https:"].includes(parsedUrl.protocol)) {
            return { success: false, message: "Only HTTP and HTTPS URLs are allowed." }
          }

          const host = parsedUrl.hostname.toLowerCase().replace(/^\[|\]$/g, "") // strip IPv6 brackets

          const isBlocked = (() => {
            // Loopback, unspecified, and local aliases
            if (host === "localhost" || host === "0.0.0.0" || host === "::1" || host === "::" || host === "0") {
              return true
            }
            if (host.endsWith(".internal") || host.endsWith(".local") || host.endsWith(".localhost")) {
              return true
            }
            // Decimal encoded IP (e.g. 2130706433)
            if (/^\d+$/.test(host)) {
              return true
            }
            // IPv4 Private & Link-Local Subnets (127.0.0.0/8, 10.0.0.0/8, 192.168.0.0/16, 169.254.0.0/16, 172.16.0.0/12)
            const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
            if (ipv4Match) {
              const [, b1Str, b2Str] = ipv4Match
              const b1 = Number(b1Str)
              const b2 = Number(b2Str)
              if (b1 === 127 || b1 === 10 || b1 === 0) return true
              if (b1 === 169 && b2 === 254) return true
              if (b1 === 192 && b2 === 168) return true
              if (b1 === 172 && b2 >= 16 && b2 <= 31) return true // RFC 1918 Class B
            }
            return false
          })()

          if (isBlocked) {
            return { success: false, message: "Target host is not permitted (private IP/metadata access blocked)." }
          }

          const controller = new AbortController()
          const timeout = setTimeout(() => controller.abort(), 8000)

          const response = await fetch(`https://r.jina.ai/${encodeURI(url)}`, {
            headers: {
              "X-Return-Format": "markdown",
            },
            signal: controller.signal,
          })
          clearTimeout(timeout)

          if (!response.ok) {
            return { success: false, message: `Failed to scrape URL. Upstream status: ${response.status}` }
          }
          const markdown = await response.text()
          const safeMarkdown = markdown.slice(0, 15000)
          return {
            success: true,
            markdown: safeMarkdown,
            message: `Successfully scraped ${url}. Content length: ${safeMarkdown.length} chars.`,
          }
        } catch (error) {
          const isTimeout = error instanceof Error && error.name === "AbortError"
          // silent
          return {
            success: false,
            message: isTimeout ? "Scraping URL timed out after 8 seconds." : "Failed to scrape URL due to network error.",
          }
        }
      },
    } as any),

    getResumeSummary: tool({
      description: "Fetch the user's default resume text content for cover letter generation or JD analysis.",
      parameters: z.object({}),
      execute: async () => {
        try {
          const resume = await withDbRetry(() =>
            prisma.resume.findFirst({
              where: { userId, isDefault: true },
              select: { title: true, fileName: true, textContent: true },
            })
          )
          if (!resume) {
            return { success: false, message: "No default resume found. Ask the user to upload one." }
          }
          return {
            success: true,
            title: resume.title,
            fileName: resume.fileName,
            textContent: resume.textContent || "No text content extracted from this resume.",
          }
        } catch (error) {
          // silent
          return { success: false, message: "Failed to fetch resume." }
        }
      },
    } as any),

    getPipelineStats: tool({
      description: "Get aggregated pipeline stats showing how many applications are in each status (Saved, Applied, Assessment, Interview, Rejected, Offer).",
      parameters: z.object({}),
      execute: async () => {
        try {
          const stats = await withDbRetry(() =>
            prisma.application.groupBy({
              by: ["status"],
              where: { userId },
              _count: true,
            })
          )
          const statsMap: Record<string, number> = {}
          stats.forEach((s) => { statsMap[s.status] = s._count })
          const total = Object.values(statsMap).reduce((a, b) => a + b, 0)
          
          const breakdownParts = [
            statsMap.Applied ? `${statsMap.Applied} Applied` : null,
            statsMap.Interview ? `${statsMap.Interview} Interview` : null,
            statsMap.Offer ? `${statsMap.Offer} Offer` : null,
            statsMap.Saved ? `${statsMap.Saved} Saved` : null,
            statsMap.Assessment ? `${statsMap.Assessment} Assessment` : null,
            statsMap.Rejected ? `${statsMap.Rejected} Rejected` : null,
          ].filter(Boolean)
          
          const breakdownStr = breakdownParts.join(", ")
          const message = total === 0
            ? "You currently have 0 tracked job applications in your career pipeline."
            : `You currently have **${total}** tracked job application${total === 1 ? "" : "s"} in your career pipeline${breakdownStr ? ` (${breakdownStr})` : ""}.\n\n- **Applied:** ${statsMap.Applied || 0}\n- **Interview:** ${statsMap.Interview || 0}\n- **Offer:** ${statsMap.Offer || 0}\n- **Saved:** ${statsMap.Saved || 0}\n- **Assessment:** ${statsMap.Assessment || 0}\n- **Rejected:** ${statsMap.Rejected || 0}`

          return {
            success: true,
            total,
            saved: statsMap.Saved || 0,
            applied: statsMap.Applied || 0,
            assessment: statsMap.Assessment || 0,
            interview: statsMap.Interview || 0,
            rejected: statsMap.Rejected || 0,
            offer: statsMap.Offer || 0,
            breakdown: statsMap,
            message,
          }
        } catch (error) {
          // silent
          return { success: false, message: "Failed to fetch pipeline stats." }
        }
      },
    } as any),

    listUserApplications: tool({
      description: "List the user's active tracked job applications with company names, job titles, statuses, and dates.",
      parameters: z.object({
        status: z.string().optional().describe("Optional status filter (e.g. 'Applied', 'Interview', 'Saved', 'Offer')"),
        limit: z.number().optional().default(10).describe("Maximum number of applications to return (default 10)"),
      }),
      execute: async (rawArgs: any) => {
        try {
          const args = parseToolArgs(rawArgs)
          const status = args?.status
          const limit = Math.min(args?.limit || 10, 25)

          const applications = await withDbRetry(() =>
            prisma.application.findMany({
              where: {
                userId,
                ...(status ? { status: { equals: status, mode: "insensitive" } } : {}),
              },
              orderBy: { updatedAt: "desc" },
              take: limit,
              select: {
                id: true,
                companyName: true,
                jobTitle: true,
                status: true,
                source: true,
                applicationDate: true,
                updatedAt: true,
              },
            })
          )

          const count = applications.length
          const formattedList = applications.map((a, idx) => 
            `${idx + 1}. **${a.companyName}** — *${a.jobTitle}* (${a.status})`
          ).join("\n")

          return {
            success: true,
            count,
            applications,
            message: count === 0
              ? "No applications found in your tracker."
              : `Found **${count}** application${count === 1 ? "" : "s"}:\n\n${formattedList}`,
          }
        } catch (error) {
          // silent
          return { success: false, message: "Failed to list applications." }
        }
      },
    } as any),

    draftOutreachEmail: tool({
      description: "Draft an outreach or follow-up email for a job application with recipient, subject, and customized body.",
      parameters: z.object({
        companyOrTitle: z.string().describe("Target company name or job title"),
        recipientEmail: z.string().optional().describe("Recipient email address e.g. recruiter@company.com"),
        subject: z.string().describe("Email subject line"),
        body: z.string().describe("Formatted email message body"),
        type: z.enum(["ColdOutreach", "FollowUp", "Application", "ThankYou"]).optional().default("ColdOutreach"),
      }),
      execute: async (rawArgs: any) => {
        try {
          const args = parseToolArgs(rawArgs)
          const companyOrTitle = cleanCompanyName(args?.companyOrTitle || args?.company || args?.companyName || "Target Company")
          const recipientEmail = args?.recipientEmail || "recruiter@example.com"
          const subject = args?.subject || `Application - ${companyOrTitle}`
          const body = args?.body || ""
          const type = args?.type || "ColdOutreach"

          const app = await withDbRetry(() =>
            prisma.application.findFirst({
              where: {
                userId,
                OR: [
                  { companyName: { contains: companyOrTitle, mode: "insensitive" } },
                  { jobTitle: { contains: companyOrTitle, mode: "insensitive" } },
                ],
              },
            })
          )

          return {
            success: true,
            isEmailDraft: true,
            applicationId: app?.id,
            companyName: app?.companyName || companyOrTitle,
            jobTitle: app?.jobTitle,
            recipientEmail,
            subject,
            body,
            type,
            message: `Drafted ${type} email for **${app?.companyName || companyOrTitle}**.\n\n**To:** ${recipientEmail}\n**Subject:** ${subject}\n\n${body}`,
          }
        } catch (error) {
          // silent
          return { success: false, message: "Failed to draft outreach email." }
        }
      },
    } as any),

    saveUserMemory: tool({
      description: "Persist an explicit user preference, skill, career constraint, or key fact across all future sessions (e.g. 'Prefers remote work in APAC', 'Notice period is 30 days', 'Target salary 120k USD').",
      parameters: z.object({
        category: z.enum(["preference", "skill", "experience", "constraint", "general"]).describe("The category of the memory"),
        content: z.string().describe("The concise factual statement to remember"),
      }),
      execute: async (rawArgs: any) => {
        try {
          const args = parseToolArgs(rawArgs)
          const category = args?.category || "general"
          const content = args?.content || ""

          if (!content) {
            return { success: false, message: "Memory content is required." }
          }

          // Prevent exact duplicate memories
          const existing = await withDbRetry<{ id: string; content: string } | null>(() =>
            prisma.userMemory.findFirst({
              where: {
                userId,
                content: { equals: content, mode: "insensitive" },
              },
            })
          )

          if (existing) {
            return {
              success: true,
              memoryId: existing.id,
              message: `Memory already retained: "${content}"`,
            }
          }

          // Generate embedding for semantic search
          let embedding: string | null = null
          try {
            const embeddingVector = await generateEmbedding(content)
            embedding = serializeEmbedding(embeddingVector)
          } catch {
            // Embedding generation failed, continue without it
          }

          const memory = await withDbRetry<{ id: string; category: string; content: string }>(() =>
            prisma.userMemory.create({
              data: {
                userId,
                category,
                content,
                embedding,
                source: "chat",
              },
            })
          )

          // Invalidate Redis cache
          void invalidateCache(`user:memories:${userId}`)

          return {
            success: true,
            memoryId: memory.id,
            category: memory.category,
            content: memory.content,
            message: `Memory saved: "${content}" (Category: ${category})`,
          }
        } catch (error) {
          // silent
          return { success: false, message: "Failed to save user memory." }
        }
      },
    } as any),

    forgetUserMemory: tool({
      description: "Remove or forget an outdated user memory/preference when instructed by the user.",
      parameters: z.object({
        searchQuery: z.string().describe("Keyword or phrase in the memory to delete"),
      }),
      execute: async (rawArgs: any) => {
        try {
          const args = parseToolArgs(rawArgs)
          const searchQuery = args?.searchQuery || args?.query || ""

          if (!searchQuery) {
            return { success: false, message: "Search query is required to forget a memory." }
          }

          const matching = await withDbRetry<{ id: string; content: string } | null>(() =>
            prisma.userMemory.findFirst({
              where: {
                userId,
                OR: [
                  { content: { contains: searchQuery, mode: "insensitive" } },
                  { category: { contains: searchQuery, mode: "insensitive" } },
                ],
              },
            })
          )

          if (!matching) {
            return {
              success: false,
              message: `No memory found matching "${searchQuery}".`,
            }
          }

          await withDbRetry(() =>
            prisma.userMemory.delete({
              where: { id: matching.id },
            })
          )

          // Invalidate Redis cache
          void invalidateCache(`user:memories:${userId}`)

          return {
            success: true,
            deletedContent: matching.content,
            message: `Successfully forgot memory: "${matching.content}"`,
          }
        } catch (error) {
          // silent
          return { success: false, message: "Failed to forget user memory." }
        }
      },
    } as any),

    getUserMemories: tool({
      description: "Retrieve all persistent facts and preferences the AI has stored about this user.",
      parameters: z.object({
        category: z.enum(["preference", "skill", "experience", "constraint", "general"]).optional().describe("Optional filter by category"),
      }),
      execute: async (rawArgs: any) => {
        try {
          const args = parseToolArgs(rawArgs)
          const category = args?.category

          const whereClause: any = { userId }
          if (category) whereClause.category = category

          const memories = await withDbRetry<Array<{ id: string; category: string; content: string; createdAt: Date }>>(() =>
            prisma.userMemory.findMany({
              where: whereClause,
              orderBy: { createdAt: "desc" },
            })
          )

          const formattedList = memories.map((m, idx) =>
            `${idx + 1}. [${m.category}] ${m.content}`
          ).join("\n")

          return {
            success: true,
            count: memories.length,
            memories: memories.map((m) => ({
              id: m.id,
              category: m.category,
              content: m.content,
              createdAt: m.createdAt,
            })),
            message: memories.length === 0
              ? "No saved user memories found."
              : `Found **${memories.length}** saved preference${memories.length === 1 ? "" : "s"}:\n\n${formattedList}`,
          }
        } catch (error) {
          // silent
          return { success: false, message: "Failed to fetch user memories." }
        }
      },
    } as any),

    queryCareerKnowledgeGraph: tool({
      description: "Traverse user's Career Knowledge Graph to semantically find projects, skills, and quantifiable metrics matching a target role or technical query without vector embeddings.",
      parameters: z.object({
        query: z.string().describe("Target skills, job requirements, or technology to match (e.g. 'Go distributed systems, Kafka, Redis')"),
        requiredSkills: z.array(z.string()).optional().describe("Optional list of specific required skills to check"),
      }),
      execute: async (rawArgs: any) => {
        try {
          const args = parseToolArgs(rawArgs)
          const query = args?.query || ""
          const requiredSkills = Array.isArray(args?.requiredSkills) ? args.requiredSkills : undefined

          let graph = await getCachedKnowledgeGraph(userId)

          if (!graph) {
            // Auto-build from default resume and profile if not yet generated
            const [resume, profile] = await Promise.all([
              withDbRetry(() => prisma.resume.findFirst({ where: { userId, isDefault: true } })),
              withDbRetry(() => prisma.userProfile.findUnique({ where: { userId } })),
            ])

            const rawText = (resume?.textContent || "") + "\n" + (profile?.strengths || "")
            graph = buildCareerGraphFromText(rawText, profile)
            await saveKnowledgeGraph(userId, graph)
          }

          const matchResult = traverseGraphForJD(graph, query, requiredSkills)

          return {
            success: true,
            matchScore: matchResult.matchScore,
            matchedSkillsCount: matchResult.matchedSkills.length,
            matchedSkills: matchResult.matchedSkills,
            missingSkills: matchResult.missingSkills,
            evidencePaths: matchResult.evidencePaths,
            message: `Career Knowledge Graph analysis: **${matchResult.matchScore}% Match Score**.\n\n- **Matched Skills (${matchResult.matchedSkills.length}):** ${matchResult.matchedSkills.join(", ") || "None"}\n- **Missing Skills (${matchResult.missingSkills.length}):** ${matchResult.missingSkills.join(", ") || "None"}`,
          }
        } catch (error) {
          // silent
          return { success: false, message: "Failed to query Career Knowledge Graph." }
        }
      },
    } as any),

    syncCareerKnowledgeGraph: tool({
      description: "Re-extract and synchronize the user's structured Career Knowledge Graph from their latest resume and profile.",
      parameters: z.object({}),
      execute: async () => {
        try {
          const [resume, profile] = await Promise.all([
            withDbRetry(() => prisma.resume.findFirst({ where: { userId, isDefault: true } })),
            withDbRetry(() => prisma.userProfile.findUnique({ where: { userId } })),
          ])

          const rawText = (resume?.textContent || "") + "\n" + (profile?.strengths || "")
          const graph = buildCareerGraphFromText(rawText, profile)
          await saveKnowledgeGraph(userId, graph)

          return {
            success: true,
            nodeCount: graph.nodes.length,
            edgeCount: graph.edges.length,
            summary: graph.summary,
            message: `Career Knowledge Graph synchronized: **${graph.nodes.length} nodes**, **${graph.edges.length} relationships**.`,
          }
        } catch (error) {
          // silent
          return { success: false, message: "Failed to sync Career Knowledge Graph." }
        }
      },
    } as any),

    savePrepNote: tool({
      description: "Save interview preparation notes, company research, or talking points to the user's prep workspace.",
      parameters: z.object({
        title: z.string().describe("Title of the note e.g. 'Stripe System Design' or 'Amazon Behavioral STAR Stories'"),
        category: z.string().describe("Category e.g. Technical, Behavioral, Company Research, System Design"),
        content: z.string().describe("Detailed content of the note"),
        companyName: z.string().optional().describe("Optional company name to link this note to an existing application"),
      }),
      execute: async (rawArgs: any) => {
        try {
          const args = parseToolArgs(rawArgs)
          const title = args?.title || "Interview Prep Note"
          const category = args?.category || "Technical"
          const content = args?.content || ""
          const companyName = args?.companyName ? cleanCompanyName(args.companyName) : null

          let applicationId: string | null = null
          if (companyName) {
            const app = await withDbRetry(() =>
              prisma.application.findFirst({
                where: {
                  userId,
                  companyName: { contains: companyName, mode: "insensitive" },
                },
              })
            )
            if (app) applicationId = app.id
          }

          const note = await withDbRetry(() =>
            prisma.prepNote.create({
              data: {
                userId,
                title,
                category,
                content,
                applicationId,
              },
            })
          )

          return {
            success: true,
            noteId: note.id,
            title: note.title,
            category: note.category,
            message: `Saved prep note "**${title}**" under *${category}*.`,
          }
        } catch (error) {
          // silent
          return { success: false, message: "Failed to save prep note." }
        }
      },
    } as any),

    recordMockInterviewScore: tool({
      description: "Record and persist a live mock interview evaluation, STAR rating, feedback, and score for career tracking.",
      parameters: z.object({
        roleOrTopic: z.string().describe("Role or topic tested e.g. 'Frontend Engineer - React Performance' or 'Backend - Distributed Systems'"),
        scoreOutOfTen: z.number().min(1).max(10).describe("Overall STAR score out of 10"),
        strengths: z.array(z.string()).describe("Key strengths observed in the response"),
        improvements: z.array(z.string()).describe("Specific areas to improve"),
        sampleHighScoringAnswer: z.string().optional().describe("Exemplary model answer"),
      }),
      execute: async (rawArgs: any) => {
        try {
          const args = parseToolArgs(rawArgs)
          const roleOrTopic = args?.roleOrTopic || "Technical Mock Interview"
          const scoreOutOfTen = Math.min(Math.max(Number(args?.scoreOutOfTen) || 7, 1), 10)
          const strengths: string[] = Array.isArray(args?.strengths) ? args.strengths : []
          const improvements: string[] = Array.isArray(args?.improvements) ? args.improvements : []
          const sampleHighScoringAnswer = args?.sampleHighScoringAnswer

          const content = `### Mock Interview Evaluation: ${roleOrTopic}\n\n**Score:** ${scoreOutOfTen}/10\n\n**Strengths:**\n${strengths.map((s) => `- ${s}`).join("\n")}\n\n**Areas for Improvement:**\n${improvements.map((i) => `- ${i}`).join("\n")}${sampleHighScoringAnswer ? `\n\n**Model Answer:**\n${sampleHighScoringAnswer}` : ""}`
          
          const note = await withDbRetry(() =>
            prisma.prepNote.create({
              data: {
                userId,
                title: `Mock Evaluation: ${roleOrTopic} (${scoreOutOfTen}/10)`,
                category: "Mock Evaluation",
                content,
              },
            })
          )

          return {
            success: true,
            score: scoreOutOfTen,
            noteId: note.id,
            message: `Saved mock interview evaluation for **${roleOrTopic}** with score **${scoreOutOfTen}/10** to prep notes.`,
          }
        } catch (error) {
          // silent
          return { success: false, message: "Failed to save mock interview score." }
        }
      },
    } as any),

    tailorResumeForJob: tool({
      description: "Generate a targeted, high-impact ATS single-column resume tailored to a specific job description using the user's Career Knowledge Graph.",
      parameters: z.object({
        companyName: z.string().describe("Target company name"),
        jobTitle: z.string().describe("Target job title"),
        jobDescription: z.string().describe("Job description or requirements text"),
      }),
      execute: async (rawArgs: any) => {
        try {
          const args = parseToolArgs(rawArgs)
          const companyName = cleanCompanyName(args?.companyName || args?.company || "Company")
          const jobTitle = cleanJobTitle(args?.jobTitle || args?.role || "Software Engineer")
          const jobDescription = args?.jobDescription || args?.description || ""

          let graph = await getCachedKnowledgeGraph(userId)
          if (!graph) {
            const [resume, profile] = await Promise.all([
              withDbRetry(() => prisma.resume.findFirst({ where: { userId, isDefault: true } })),
              withDbRetry(() => prisma.userProfile.findUnique({ where: { userId } })),
            ])
            const rawText = (resume?.textContent || "") + "\n" + (profile?.strengths || "")
            graph = buildCareerGraphFromText(rawText, profile)
            await saveKnowledgeGraph(userId, graph)
          }

          const matchResult = traverseGraphForJD(graph, jobDescription)

          return {
            success: true,
            companyName,
            jobTitle,
            matchScore: matchResult.matchScore,
            tailoredHighlights: matchResult.evidencePaths.slice(0, 5),
            matchedSkills: matchResult.matchedSkills,
            missingSkills: matchResult.missingSkills,
            message: `Analyzed resume alignment for **${companyName}** (${jobTitle}) with **${matchResult.matchScore}% ATS match score**. Found ${matchResult.matchedSkills.length} matching skills.`,
          }
        } catch (error) {
          // silent
          return { success: false, message: "Failed to generate tailored resume payload." }
        }
      },
    } as any),

    researchCompanyIntel: tool({
      description: "Perform autonomous deep company intelligence research: store industry, tech stack, company background notes, and interview insights.",
      parameters: z.object({
        companyName: z.string().optional().describe("Target company name (e.g. 'Stripe')"),
        industry: z.string().optional().describe("Industry or sector (e.g. Fintech, Cloud Infrastructure, AI)"),
        techStack: z.array(z.string()).optional().describe("Known engineering technologies used by the company"),
        interviewStyleNotes: z.string().optional().describe("Interview style notes e.g. 'Values system design and clean code'"),
        websiteUrl: z.string().optional().describe("Company website URL"),
      }),
      execute: async (rawArgs: any) => {
        try {
          const args = parseToolArgs(rawArgs)
          let finalCompany = cleanCompanyName(
            args?.companyName ||
            args?.company ||
            args?.companyOrTitle ||
            args?.name ||
            ""
          )

          // If still no company, try to extract from reason or query fields
          if (!finalCompany) {
            const searchStr = args?.reason || args?.query || args?.input || args?.text || ""
            if (searchStr) {
              const extracted = extractCompanyAndRole(searchStr)
              if (extracted.company) {
                finalCompany = extracted.company
              } else {
                // Try extracting company name from natural language like "Stripe's tech stack"
                // Pattern: "Company's ..." or "Company ..."
                const naturalMatch = searchStr.match(/^([A-Za-z0-9\s._&]+?)(?:'s?\s|[\s,]+(?:tech|engineering|culture|stack|interview|background|research|intel))/i)
                if (naturalMatch && naturalMatch[1]) {
                  finalCompany = cleanCompanyName(naturalMatch[1])
                }
              }
            }
          }

          // Fallback: If no company provided or generic, find from the user's latest application
          if (!finalCompany) {
            const latestApp = await withDbRetry(() =>
              prisma.application.findFirst({
                where: { userId },
                orderBy: { updatedAt: "desc" },
              })
            )
            if (latestApp?.companyName) {
              finalCompany = latestApp.companyName
            }
          }

          if (!finalCompany) {
            return {
              success: false,
              message: "Company name is required to research intelligence.",
            }
          }

          const industry = args?.industry || "Technology"
          const techStack: string[] = Array.isArray(args?.techStack)
            ? args.techStack
            : typeof args?.techStack === "string"
            ? args.techStack.split(",").map((s: string) => s.trim()).filter(Boolean)
            : []
          const interviewStyleNotes = args?.interviewStyleNotes || args?.notes || ""
          const websiteUrl = args?.websiteUrl || args?.website || null

          const company = await withDbRetry(() =>
            prisma.company.upsert({
              where: { userId_name: { userId, name: finalCompany } },
              update: {
                industry: industry || undefined,
                website: websiteUrl || undefined,
                notes: interviewStyleNotes || undefined,
              },
              create: {
                userId,
                name: finalCompany,
                industry: industry || null,
                website: websiteUrl || null,
                notes: interviewStyleNotes || null,
              },
            })
          )

          const content = `### Company Intel: ${finalCompany}\n\n**Industry:** ${industry}\n${techStack.length > 0 ? `**Tech Stack:** ${techStack.join(", ")}\n` : ""}${interviewStyleNotes ? `\n**Interview & Culture Insights:**\n${interviewStyleNotes}` : ""}`
          
          await withDbRetry(() =>
            prisma.prepNote.create({
              data: {
                userId,
                title: `Intel: ${finalCompany}`,
                category: "Company Research",
                content,
              },
            })
          )

          return {
            success: true,
            companyId: company.id,
            companyName: finalCompany,
            industry,
            techStack,
            interviewStyleNotes,
            message: `Successfully researched and stored intelligence for ${finalCompany}. Industry: ${industry}.`,
          }
        } catch (error) {
          // silent
          return { success: false, message: "Failed to store company intel." }
        }
      },
    } as any),

    sendOutreachEmailViaResend: tool({
      description: "Dispatch a drafted outreach or follow-up email to a recruiter/hiring manager via Resend (with safe development simulation).",
      parameters: z.object({
        recipientEmail: z.string().email().describe("Recruiter or hiring manager's email address"),
        candidateName: z.string().describe("Candidate's full name"),
        companyName: z.string().describe("Target company name"),
        jobTitle: z.string().describe("Target role title"),
        subject: z.string().describe("Email subject line"),
        bodyText: z.string().describe("Body text of the cold email or follow-up note"),
        confirmed: z.boolean().optional().describe("Internal flag for HITL confirmation"),
      }),
      execute: async (rawArgs: any) => {
        try {
          let args = parseToolArgs(rawArgs)
          args = await resolveHITLArgs(args, sessionId)

          // HITL confirmation check
          if (requiresConfirmation("sendOutreachEmailViaResend") && !args?.confirmed) {
            const recipient = args?.recipientEmail || args?.to || "unknown"
            const subject = args?.subject || "no subject"
            return {
              success: false,
              requiresConfirmation: true,
              message: `⚠️ Confirm send: Send email to "${recipient}" with subject "${subject}"?`,
              toolName: "sendOutreachEmailViaResend",
              args,
            }
          }

          const recipientEmail = args?.recipientEmail || args?.to || "recruiter@example.com"
          const candidateName = args?.candidateName || "Candidate"
          const companyName = cleanCompanyName(args?.companyName || args?.company || "Company")
          const jobTitle = cleanJobTitle(args?.jobTitle || args?.role || "Software Engineer")
          const subject = args?.subject || `Application for ${jobTitle} - ${candidateName}`
          const bodyText = args?.bodyText || args?.body || ""

          const html = formatOutreachEmailHtml({
            candidateName,
            companyName,
            jobTitle,
            bodyText,
          })

          const sendResult = await sendEmail({
            to: recipientEmail,
            subject,
            html,
            text: bodyText,
          })

          if (!sendResult.success) {
            return {
              success: false,
              message: sendResult.error || "Failed to deliver email.",
            }
          }

          return {
            success: true,
            emailId: sendResult.id,
            recipient: recipientEmail,
            simulated: Boolean(sendResult.simulated),
            message: sendResult.simulated
              ? `[Development Mode] Simulated email delivery to **${recipientEmail}** (${subject}).`
              : `Successfully sent email to **${recipientEmail}**.`,
          }
        } catch (error) {
          // silent
          return { success: false, message: "Failed to dispatch outreach email." }
        }
      },
    } as any),

    batchImportApplications: tool({
      description: "Batch import multiple job applications at once from a table, list, or spreadsheet into the user's tracker.",
      parameters: z.object({
        applications: z.array(
          z.object({
            companyName: z.string().describe("Company name"),
            jobTitle: z.string().describe("Job title"),
            status: z.enum(["Saved", "Applied", "Assessment", "Interview", "Rejected", "Offer"]).optional().default("Saved"),
            source: z.string().optional().default("Bulk Import"),
            notes: z.string().optional(),
          })
        ).describe("List of applications to import"),
        confirmed: z.boolean().optional().describe("Internal flag for HITL confirmation"),
      }),
      execute: async (rawArgs: any) => {
        try {
          const args = parseToolArgs(rawArgs)

          // HITL confirmation check
          if (requiresConfirmation("batchImportApplications") && !args?.confirmed) {
            const count = Array.isArray(args?.applications) ? args.applications.length : 0
            return {
              success: false,
              requiresConfirmation: true,
              message: `⚠️ Confirm batch import: Import ${count} application(s)?`,
              toolName: "batchImportApplications",
              args,
            }
          }

          const applications = Array.isArray(args?.applications) ? args.applications : []

          if (applications.length === 0) {
            return { success: false, message: "No applications provided for batch import." }
          }

          const created = await withDbRetry(async () => {
            const results = []
            for (const app of applications) {
              const comp = cleanCompanyName(app.companyName || app.company || "")
              const title = cleanJobTitle(app.jobTitle || app.role || "")
              if (!comp || !title) continue

              const existing = await prisma.application.findFirst({
                where: {
                  userId,
                  companyName: { equals: comp, mode: "insensitive" },
                  jobTitle: { equals: title, mode: "insensitive" },
                },
              })
              if (existing) continue

              const newApp = await prisma.application.create({
                data: {
                  userId,
                  companyName: comp,
                  jobTitle: title,
                  status: app.status || "Saved",
                  source: app.source || "Bulk Import",
                  notes: app.notes || null,
                  applicationDate: new Date(),
                  statusChanges: { create: { toStatus: app.status || "Saved" } },
                },
              })
              results.push(newApp)
            }
            return results
          })

          void invalidateCache(`user:pipeline-stats:${userId}`)
          void invalidateCache(`user:stats:${userId}`)
          void invalidateCache(`user:applications:${userId}`)

          // Fire non-blocking auto-sync to Google Sheets
          void syncApplicationsToGoogleSheets(
            userId,
            created.map((a) => ({
              id: a.id,
              companyName: a.companyName,
              jobTitle: a.jobTitle,
              status: a.status,
              source: a.source,
              applicationDate: a.applicationDate,
              jobUrl: a.jobUrl,
              notes: a.notes,
            }))
          )

          return {
            success: true,
            importedCount: created.length,
            applications: created.map((a) => ({
              id: a.id,
              companyName: a.companyName,
              jobTitle: a.jobTitle,
              status: a.status,
            })),
            message: `Successfully imported **${created.length}** applications into your tracker.`,
          }
        } catch (error) {
          // silent
          return { success: false, message: "Failed to batch import applications." }
        }
      },
    } as any),

    syncToGoogleSheets: tool({
      description: "Synchronize all or recent job applications from the user's tracker to their connected Google Sheet spreadsheet.",
      parameters: z.object({}),
      execute: async () => {
        try {
          const config = await getGoogleSheetsConfig(userId)
          if (!config || !config.webhookUrl) {
            return {
              success: false,
              message: "Google Sheets is not configured yet. Please add your Google Sheet Webhook URL in Settings.",
            }
          }

          const applications = await withDbRetry(() =>
            prisma.application.findMany({
              where: { userId },
              orderBy: { applicationDate: "desc" },
            })
          )

          if (applications.length === 0) {
            return {
              success: true,
              count: 0,
              message: "No applications to sync in tracker.",
            }
          }

          const syncResult = await syncApplicationsToGoogleSheets(
            userId,
            applications.map((app) => ({
              id: app.id,
              companyName: app.companyName,
              jobTitle: app.jobTitle,
              status: app.status,
              source: app.source,
              applicationDate: app.applicationDate,
              jobUrl: app.jobUrl,
              notes: app.notes,
            }))
          )

          if (!syncResult.success) {
            return {
              success: false,
              message: syncResult.error || "Failed to sync to Google Sheet.",
            }
          }

          return {
            success: true,
            count: syncResult.count,
            message: `Successfully synced ${syncResult.count} applications to your Google Sheet!`,
          }
        } catch (error) {
          // silent
          return { success: false, message: "Failed to execute Google Sheet synchronization." }
        }
      },
    } as any),
  }
}
