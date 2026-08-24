import { prisma } from "@/lib/prisma"
import { getCachedJson, setCachedJson } from "@/lib/redis"
import type { UserProfile } from "@prisma/client"
import {
  getCachedKnowledgeGraph,
  saveKnowledgeGraph,
  buildCareerGraphFromText,
  formatGraphForContext,
} from "@/lib/ai/knowledge-graph"

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

  // Base queries with Redis LTM caching for Profile and Memories
  const cachedProfilePromise = getCachedJson<UserProfile>(`user:profile:${userId}`)
  const cachedMemoriesPromise = getCachedJson<Array<{ category: string; content: string }>>(`user:memories:${userId}`)

  const [user, cachedProfile, cachedMemories, recentApps, pipelineStats] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    }),
    cachedProfilePromise,
    cachedMemoriesPromise,
    needRecentApps ? prisma.application.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 15,
      select: {
        id: true, companyName: true, jobTitle: true, status: true,
        source: true, applicationDate: true, notes: true,
      },
    }) : Promise.resolve([]),
    needStats ? prisma.application.groupBy({
      by: ["status"],
      where: { userId },
      _count: true,
    }) : Promise.resolve([]),
  ])

  let profile = cachedProfile
  if (!profile) {
    profile = await prisma.userProfile.findUnique({ where: { userId } })
    if (profile) {
      // Asynchronously cache profile in Redis for 1 hour
      void setCachedJson(`user:profile:${userId}`, profile, 3600)
    }
  }

  let userMemories = cachedMemories
  if (!userMemories) {
    const rawMemories = await prisma.userMemory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 15,
      select: { category: true, content: true },
    })
    userMemories = rawMemories
    if (rawMemories && rawMemories.length > 0) {
      void setCachedJson(`user:memories:${userId}`, rawMemories, 3600)
    }
  }

  // Selective targeted secondary queries with Redis caching for Default Resume and Knowledge Graph
  const cachedResumePromise = needResume ? getCachedJson<CachedResume>(`user:resume:${userId}`) : Promise.resolve(null)
  const cachedGraphPromise = needResume ? getCachedKnowledgeGraph(userId) : Promise.resolve(null)
  const [cachedResume, cachedGraph] = await Promise.all([cachedResumePromise, cachedGraphPromise])

  let defaultResume = cachedResume
  if (needResume && !defaultResume) {
    defaultResume = await prisma.resume.findFirst({
      where: { userId, isDefault: true },
      select: { title: true, fileName: true, fileUrl: true, textContent: true },
    })
    if (defaultResume) {
      void setCachedJson(`user:resume:${userId}`, defaultResume, 3600)
    }
  }

  const [recentCompanies, recentPrepNotes, recentStatusChanges, recentAnalyses, prepQuestions, currentGoals] = await Promise.all([
    needCompanies
      ? prisma.company.findMany({
          where: { userId },
          orderBy: { updatedAt: "desc" },
          take: 3,
          select: { name: true, industry: true, website: true, notes: true },
        })
      : null,
    needPrepNotes
      ? prisma.prepNote.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 3,
          select: { title: true, category: true, content: true },
        })
      : null,
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
      : null,
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
      : null,
    needPrepQuestions
      ? prisma.prepQuestion.findMany({
          where: { userId },
          take: 10,
          orderBy: { createdAt: "desc" },
        })
      : null,
    needWeeklyGoals
      ? (async () => {
          const now = new Date()
          const weekStart = new Date(now)
          weekStart.setDate(now.getDate() - now.getDay() + 1)
          weekStart.setHours(0, 0, 0, 0)
          return prisma.weeklyGoal.findFirst({ where: { userId, weekStart } })
        })()
      : null,
  ])

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
    // Auto-build and persist Knowledge Graph on the fly if missing
    try {
      const generatedGraph = buildCareerGraphFromText(defaultResume.textContent, profile)
      if (generatedGraph && generatedGraph.nodes.length > 0) {
        void saveKnowledgeGraph(userId, generatedGraph)
        const formattedGraph = formatGraphForContext(generatedGraph)
        if (formattedGraph) {
          parts.push(formattedGraph)
        }
      }
    } catch {
      // Fallback: only if graph generation failed, provide compact excerpt
      const excerpt = defaultResume.textContent.length > 2000
        ? defaultResume.textContent.slice(0, 2000) + "..."
        : defaultResume.textContent
      parts.push(`- Key Resume Points:\n${excerpt}`)
    }
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
    parts.push("Persistent User Knowledge & Explicit Preferences (Cross-Session Memory):\n" + userMemories.map((m) =>
      `- [${m.category.toUpperCase()}]: ${m.content}`
    ).join("\n"))
  }

  return parts.join("\n\n")
}
