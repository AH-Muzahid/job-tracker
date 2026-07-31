import { prisma } from "@/lib/prisma"

export type AIMode =
  | "profile"
  | "jd-scan"
  | "application"
  | "tracker"
  | "response"
  | "interview"
  | "weekly"
  | "recovery"

export async function buildFullContext(userId: string, mode: AIMode): Promise<string> {
  const parts: string[] = []

  // Determine selective flags based on mode
  const needResume = mode === "jd-scan" || mode === "application" || mode === "profile" || mode === "interview"
  const needCompanies = mode === "jd-scan" || mode === "application" || mode === "tracker"
  const needPrepNotes = mode === "interview" || mode === "profile"
  const needStatusChanges = mode === "tracker" || mode === "recovery"
  const needAnalyses = mode === "jd-scan" || mode === "application" || mode === "recovery"
  const needPrepQuestions = mode === "interview"
  const needWeeklyGoals = mode === "weekly"

  // Base queries executed in parallel
  const [user, profile, recentApps, pipelineStats] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    }),
    prisma.userProfile.findUnique({ where: { userId } }),
    prisma.application.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true, companyName: true, jobTitle: true, status: true,
        source: true, applicationDate: true, notes: true,
      },
    }),
    prisma.application.groupBy({
      by: ["status"],
      where: { userId },
      _count: true,
    }),
  ])

  // Selective targeted secondary queries
  const [defaultResume, recentCompanies, recentPrepNotes, recentStatusChanges, recentAnalyses, prepQuestions, currentGoals] = await Promise.all([
    needResume
      ? prisma.resume.findFirst({
          where: { userId, isDefault: true },
          select: { title: true, fileName: true, fileUrl: true, textContent: true },
        })
      : null,
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
    if (defaultResume.textContent) {
      const excerpt = defaultResume.textContent.length > 5000
        ? defaultResume.textContent.slice(0, 5000) + "..."
        : defaultResume.textContent
      parts.push(`- Resume Excerpt:\n${excerpt}`)
    }
  }

  const statsMap: Record<string, number> = {}
  pipelineStats.forEach((s) => { statsMap[s.status] = s._count })
  parts.push(`Pipeline Stats: Saved: ${statsMap.Saved || 0} | Applied: ${statsMap.Applied || 0} | Assessment: ${statsMap.Assessment || 0} | Interview: ${statsMap.Interview || 0} | Rejected: ${statsMap.Rejected || 0} | Offer: ${statsMap.Offer || 0}`)

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

  if (mode === "jd-scan" || mode === "application") {
    parts.push("Recent Applications:\n" + recentApps.map((a) =>
      `- ${a.companyName} | ${a.jobTitle} | ${a.status}`
    ).join("\n"))
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

  return parts.join("\n\n")
}
