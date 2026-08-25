/* eslint-disable @typescript-eslint/no-explicit-any */
import { tool } from "ai"
import { z } from "zod"
import { prisma, withDbRetry } from "@/lib/prisma"
import { invalidateCache } from "@/lib/redis"
import {
  buildCareerGraphFromText,
  traverseGraphForJD,
  getCachedKnowledgeGraph,
  saveKnowledgeGraph,
} from "@/lib/ai/knowledge-graph"
import { sendEmail, formatOutreachEmailHtml } from "@/lib/email"
import { syncApplicationsToGoogleSheets, getGoogleSheetsConfig } from "@/lib/google-sheets"

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

export function createAiTools(userId: string) {
  return {
    updateApplicationStatus: tool({
      description: "Update the status of an existing application (e.g. from Applied to Interview or Rejected) ONLY when the user explicitly asks to change or update status.",
      parameters: z.object({
        companyOrTitle: z.string().optional().describe("The company name or job title to find the application"),
        company: z.string().optional().describe("Alias for companyOrTitle"),
        companyName: z.string().optional().describe("Alias for companyOrTitle"),
        jobTitle: z.string().optional().describe("Alias for companyOrTitle"),
        title: z.string().optional().describe("Alias for companyOrTitle"),
        role: z.string().optional().describe("Alias for companyOrTitle"),
        newStatus: z.string().optional().describe("The new status: Saved, Applied, Assessment, Interview, Rejected, Offer"),
        status: z.string().optional().describe("Alias for newStatus"),
        reason: z.string().optional().describe("Reason or natural description of the status change"),
        notes: z.string().optional().describe("Optional note or update reason"),
      }),
      execute: async (rawArgs: any) => {
        try {
          const args = parseToolArgs(rawArgs)
          console.log("\n[AI Tool: updateApplicationStatus] Executing with raw args:", rawArgs)
          console.log("[AI Tool: updateApplicationStatus] Parsed args:", args)

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
            console.log("[AI Tool: updateApplicationStatus] Finding most recent application for fallback update...")
            app = await withDbRetry(() =>
              prisma.application.findFirst({
                where: { userId },
                orderBy: { updatedAt: "desc" },
              })
            )
          }

          if (!app) {
            console.warn(`[AI Tool: updateApplicationStatus] No application found in tracker to update.`)
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

          console.log(`[AI Tool: updateApplicationStatus] SUCCESS: Updated ${app.companyName} (${app.jobTitle}) to ${newStatus}`)
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
          console.error("updateApplicationStatus tool error:", error)
          return { success: false, message: "Failed to update application status." }
        }
      },
    } as any),

    createApplication: tool({
      description: "Create a new job application entry in the user's tracker when the user asks to add, save, log, track, or record an application.",
      parameters: z.object({
        companyName: z.string().optional().describe("The exact name of the company, e.g. 'Stripe', 'Google', 'Amazon'"),
        company: z.string().optional().describe("Alias for companyName"),
        jobTitle: z.string().optional().describe("The exact job title or role, e.g. 'Senior Backend Engineer', 'Frontend Developer'"),
        title: z.string().optional().describe("Alias for jobTitle"),
        role: z.string().optional().describe("Alias for jobTitle"),
        position: z.string().optional().describe("Alias for jobTitle"),
        status: z.string().optional().describe("The application status: Saved, Applied, Assessment, Interview, Rejected, Offer"),
        reason: z.string().optional().describe("Reason or natural description of the application"),
        jobUrl: z.string().optional().describe("Optional URL to the job listing"),
        source: z.string().optional().describe("Source platform e.g. LinkedIn, Indeed, BDJobs"),
        notes: z.string().optional().describe("Initial notes about the role"),
      }),
      execute: async (rawArgs: any) => {
        try {
          const args = parseToolArgs(rawArgs)
          console.log("\n[AI Tool: createApplication] Executing with raw args:", rawArgs)
          console.log("[AI Tool: createApplication] Parsed args:", args)

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

          console.log("[AI Tool: createApplication] Extracted payload:", {
            finalCompany,
            finalTitle,
            status,
            source,
          })

          if (!finalCompany || !finalTitle) {
            console.warn("[AI Tool: createApplication] FAILED: Missing company or title:", { finalCompany, finalTitle })
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
            message: `✅ **Successfully Tracked:** Added **${finalCompany}** — *${finalTitle}* in **${status || "Saved"}** status.\n\n- **Company:** ${finalCompany}\n- **Role:** ${finalTitle}\n- **Status:** ${status || "Saved"}\n- **Date:** ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}\n\n[Open Application Details →](/applications/${newApp.id})\n\nWould you like me to draft an outreach email, analyze the requirements, or prepare a tailored cover letter?`,
          }
        } catch (error) {
          console.error("createApplication tool error:", error)
          return { success: false, message: "Failed to create application in database." }
        }
      },
    } as any),

    deleteApplication: tool({
      description: "Delete or remove an application from the user's tracker by company name or job title.",
      parameters: z.object({
        companyOrTitle: z.string().describe("Company name or job title of the application to remove"),
      }),
      execute: async (rawArgs: any) => {
        try {
          const companyOrTitle = (
            rawArgs?.companyOrTitle ||
            rawArgs?.companyName ||
            rawArgs?.company ||
            rawArgs?.jobTitle ||
            rawArgs?.title ||
            rawArgs?.role ||
            ""
          ).trim()

          if (!companyOrTitle) {
            return {
              success: false,
              message: "Company name or job title is required to delete an application.",
            }
          }

          const app = await withDbRetry(() =>
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

          if (!app) {
            return {
              success: false,
              message: `Could not find an application matching "${companyOrTitle}".`,
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
            message: `Successfully deleted application for ${app.companyName} (${app.jobTitle}).`,
          }
        } catch (error) {
          console.error("deleteApplication tool error:", error)
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
      execute: async ({
        goal1,
        goal2,
        goal3,
      }: {
        goal1: string
        goal2?: string
        goal3?: string
      }) => {
        try {
          const now = new Date()
          const weekStart = new Date(now)
          weekStart.setDate(now.getDate() - now.getDay() + 1)
          weekStart.setHours(0, 0, 0, 0)

          const goal = await withDbRetry(() =>
            prisma.weeklyGoal.upsert({
              where: { userId_weekStart: { userId, weekStart } },
              update: {
                goal1,
                goal2: goal2 || null,
                goal3: goal3 || null,
              },
              create: {
                userId,
                weekStart,
                goal1,
                goal2: goal2 || null,
                goal3: goal3 || null,
              },
            })
          )

          return {
            success: true,
            goalId: goal.id,
            message: `Updated weekly goals for week starting ${weekStart.toLocaleDateString()}.`,
          }
        } catch (error) {
          console.error("setWeeklyGoals tool error:", error)
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
      execute: async ({
        category,
        questions,
      }: {
        category: string
        questions: Array<{ question: string; suggestedAnswer?: string; difficulty?: "Easy" | "Medium" | "Hard" }>
      }) => {
        try {
          await withDbRetry(() =>
            prisma.prepQuestion.createMany({
              data: questions.map((q) => ({
                userId,
                category,
                question: q.question,
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
          console.error("addPrepQuestions tool error:", error)
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
      execute: async ({ query, status, limit = 10 }: { query?: string; status?: any; limit?: number }) => {
        try {
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
          return { success: true, count: apps.length, applications: apps }
        } catch (error) {
          console.error("searchApplications tool error:", error)
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
      execute: async ({ query, category }: { query?: string; category?: string }) => {
        try {
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
          return { success: true, count: notes.length, notes }
        } catch (error) {
          console.error("getPrepNotes tool error:", error)
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
          console.error("scrapeJobLink tool error:", error)
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
          console.error("getResumeSummary tool error:", error)
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
          return {
            success: true,
            total,
            saved: statsMap.Saved || 0,
            applied: statsMap.Applied || 0,
            assessment: statsMap.Assessment || 0,
            interview: statsMap.Interview || 0,
            rejected: statsMap.Rejected || 0,
            offer: statsMap.Offer || 0,
          }
        } catch (error) {
          console.error("getPipelineStats tool error:", error)
          return { success: false, message: "Failed to fetch pipeline stats." }
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
      execute: async ({
        companyOrTitle,
        recipientEmail,
        subject,
        body,
        type = "ColdOutreach",
      }: {
        companyOrTitle: string
        recipientEmail?: string
        subject: string
        body: string
        type?: "ColdOutreach" | "FollowUp" | "Application" | "ThankYou"
      }) => {
        try {
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
            recipientEmail: recipientEmail || "recruiter@example.com",
            subject,
            body,
            type,
            message: `Drafted ${type} email for ${app?.companyName || companyOrTitle}. You can review and approve it.`,
          }
        } catch (error) {
          console.error("draftOutreachEmail tool error:", error)
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
      execute: async ({
        category,
        content,
      }: {
        category: "preference" | "skill" | "experience" | "constraint" | "general"
        content: string
      }) => {
        try {
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

          const memory = await withDbRetry<{ id: string; category: string; content: string }>(() =>
            prisma.userMemory.create({
              data: {
                userId,
                category,
                content,
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
            message: `Memory saved: "${content}"`,
          }
        } catch (error) {
          console.error("saveUserMemory tool error:", error)
          return { success: false, message: "Failed to save user memory." }
        }
      },
    } as any),

    forgetUserMemory: tool({
      description: "Remove or forget an outdated user memory/preference when instructed by the user.",
      parameters: z.object({
        searchQuery: z.string().describe("Keyword or phrase in the memory to delete"),
      }),
      execute: async ({ searchQuery }: { searchQuery: string }) => {
        try {
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
          console.error("forgetUserMemory tool error:", error)
          return { success: false, message: "Failed to forget user memory." }
        }
      },
    } as any),

    getUserMemories: tool({
      description: "Retrieve all persistent facts and preferences the AI has stored about this user.",
      parameters: z.object({
        category: z.enum(["preference", "skill", "experience", "constraint", "general"]).optional().describe("Optional filter by category"),
      }),
      execute: async ({ category }: { category?: string }) => {
        try {
          const whereClause: any = { userId }
          if (category) whereClause.category = category

          const memories = await withDbRetry<Array<{ id: string; category: string; content: string; createdAt: Date }>>(() =>
            prisma.userMemory.findMany({
              where: whereClause,
              orderBy: { createdAt: "desc" },
            })
          )

          return {
            success: true,
            count: memories.length,
            memories: memories.map((m) => ({
              id: m.id,
              category: m.category,
              content: m.content,
              createdAt: m.createdAt,
            })),
          }
        } catch (error) {
          console.error("getUserMemories tool error:", error)
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
      execute: async ({ query, requiredSkills }: { query: string; requiredSkills?: string[] }) => {
        try {
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
          }
        } catch (error) {
          console.error("queryCareerKnowledgeGraph error:", error)
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
            message: `Knowledge Graph synchronized: ${graph.nodes.length} nodes, ${graph.edges.length} relationships.`,
          }
        } catch (error) {
          console.error("syncCareerKnowledgeGraph error:", error)
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
      execute: async ({ title, category, content, companyName }: { title: string; category: string; content: string; companyName?: string }) => {
        try {
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
            message: `Saved prep note "${title}" under ${category}.`,
          }
        } catch (error) {
          console.error("savePrepNote tool error:", error)
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
      execute: async ({ roleOrTopic, scoreOutOfTen, strengths, improvements, sampleHighScoringAnswer }: {
        roleOrTopic: string
        scoreOutOfTen: number
        strengths: string[]
        improvements: string[]
        sampleHighScoringAnswer?: string
      }) => {
        try {
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
            message: `Saved mock interview evaluation (${scoreOutOfTen}/10) to prep notes.`,
          }
        } catch (error) {
          console.error("recordMockInterviewScore tool error:", error)
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
      execute: async ({ companyName, jobTitle, jobDescription }: { companyName: string; jobTitle: string; jobDescription: string }) => {
        try {
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
            message: `Analyzed graph for ${companyName} (${jobTitle}) with ${matchResult.matchScore}% ATS match score.`,
          }
        } catch (error) {
          console.error("tailorResumeForJob tool error:", error)
          return { success: false, message: "Failed to generate tailored resume payload." }
        }
      },
    } as any),

    researchCompanyIntel: tool({
      description: "Perform autonomous deep company intelligence research: store industry, tech stack, company background notes, and interview insights.",
      parameters: z.object({
        companyName: z.string().describe("Target company name"),
        industry: z.string().optional().describe("Industry or sector (e.g. Fintech, Cloud Infrastructure, AI)"),
        techStack: z.array(z.string()).optional().describe("Known engineering technologies used by the company"),
        interviewStyleNotes: z.string().optional().describe("Interview style notes e.g. 'Values system design and clean code'"),
        websiteUrl: z.string().optional().describe("Company website URL"),
      }),
      execute: async ({
        companyName,
        industry,
        techStack,
        interviewStyleNotes,
        websiteUrl,
      }: {
        companyName: string
        industry?: string
        techStack?: string[]
        interviewStyleNotes?: string
        websiteUrl?: string
      }) => {
        try {
          const company = await withDbRetry(() =>
            prisma.company.upsert({
              where: { userId_name: { userId, name: companyName } },
              update: {
                industry: industry || undefined,
                website: websiteUrl || undefined,
                notes: interviewStyleNotes || undefined,
              },
              create: {
                userId,
                name: companyName,
                industry: industry || null,
                website: websiteUrl || null,
                notes: interviewStyleNotes || null,
              },
            })
          )

          const content = `### Company Intel: ${companyName}\n\n**Industry:** ${industry || "Technology"}\n${techStack && techStack.length > 0 ? `**Tech Stack:** ${techStack.join(", ")}\n` : ""}${interviewStyleNotes ? `\n**Interview & Culture Insights:**\n${interviewStyleNotes}` : ""}`
          
          await withDbRetry(() =>
            prisma.prepNote.create({
              data: {
                userId,
                title: `Intel: ${companyName}`,
                category: "Company Research",
                content,
              },
            })
          )

          return {
            success: true,
            companyId: company.id,
            companyName: company.name,
            industry: company.industry,
            message: `Successfully researched and stored intelligence for ${companyName}.`,
          }
        } catch (error) {
          console.error("researchCompanyIntel error:", error)
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
      }),
      execute: async ({
        recipientEmail,
        candidateName,
        companyName,
        jobTitle,
        subject,
        bodyText,
      }: {
        recipientEmail: string
        candidateName: string
        companyName: string
        jobTitle: string
        subject: string
        bodyText: string
      }) => {
        try {
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
              ? `[Development Mode] Simulated email delivery to ${recipientEmail} (${subject}).`
              : `Successfully sent email to ${recipientEmail}.`,
          }
        } catch (error) {
          console.error("sendOutreachEmailViaResend error:", error)
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
      }),
      execute: async ({
        applications,
      }: {
        applications: Array<{
          companyName: string
          jobTitle: string
          status?: "Saved" | "Applied" | "Assessment" | "Interview" | "Rejected" | "Offer"
          source?: string
          notes?: string
        }>
      }) => {
        try {
          if (!applications || applications.length === 0) {
            return { success: false, message: "No applications provided for batch import." }
          }

          const created = await withDbRetry(async () => {
            const results = []
            for (const app of applications) {
              const comp = (app.companyName || "").trim()
              const title = (app.jobTitle || "").trim()
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
            message: `Successfully imported ${created.length} applications into your tracker.`,
          }
        } catch (error) {
          console.error("batchImportApplications error:", error)
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
          console.error("syncToGoogleSheets tool error:", error)
          return { success: false, message: "Failed to execute Google Sheet synchronization." }
        }
      },
    } as any),
  }
}
