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

  const [user, profile, recentApps, pipelineStats, defaultResume, recentCompanies, recentPrepNotes, recentStatusChanges, recentAnalyses] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    }),
    prisma.userProfile.findUnique({ where: { userId } }),
    prisma.application.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
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
    prisma.resume.findFirst({
      where: { userId, isDefault: true },
      select: { title: true, fileName: true, fileUrl: true },
    }),
    prisma.company.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { name: true, industry: true, website: true, notes: true },
    }),
    prisma.prepNote.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { title: true, category: true, content: true },
    }),
    prisma.statusChange.findMany({
      where: { application: { userId } },
      orderBy: { changedAt: "desc" },
      take: 8,
      select: {
        fromStatus: true,
        toStatus: true,
        changedAt: true,
        application: { select: { companyName: true, jobTitle: true } },
      },
    }),
    prisma.applicationAnalysis.findMany({
      where: { application: { userId } },
      orderBy: { analyzedAt: "desc" },
      take: 5,
      select: {
        matchScore: true,
        confidence: true,
        verdict: true,
        finalRecommendation: true,
        application: { select: { companyName: true, jobTitle: true } },
      },
    }),
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
    parts.push("Onboarding Status: The user has not completed their profile yet. Ask for the most important missing details before giving highly personalized advice.")
  }

  if (defaultResume) {
    parts.push(`Default Resume: ${defaultResume.title} (${defaultResume.fileName})`)
    parts.push(`- File URL: ${defaultResume.fileUrl}`)
  }

  const statsMap: Record<string, number> = {}
  pipelineStats.forEach((s) => { statsMap[s.status] = s._count })
  parts.push(`Pipeline Stats:
- Total: ${recentApps.length}
- Saved: ${statsMap.Saved || 0} | Applied: ${statsMap.Applied || 0}
- Assessment: ${statsMap.Assessment || 0} | Interview: ${statsMap.Interview || 0}
- Rejected: ${statsMap.Rejected || 0} | Offer: ${statsMap.Offer || 0}`)

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
    parts.push("Recent Applications:\n" + recentApps.slice(0, 5).map((a) =>
      `- ${a.companyName} | ${a.jobTitle} | ${a.status} | Source: ${a.source}`
    ).join("\n"))
  }

  if (recentCompanies.length > 0) {
    parts.push("Recent Companies:\n" + recentCompanies.map((company) =>
      `- ${company.name}${company.industry ? ` | Industry: ${company.industry}` : ""}${company.website ? ` | Website: ${company.website}` : ""}${company.notes ? ` | Notes: ${company.notes}` : ""}`
    ).join("\n"))
  }

  if (recentPrepNotes.length > 0) {
    parts.push("Recent Prep Notes:\n" + recentPrepNotes.map((note) =>
      `- [${note.category}] ${note.title}: ${note.content}`
    ).join("\n"))
  }

  if (recentStatusChanges.length > 0) {
    parts.push("Recent Status Changes:\n" + recentStatusChanges.map((change) =>
      `- ${change.application.companyName} (${change.application.jobTitle}): ${change.fromStatus || "Unknown"} -> ${change.toStatus} on ${change.changedAt.toLocaleDateString()}`
    ).join("\n"))
  }

  if (recentAnalyses.length > 0) {
    parts.push("Recent Application Analyses:\n" + recentAnalyses.map((analysis) =>
      `- ${analysis.application.companyName} (${analysis.application.jobTitle}): ${analysis.matchScore ?? "N/A"}% match, ${analysis.confidence || "unknown"} confidence, ${analysis.verdict || "no verdict"}${analysis.finalRecommendation ? ` | ${analysis.finalRecommendation}` : ""}`
    ).join("\n"))
  }

  if (mode === "interview") {
    const prepQuestions = await prisma.prepQuestion.findMany({
      where: { userId },
      take: 20,
      orderBy: { createdAt: "desc" },
    })
    if (prepQuestions.length > 0) {
      parts.push("Existing Prep Questions:\n" + prepQuestions.map((q) =>
        `[${q.category}/${q.difficulty}] ${q.question}`
      ).join("\n"))
    }
  }

  if (mode === "weekly") {
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay() + 1)
    weekStart.setHours(0, 0, 0, 0)
    const currentGoals = await prisma.weeklyGoal.findFirst({
      where: { userId, weekStart },
    })
    if (currentGoals) {
      parts.push(`Current Weekly Goals:
- Goal 1: ${currentGoals.goal1} (${currentGoals.goal1Status}, ${currentGoals.goal1Progress || 0}/${currentGoals.goal1Target || "N/A"})
- Goal 2: ${currentGoals.goal2 || "N/A"} (${currentGoals.goal2Status})
- Goal 3: ${currentGoals.goal3 || "N/A"} (${currentGoals.goal3Status})
- Blockers: ${currentGoals.blockers || "None"}`)
    }
  }

  return parts.join("\n\n")
}
