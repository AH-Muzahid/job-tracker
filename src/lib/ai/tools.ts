/* eslint-disable @typescript-eslint/no-explicit-any */
import { tool } from "ai"
import { z } from "zod"
import { prisma, withDbRetry } from "@/lib/prisma"

export function createAiTools(userId: string) {
  return {
    updateApplicationStatus: tool({
      description: "Update the status of a job application (e.g. from Applied to Interview or Rejected) and record notes.",
      parameters: z.object({
        companyOrTitle: z.string().describe("The company name or job title to find the application"),
        newStatus: z.enum(["Saved", "Applied", "Assessment", "Interview", "Rejected", "Offer"]).describe("The new status for the application"),
        notes: z.string().optional().describe("Optional note or update reason"),
      }),
      execute: async ({
        companyOrTitle,
        newStatus,
        notes,
      }: {
        companyOrTitle: string
        newStatus: "Saved" | "Applied" | "Assessment" | "Interview" | "Rejected" | "Offer"
        notes?: string
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
              orderBy: { updatedAt: "desc" },
            })
          )

          if (!app) {
            return {
              success: false,
              message: `Could not find an application matching "${companyOrTitle}".`,
            }
          }

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

          return {
            success: true,
            applicationId: app.id,
            companyName: app.companyName,
            jobTitle: app.jobTitle,
            fromStatus: prevStatus,
            toStatus: newStatus,
            message: `Successfully updated ${app.companyName} (${app.jobTitle}) status to ${newStatus}.`,
          }
        } catch (error) {
          console.error("updateApplicationStatus tool error:", error)
          return { success: false, message: "Failed to update application status." }
        }
      },
    } as any),

    createApplication: tool({
      description: "Create a new job application entry in the user's tracker.",
      parameters: z.object({
        companyName: z.string().describe("Name of the company"),
        jobTitle: z.string().describe("Title of the job role"),
        status: z.enum(["Saved", "Applied", "Assessment", "Interview", "Rejected", "Offer"]).optional().default("Saved"),
        jobUrl: z.string().optional().describe("URL to the job listing"),
        source: z.string().optional().describe("Source platform e.g. LinkedIn, Indeed, BDJobs"),
        notes: z.string().optional().describe("Initial notes about the role"),
      }),
      execute: async ({
        companyName,
        jobTitle,
        status = "Saved",
        jobUrl,
        source,
        notes,
      }: {
        companyName: string
        jobTitle: string
        status?: "Saved" | "Applied" | "Assessment" | "Interview" | "Rejected" | "Offer"
        jobUrl?: string
        source?: string
        notes?: string
      }) => {
        try {
          const newApp = await withDbRetry(() =>
            prisma.application.create({
              data: {
                userId,
                companyName,
                jobTitle,
                status: status || "Saved",
                jobUrl: jobUrl || null,
                source: source || "Other",
                notes: notes || null,
                applicationDate: new Date(),
              },
            })
          )

          return {
            success: true,
            applicationId: newApp.id,
            companyName: newApp.companyName,
            jobTitle: newApp.jobTitle,
            status: newApp.status,
            message: `Created new application for ${companyName} (${jobTitle}) in ${status || "Saved"} status.`,
          }
        } catch (error) {
          console.error("createApplication tool error:", error)
          return { success: false, message: "Failed to create application." }
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
  }
}
