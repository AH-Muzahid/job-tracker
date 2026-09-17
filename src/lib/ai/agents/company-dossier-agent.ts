/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma, withDbRetry } from "@/lib/prisma"
import { getUserAIConfig } from "@/lib/ai/config"
import { getProvider } from "@/lib/ai/client"
import { generateText } from "ai"
import { getSystemBase } from "@/lib/ai/prompts/system-base"

export interface CompanyDossier {
  companyOverview: string
  techStackHighlights: string[]
  recentStrategicContext: string
  curatedInterviewQuestions: string[]
  questionsToAskPanel: string[]
  rawMarkdownCheatsheet: string
}

/**
 * Deterministic fallback generator for company dossier when AI keys are unavailable.
 */
export function generateDeterministicDossier(
  companyName: string,
  jobTitle: string,
  keywords: string[] = []
): CompanyDossier {
  const cleanCompany = companyName.replace(/\s*\(inferred from.*?\)\s*/gi, "").trim()
  const techList =
    keywords.length > 0
      ? keywords.slice(0, 5)
      : ["Distributed Systems", "TypeScript", "React", "Cloud Architecture", "CI/CD Pipelines"]

  const companyOverview = `${cleanCompany} is an active technology organization hiring for ${jobTitle}. The engineering group prioritizes scalable product delivery, high reliability, and agile execution.`
  const techStackHighlights = techList
  const recentStrategicContext = `${cleanCompany} is expanding engineering capacity for ${jobTitle}, focusing on developer velocity, infrastructure resilience, and user experience.`
  const curatedInterviewQuestions = [
    `How do you architect and test a scalable feature at ${cleanCompany}?`,
    `Describe a time you diagnosed and resolved a production bottleneck or incident.`,
    `How do you handle disagreement over technical direction or roadmap tradeoffs?`,
    `What strategies do you use for data consistency and error handling across microservices?`,
  ]
  const questionsToAskPanel = [
    `What are the most challenging technical scaling hurdles the team at ${cleanCompany} is currently facing?`,
    `How does the engineering team balance shipping new features with technical debt remediation?`,
    `What does exceptional success look like for a ${jobTitle} during their first 90 days?`,
  ]

  const rawMarkdownCheatsheet = `### 🏢 Company Overview: ${cleanCompany}
${companyOverview}

### 🛠️ Core Tech & Domain Focus:
${techStackHighlights.map((t) => `- ${t}`).join("\n")}

### 🎯 Key Interview Questions to Prepare:
${curatedInterviewQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}

### ❓ Strategic Questions to Ask the Panel:
${questionsToAskPanel.map((q, i) => `${i + 1}. ${q}`).join("\n")}`

  return {
    companyOverview,
    techStackHighlights,
    recentStrategicContext,
    curatedInterviewQuestions,
    questionsToAskPanel,
    rawMarkdownCheatsheet,
  }
}

/**
 * Compiles a company research dossier and saves it directly to application notes.
 */
