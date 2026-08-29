import { prisma } from "@/lib/prisma"
import { getCachedJson, setCachedJson } from "@/lib/redis"
import type { UserProfile } from "@prisma/client"
import {
  getCachedKnowledgeGraph,
  saveKnowledgeGraph,
  buildCareerGraphFromText,
  formatGraphForContext,
} from "@/lib/ai/knowledge-graph"
import { countTokens, trimToTokenBudget } from "./token-counter"

export type AIMode =
  | "profile"
  | "jd-scan"
  | "application"
  | "tracker"
  | "response"
  | "interview"
  | "weekly"
  | "recovery"
  | "general"

interface CachedResume {
  title: string
  fileName: string
  fileUrl: string
  textContent: string | null
}

/**
 * Sanitize external text to prevent tag injection and delimiter breakouts.
 */
export function sanitizeUntrustedContext(input: string): string {
  if (!input) return ""
  let sanitized = input.replace(/\u0000/g, "")
  const tagRegex = /<\/?(?:system|instruction|admin|override|user_runtime_context|untrusted_content)[^>]*>/gi

  // Recursive fixed-point loop to prevent nested bypasses like <<system>system>
  let previous = ""
  while (previous !== sanitized) {
    previous = sanitized
    sanitized = sanitized.replace(tagRegex, "")
  }

  return sanitized
}

/**
 * Enforce strict token budgeting on conversation history.
 * Uses js-tiktoken for accurate token counting instead of character estimation.
 * Always keeps first user message and ensures history starts with user role.
 */
export function budgetConversationHistory(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  maxTokens: number = 16_000
): Array<{ role: "user" | "assistant"; content: string }> {
  return trimToTokenBudget(messages, maxTokens) as Array<{ role: "user" | "assistant"; content: string }>
}

/**
 * Get token count for a message array (for logging/debugging).
 */
export function getMessageTokenCount(
  messages: Array<{ role: string; content: string }>
): number {
  return countTokens(messages.map((m) => m.content).join("\n"))
}

export async function buildFullContext(userId: string, mode: AIMode): Promise<string> {
  const parts: string[] = []

  // Determine selective flags based on mode
  const needRecentApps = mode === "tracker" || mode === "recovery" || mode === "jd-scan" || mode === "application" || mode === "response"
  const needStats = mode === "tracker" || mode === "recovery"
  const needResume = mode === "jd-scan" || mode === "application" || mode === "profile" || mode === "interview" || mode === "response"
  const needCompanies = mode === "jd-scan" || mode === "application" || mode === "tracker" || mode === "response"
  const needPrepNotes = mode === "interview" || mode === "profile"
  const needStatusChanges = mode === "tracker" || mode === "recovery" || mode === "response"
  const needAnalyses = mode === "jd-scan" || mode === "application" || mode === "recovery"
  const needPrepQuestions = mode === "interview"
  const needWeeklyGoals = mode === "weekly"

  // Parallelize all L1 Redis cache reads
  const [cachedProfile, cachedMemories, cachedResume, cachedGraph] = await Promise.all([
    getCachedJson<UserProfile>(`user:profile:${userId}`),
    getCachedJson<Array<{ category: string; content: string }>>(`user:memories:${userId}`),
    needResume ? getCachedJson<CachedResume>(`user:resume:${userId}`) : Promise.resolve(null),
    needResume ? getCachedKnowledgeGraph(userId) : Promise.resolve(null),
  ])

  // Parallelize remaining database fallback lookups and selective contextual queries
  const [
    user,
    dbProfile,
    dbMemories,
    dbResume,
    recentApps,
    pipelineStats,
    recentCompanies,
    recentPrepNotes,
    recentStatusChanges,
    recentAnalyses,
    prepQuestions,
    currentGoals,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    }),
    cachedProfile ? Promise.resolve(null) : prisma.userProfile.findUnique({ where: { userId } }),
    cachedMemories
      ? Promise.resolve(null)
      : prisma.userMemory.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 15,
          select: { category: true, content: true },
        }),
    needResume && !cachedResume
      ? prisma.resume.findFirst({
          where: { userId, isDefault: true },
          select: { title: true, fileName: true, fileUrl: true, textContent: true },
        })
      : Promise.resolve(null),
    needRecentApps
      ? prisma.application.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 15,
          select: {
            id: true,
            companyName: true,
            jobTitle: true,
            status: true,
            source: true,
            applicationDate: true,
            notes: true,
          },
        })
      : Promise.resolve([]),
    needStats
      ? prisma.application.groupBy({
          by: ["status"],
          where: { userId },
          _count: true,
        })
      : Promise.resolve([]),
    needCompanies
      ? prisma.company.findMany({
          where: { userId },
          orderBy: { updatedAt: "desc" },
          take: 3,
          select: { name: true, industry: true, website: true, notes: true },
        })
      : Promise.resolve(null),
    needPrepNotes
      ? prisma.prepNote.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 3,
          select: { title: true, category: true, content: true },
        })
      : Promise.resolve(null),
    needStatusChanges
      ? prisma.statusChange.findMany({
          where: { application: { userId } },
          orderBy: { changedAt: "desc" },
          take: 5,
          select: {
            fromStatus: true,
            toStatus: true,
            changedAt: true,
            application: { select: { companyName: true, jobTitle: true } },
          },
        })
      : Promise.resolve(null),
    needAnalyses
      ? prisma.applicationAnalysis.findMany({
          where: { application: { userId } },
          orderBy: { analyzedAt: "desc" },
          take: 3,
          select: {
            matchScore: true,
            confidence: true,
            verdict: true,
            finalRecommendation: true,
            application: { select: { companyName: true, jobTitle: true } },
          },
        })
      : Promise.resolve(null),
    needPrepQuestions
      ? prisma.prepQuestion.findMany({
          where: { userId },
          take: 10,
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve(null),
    needWeeklyGoals
      ? (async () => {
          const now = new Date()
          const weekStart = new Date(now)
          weekStart.setDate(now.getDate() - now.getDay() + 1)
          weekStart.setHours(0, 0, 0, 0)
          return prisma.weeklyGoal.findFirst({ where: { userId, weekStart } })
        })()
      : Promise.resolve(null),
  ])

  const profile = cachedProfile || dbProfile
  if (!cachedProfile && dbProfile) {
    void setCachedJson(`user:profile:${userId}`, dbProfile, 3600)
  }

  const userMemories = cachedMemories || dbMemories
  if (!cachedMemories && dbMemories && dbMemories.length > 0) {
    void setCachedJson(`user:memories:${userId}`, dbMemories, 3600)
  }

  const defaultResume = cachedResume || dbResume
  if (!cachedResume && dbResume) {
    void setCachedJson(`user:resume:${userId}`, dbResume, 3600)
  }

  const displayName = user?.name || user?.email || "there"
  const hasProfile = Boolean(profile)

  parts.push(`User Identity:
- Name: ${displayName}
- Email: ${user?.email || "Not set"}
- Profile Complete: ${hasProfile ? "Yes" : "No"}`)

  if (profile) {
    parts.push(`User Profile:
- Name: ${displayName}
- Location: ${profile.location || "Not set"}
- Target Roles: ${profile.targetRoles?.join(", ") || "Not set"}
- Work Preference: ${profile.workPreference || "Not set"}
- Experience Level: ${profile.experienceLevel || "Not set"}
- Current Status: ${profile.currentStatus || "Not set"}
- Skills: ${profile.strengths || "Not set"}
- Weaknesses: ${profile.weaknesses || "Not set"}
- LinkedIn: ${profile.linkedInUrl || "Not set"}
- GitHub: ${profile.githubUrl || "Not set"}
- Portfolio: ${profile.portfolioUrl || "Not set"}`)

    if (profile.bestProjects) {
      const projects = profile.bestProjects as Array<{ name: string; stack: string; description: string }>
      parts.push("Best Projects:\n" + projects.map((p, i) =>
        `${i + 1}. ${p.name} | Stack: ${p.stack} | ${p.description}`
      ).join("\n"))
    }
  }

  if (!profile) {
    parts.push("Onboarding Status: Profile incomplete. Advise on key details.")
  }

  if (defaultResume) {
    parts.push(`Default Resume: ${defaultResume.title} (${defaultResume.fileName})`)
  }

  if (cachedGraph && cachedGraph.nodes && cachedGraph.nodes.length > 0) {
    const formattedGraph = formatGraphForContext(cachedGraph)
    if (formattedGraph) {
      parts.push(formattedGraph)
    }
  } else if (defaultResume?.textContent) {
    // Fast excerpt in TTFT critical path; trigger graph extraction asynchronously in background
    const excerpt = defaultResume.textContent.length > 2000
      ? defaultResume.textContent.slice(0, 2000) + "..."
      : defaultResume.textContent
    parts.push(`<untrusted_content type="resume_excerpt">\n${sanitizeUntrustedContext(excerpt)}\n</untrusted_content>`)

    // Background build and cache Knowledge Graph without blocking streaming response
    void Promise.resolve().then(async () => {
      try {
        const generatedGraph = buildCareerGraphFromText(defaultResume.textContent!, profile)
        if (generatedGraph && generatedGraph.nodes.length > 0) {
          await saveKnowledgeGraph(userId, generatedGraph)
        }
      } catch (graphErr) {
        console.error("Background Knowledge Graph build failed:", graphErr)
      }
    })
  }

  if (pipelineStats && pipelineStats.length > 0) {
    const statsMap: Record<string, number> = {}
    pipelineStats.forEach((s) => { statsMap[s.status] = s._count })
    parts.push(`Pipeline Stats: Saved: ${statsMap.Saved || 0} | Applied: ${statsMap.Applied || 0} | Assessment: ${statsMap.Assessment || 0} | Interview: ${statsMap.Interview || 0} | Rejected: ${statsMap.Rejected || 0} | Offer: ${statsMap.Offer || 0}`)
  }

  if (mode === "tracker" || mode === "recovery") {
    const pendingFollowUps = recentApps.filter(
      (a) => a.status === "Applied" || a.status === "Assessment"
    )
    if (pendingFollowUps.length > 0) {
      parts.push("Pending Follow-ups:\n" + pendingFollowUps.map((a) =>
        `- ${a.companyName} (${a.jobTitle}) - ${a.status} since ${new Date(a.applicationDate).toLocaleDateString()}`
      ).join("\n"))
    }
  }

  if (mode === "jd-scan" || mode === "application" || mode === "tracker") {
    if (recentApps && recentApps.length > 0) {
      parts.push("Recent Applications:\n" + recentApps.map((a) =>
        `- ${a.companyName} | ${a.jobTitle} | ${a.status}`
      ).join("\n"))
    }
  }

  if (recentCompanies && recentCompanies.length > 0) {
    parts.push("Recent Companies:\n" + recentCompanies.map((company) =>
      `- ${company.name}${company.industry ? ` (${company.industry})` : ""}`
    ).join("\n"))
  }

  if (recentPrepNotes && recentPrepNotes.length > 0) {
    parts.push("Recent Prep Notes:\n" + recentPrepNotes.map((note) =>
      `- [${note.category}] ${note.title}: ${note.content}`
    ).join("\n"))
  }

  if (recentStatusChanges && recentStatusChanges.length > 0) {
    parts.push("Recent Status Changes:\n" + recentStatusChanges.map((change) =>
      `- ${change.application.companyName} (${change.application.jobTitle}): ${change.fromStatus || "Unknown"} -> ${change.toStatus}`
    ).join("\n"))
  }

  if (recentAnalyses && recentAnalyses.length > 0) {
    parts.push("Recent Analyses:\n" + recentAnalyses.map((analysis) =>
      `- ${analysis.application.companyName} (${analysis.application.jobTitle}): ${analysis.matchScore ?? "N/A"}% match, ${analysis.verdict || "no verdict"}`
    ).join("\n"))
  }

  if (prepQuestions && prepQuestions.length > 0) {
    parts.push("Existing Prep Questions:\n" + prepQuestions.map((q) =>
      `[${q.category}/${q.difficulty}] ${q.question}`
    ).join("\n"))
  }

  if (currentGoals) {
    parts.push(`Current Weekly Goals:
- Goal 1: ${currentGoals.goal1} (${currentGoals.goal1Status})
- Goal 2: ${currentGoals.goal2 || "N/A"} (${currentGoals.goal2Status})
- Goal 3: ${currentGoals.goal3 || "N/A"} (${currentGoals.goal3Status})`)
  }

  if (userMemories && userMemories.length > 0) {
    parts.push("Persistent User Knowledge & Explicit Preferences (Cross-Session Memory):\n" + userMemories.map((m: { category: string; content: string }) =>
      `- [${m.category.toUpperCase()}]: ${m.content}`
    ).join("\n"))
  }

  return parts.join("\n\n")
}