export async function compileCompanyDossier(
  applicationId: string,
  userId: string
): Promise<{ success: boolean; dossier: CompanyDossier }> {
  const app = await withDbRetry(() =>
    prisma.application.findFirst({
      where: { id: applicationId, userId },
      include: { company: true, analysis: true },
    })
  )

  if (!app) {
    throw new Error("Application not found or unauthorized")
  }

  const cleanCompany = app.companyName.replace(/\s*\(inferred from.*?\)\s*/gi, "").trim()
  const jobTitle = app.jobTitle
  const keywords = Array.isArray(app.analysis?.jdKeywords)
    ? (app.analysis.jdKeywords as string[])
    : []

  let dossier: CompanyDossier

  try {
    const aiConfig = await getUserAIConfig(userId, undefined, { requireUserKey: true })

    if (aiConfig) {
      const resolvedProvider = getProvider({
        providerType: aiConfig.providerType as any,
        apiKey: aiConfig.apiKey,
        baseUrl: aiConfig.baseUrl,
        model: aiConfig.model,
      })

      const targetModel = resolvedProvider.model(aiConfig.model || resolvedProvider.defaultModel)

      const systemPrompt = `${getSystemBase()}

You are a Principal Engineering Intelligence Analyst. Compile a comprehensive, high-signal pre-interview company dossier and cheatsheet for a candidate interviewing for ${jobTitle} at ${cleanCompany}.

Return strictly valid JSON with this schema:
{
  "companyOverview": "2-3 concise sentences on core product, business model, and engineering scale",
  "techStackHighlights": ["Technology or architecture focus 1", "Technology 2", "Technology 3", "Technology 4"],
  "recentStrategicContext": "Key engineering challenges, recent news, or architectural priorities relevant to this team",
  "curatedInterviewQuestions": ["High-yield interview question 1", "Question 2", "Question 3", "Question 4"],
  "questionsToAskPanel": ["Strategic question candidate should ask 1", "Question 2", "Question 3"]
}

Rules:
- Be specific to ${cleanCompany} and ${jobTitle}.
- DO NOT use markdown fences or additional text. Output ONLY valid JSON.`

      const promptText = `Company: ${cleanCompany}
Role: ${jobTitle}
Job Description Keywords: ${keywords.join(", ") || "Fullstack, Cloud, Distributed Systems"}
Existing Notes: ${app.notes ? app.notes.slice(0, 300) : "None"}`

      const res = await generateText({
        model: targetModel,
        system: systemPrompt,
        prompt: promptText,
      })

      const cleaned = res.text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim()
      const jsonStart = cleaned.indexOf("{")
      const jsonEnd = cleaned.lastIndexOf("}")

      if (jsonStart !== -1 && jsonEnd !== -1) {
        const parsed = JSON.parse(cleaned.substring(jsonStart, jsonEnd + 1))
        const overview = parsed.companyOverview || `${cleanCompany} is a leading tech company.`
        const techStack = Array.isArray(parsed.techStackHighlights)
          ? parsed.techStackHighlights
          : keywords.slice(0, 4)
        const recent = parsed.recentStrategicContext || "Expanding engineering scale and product features."
        const questions = Array.isArray(parsed.curatedInterviewQuestions)
          ? parsed.curatedInterviewQuestions
          : []
        const questionsToAsk = Array.isArray(parsed.questionsToAskPanel)
          ? parsed.questionsToAskPanel
          : []

        const markdownCheatsheet = `### 🏢 Company Overview: ${cleanCompany}
${overview}

### 🛠️ Core Tech & Domain Focus:
${techStack.map((t: string) => `- ${t}`).join("\n")}

### 🎯 Key Interview Questions to Prepare:
${questions.map((q: string, i: number) => `${i + 1}. ${q}`).join("\n")}

### ❓ Strategic Questions to Ask the Panel:
${questionsToAsk.map((q: string, i: number) => `${i + 1}. ${q}`).join("\n")}`

        dossier = {
          companyOverview: overview,
          techStackHighlights: techStack,
          recentStrategicContext: recent,
          curatedInterviewQuestions: questions,
          questionsToAskPanel: questionsToAsk,
          rawMarkdownCheatsheet: markdownCheatsheet,
        }
      } else {
        dossier = generateDeterministicDossier(cleanCompany, jobTitle, keywords)
      }
    } else {
      dossier = generateDeterministicDossier(cleanCompany, jobTitle, keywords)
    }
  } catch (aiErr) {
    console.warn("[compileCompanyDossier] AI generation fallback:", aiErr)
    dossier = generateDeterministicDossier(cleanCompany, jobTitle, keywords)
  }

  // Update interviewNotes in application
  const existingNotes = app.interviewNotes?.trim() || ""
  let updatedNotes = dossier.rawMarkdownCheatsheet
  if (existingNotes) {
    if (!existingNotes.includes("🏢 Company Overview")) {
      updatedNotes = `${existingNotes}\n\n---\n\n${dossier.rawMarkdownCheatsheet}`
    } else {
      updatedNotes = existingNotes
    }
  }

  await withDbRetry(() =>
    prisma.application.update({
      where: { id: applicationId },
      data: { interviewNotes: updatedNotes },
    })
  )

  // Dispatch in-app notification
  try {
    await withDbRetry(() =>
      prisma.notification.create({
        data: {
          userId,
          title: `Interview Dossier Ready: ${cleanCompany}`,
          message: `Automated intelligence dossier and panel cheatsheet compiled for ${jobTitle}.`,
          type: "COMPANY_DOSSIER_READY",
          link: `/applications/${applicationId}`,
        },
      })
    )
  } catch (notifErr) {
    console.warn("[compileCompanyDossier] Notification error:", notifErr)
  }

  return { success: true, dossier }
}
