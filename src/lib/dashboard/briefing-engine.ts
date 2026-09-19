import { prisma, withDbRetry } from "@/lib/prisma"
import { getUserAIConfig } from "@/lib/ai/config"
import { getProvider } from "@/lib/ai/client"
import { generateText } from "ai"
import { calculateBusinessDays, isFollowUpDue } from "@/lib/applications/follow-up-engine"

export interface BriefingStagedApp {
  id: string
  companyName: string
  jobTitle: string
  packagedAt: string
}

export interface BriefingFollowUpApp {
  id: string
  companyName: string
  jobTitle: string
  appliedDate: string
  businessDaysDormant: number
}

export interface BriefingInterview {
  id: string
  companyName: string
  jobTitle: string
  interviewDate: string
  interviewRound?: string | null
  interviewMeetingUrl?: string | null
  hoursUntil: number
}

export interface BriefingWeeklyGoalSummary {
  hasGoals: boolean
  totalTarget: number
  totalProgress: number
  completionPercentage: number
  goals: Array<{
    title: string
    target: number
    progress: number
    status: string
  }>
}

export interface BriefingPriorityAction {
  id: string
  type: "REVIEW_STAGED" | "SEND_FOLLOWUP" | "PREP_INTERVIEW" | "DISCOVER_JOBS" | "UPDATE_GOAL"
  title: string
  description: string
  count: number
  href: string
  urgency: "urgent" | "high" | "medium" | "low"
}

export interface ExecutiveBriefing {
  generatedAt: string
  candidateName?: string | null
  metrics: {
    stagedCount: number
    followUpsDueCount: number
    upcomingInterviewsCount: number
    activeApplicationsCount: number
  }
  stagedApplications: BriefingStagedApp[]
  followUpsDue: BriefingFollowUpApp[]
  upcomingInterviews: BriefingInterview[]
  weeklyGoalSummary: BriefingWeeklyGoalSummary | null
  priorityActions: BriefingPriorityAction[]
  executiveSummary: string[]
}

/**
 * Builds a high-fidelity deterministic executive summary when offline or AI key is not present.
 */
export function generateDeterministicExecutiveSummary(params: {
  candidateName?: string | null
  metrics: {
    stagedCount: number
    followUpsDueCount: number
    upcomingInterviewsCount: number
    activeApplicationsCount: number
  }
  upcomingInterviews: BriefingInterview[]
  stagedApplications: BriefingStagedApp[]
  followUpsDue: BriefingFollowUpApp[]
}): string[] {
  const { metrics, upcomingInterviews, stagedApplications, followUpsDue } = params
  const bullets: string[] = []

  // Bullet 1: High priority interview or pipeline momentum
  if (upcomingInterviews.length > 0) {
    const nextInterview = upcomingInterviews[0]
    const roundStr = nextInterview.interviewRound ? ` (${nextInterview.interviewRound})` : ""
    const timeStr = nextInterview.hoursUntil <= 24
      ? `in ${Math.max(1, Math.round(nextInterview.hoursUntil))}h`
      : `in ${Math.round(nextInterview.hoursUntil / 24)}d`
    bullets.push(
      `Upcoming interview with ${nextInterview.companyName}${roundStr} ${timeStr}. Launch Interview Lab to practice company-specific mocks and review your pitch.`
    )
  } else if (metrics.activeApplicationsCount > 0) {
    bullets.push(
      `You have ${metrics.activeApplicationsCount} active application${metrics.activeApplicationsCount === 1 ? "" : "s"} moving through your pipeline.`
    )
  } else {
    bullets.push(
      `Your active pipeline is currently open. Explore high-fit matches in Discovery to stage high-leverage opportunities.`
    )
  }

  // Bullet 2: Staged applications ready for dispatch
  if (stagedApplications.length > 0) {
    bullets.push(
      `${stagedApplications.length} pre-packaged application${stagedApplications.length === 1 ? " is" : "s are"} staged with tailored materials ready for your 1-click review and submission.`
    )
  } else if (metrics.activeApplicationsCount > 0) {
    bullets.push(
      `Maintain consistency: Target 2-3 tailored submissions this week to keep recruiter inbound velocity high.`
    )
  } else {
    bullets.push(
      `Evaluate external job descriptions or run Discovery to generate custom tailored collateral in one click.`
    )
  }

  // Bullet 3: Follow-up hygiene or proactive advice
  if (followUpsDue.length > 0) {
    const lead = followUpsDue[0]
    bullets.push(
      `${followUpsDue.length} application${followUpsDue.length === 1 ? "" : "s"} (including ${lead.companyName}) ${followUpsDue.length === 1 ? "is" : "are"} dormant past 5 business days. Send a structured follow-up to re-engage recruiters.`
    )
  } else {
    bullets.push(
      `Pipeline hygiene is solid with 0 dormant follow-ups overdue. Keep your responses prompt to maximize conversion rates.`
    )
  }

  return bullets
}

/**
 * Core engine for aggregating candidate state and generating the Daily Executive Briefing.
 */
export async function generateExecutiveBriefing(userId: string): Promise<ExecutiveBriefing> {
  const now = new Date()
  const threeDaysAhead = new Date(now.getTime() + 72 * 60 * 60 * 1000)

  // 1. Fetch User details, applications, and goals in parallel
  const [user, applications, weeklyGoal] = await Promise.all([
    withDbRetry(() =>
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          profile: {
            select: { targetRoles: true },
          },
        },
      })
    ),
    withDbRetry(() =>
      prisma.application.findMany({
        where: { userId },
        select: {
          id: true,
          companyName: true,
          jobTitle: true,
          status: true,
          applicationDate: true,
          createdAt: true,
          updatedAt: true,
          interviewDate: true,
          interviewRound: true,
          interviewMeetingUrl: true,
        },
        orderBy: { updatedAt: "desc" },
      })
    ),
    (async () => {
      try {
        if (!prisma?.weeklyGoal?.findFirst) return null
        return await withDbRetry(() =>
          prisma.weeklyGoal.findFirst({
            where: { userId },
            orderBy: { weekStart: "desc" },
          })
        )
      } catch {
        return null
      }
    })(),
  ])

  // 2. Segment applications into categories
  const stagedApps: BriefingStagedApp[] = []
  const followUpsDue: BriefingFollowUpApp[] = []
  const upcomingInterviews: BriefingInterview[] = []
  let activeApplicationsCount = 0

  const STAGED_STATUSES = ["staged"]
  const ACTIVE_STATUSES = ["applied", "assessment", "interview", "offer"]

  for (const app of applications) {
    const normStatus = (app.status || "").toLowerCase().trim()

    if (STAGED_STATUSES.includes(normStatus)) {
      stagedApps.push({
        id: app.id,
        companyName: app.companyName,
        jobTitle: app.jobTitle,
        packagedAt: (app.createdAt || app.updatedAt).toISOString(),
      })
    } else if (ACTIVE_STATUSES.includes(normStatus)) {
      activeApplicationsCount++

      // Check if follow-up is due
      if (isFollowUpDue(app)) {
        const refDate = app.applicationDate || app.updatedAt || app.createdAt
        const days = calculateBusinessDays(refDate)
        followUpsDue.push({
          id: app.id,
          companyName: app.companyName,
          jobTitle: app.jobTitle,
          appliedDate: refDate.toISOString(),
          businessDaysDormant: days,
        })
      }
    }

    // Check for upcoming interview in next 72 hours
    if (app.interviewDate) {
      const iDate = new Date(app.interviewDate)
      if (iDate >= now && iDate <= threeDaysAhead) {
        const diffMs = iDate.getTime() - now.getTime()
        const hoursUntil = Math.max(0, diffMs / (1000 * 60 * 60))
        upcomingInterviews.push({
          id: app.id,
          companyName: app.companyName,
          jobTitle: app.jobTitle,
          interviewDate: iDate.toISOString(),
          interviewRound: app.interviewRound,
          interviewMeetingUrl: app.interviewMeetingUrl,
          hoursUntil: Math.round(hoursUntil * 10) / 10,
        })
      }
    }
  }

  // Sort upcoming interviews by earliest first
  upcomingInterviews.sort((a, b) => new Date(a.interviewDate).getTime() - new Date(b.interviewDate).getTime())

  // 3. Aggregate weekly goal summary if available
  let weeklyGoalSummary: BriefingWeeklyGoalSummary | null = null
  if (weeklyGoal) {
    const goalsList = []
    let totalTarget = 0
    let totalProgress = 0

    if (weeklyGoal.goal1) {
      const target = weeklyGoal.goal1Target || 0
      const progress = weeklyGoal.goal1Progress || 0
      totalTarget += target
      totalProgress += progress
      goalsList.push({
        title: weeklyGoal.goal1,
        target,
        progress,
        status: weeklyGoal.goal1Status || "In Progress",
      })
    }

    if (weeklyGoal.goal2) {
      const target = weeklyGoal.goal2Target || 0
      const progress = weeklyGoal.goal2Progress || 0
      totalTarget += target
      totalProgress += progress
      goalsList.push({
        title: weeklyGoal.goal2,
        target,
        progress,
        status: weeklyGoal.goal2Status || "In Progress",
      })
    }

    if (weeklyGoal.goal3) {
      const target = weeklyGoal.goal3Target || 0
      const progress = weeklyGoal.goal3Progress || 0
      totalTarget += target
      totalProgress += progress
      goalsList.push({
        title: weeklyGoal.goal3,
        target,
        progress,
        status: weeklyGoal.goal3Status || "In Progress",
      })
    }

    const completionPercentage = totalTarget > 0
      ? Math.min(100, Math.round((totalProgress / totalTarget) * 100))
      : 0

    weeklyGoalSummary = {
      hasGoals: goalsList.length > 0,
      totalTarget,
      totalProgress,
      completionPercentage,
      goals: goalsList,
    }
  }

  // 4. Construct Tactical Priority Actions
  const priorityActions: BriefingPriorityAction[] = []

  if (upcomingInterviews.length > 0) {
    const nextInt = upcomingInterviews[0]
    priorityActions.push({
      id: "prep-interview",
      type: "PREP_INTERVIEW",
      title: `Prep for ${nextInt.companyName} Interview`,
      description: `${nextInt.interviewRound || "Round"} in ${Math.round(nextInt.hoursUntil)}h. Review talking points and AI mock gaps.`,
      count: upcomingInterviews.length,
      href: `/interview-prep?applicationId=${nextInt.id}`,
      urgency: nextInt.hoursUntil <= 24 ? "urgent" : "high",
    })
  }

  if (stagedApps.length > 0) {
    priorityActions.push({
      id: "review-staged",
      type: "REVIEW_STAGED",
      title: `Review ${stagedApps.length} Staged Application${stagedApps.length > 1 ? "s" : ""}`,
      description: "Collateral and custom cover letters pre-assembled. Ready for final check and submission.",
      count: stagedApps.length,
      href: "/applications?status=Staged",
      urgency: "high",
    })
  }

  if (followUpsDue.length > 0) {
    priorityActions.push({
      id: "send-followups",
      type: "SEND_FOLLOWUP",
      title: `Send ${followUpsDue.length} Follow-up${followUpsDue.length > 1 ? "s" : ""}`,
      description: "Dormant past 5 business days. 1-click tailored email drafts ready to send.",
      count: followUpsDue.length,
      href: "/applications?filter=followup",
      urgency: "medium",
    })
  }

  if (priorityActions.length === 0) {
    priorityActions.push({
      id: "discover-opportunities",
      type: "DISCOVER_JOBS",
      title: "Discover High-Fit Opportunities",
      description: "Explore curated roles or evaluate any JD to trigger autonomous 1-click application packaging.",
      count: 0,
      href: "/discovery",
      urgency: "low",
    })
  }

  const metrics = {
    stagedCount: stagedApps.length,
    followUpsDueCount: followUpsDue.length,
    upcomingInterviewsCount: upcomingInterviews.length,
    activeApplicationsCount,
  }

  // 5. Generate AI Executive Summary (with deterministic fallback)
  let executiveSummary = generateDeterministicExecutiveSummary({
    candidateName: user?.name,
    metrics,
    upcomingInterviews,
    stagedApplications: stagedApps,
    followUpsDue,
  })

  try {
    const aiConfig = await getUserAIConfig(userId)
    if (aiConfig) {
      const resolved = getProvider(aiConfig)
      const modelToUse = aiConfig.model || resolved.defaultModel
      const prompt = `You are the Autonomous Career Agent executive copilot for ${user?.name || "the candidate"}.
Current campaign status:
- Active applications in flight: ${metrics.activeApplicationsCount}
- Staged applications ready to submit: ${metrics.stagedCount}
- Dormant applications needing 5-day follow-up: ${metrics.followUpsDueCount}
- Upcoming interviews in next 72 hours: ${metrics.upcomingInterviewsCount}
${upcomingInterviews.length > 0 ? `Earliest interview: ${upcomingInterviews[0].companyName} (${upcomingInterviews[0].interviewRound || 'Interview'}) in ${upcomingInterviews[0].hoursUntil} hours.` : ""}
${stagedApps.length > 0 ? `Staged roles: ${stagedApps.slice(0, 3).map(a => `${a.jobTitle} at ${a.companyName}`).join(", ")}` : ""}

Generate exactly 3 punchy, tactical, motivating bullet points for the morning briefing.
Rules:
- Be concise, professional, and direct like Linear or Stripe dashboard.
- NEVER use buzzwords, emoji icons, or AI fluff.
- Bullet 1 must address upcoming interview or pipeline health.
- Bullet 2 must give immediate next action on staged applications or new targets.
- Bullet 3 must give follow-up advice or strategic career guidance.
Return strictly a JSON array of 3 strings: ["...", "...", "..."]`

      const res = await generateText({
        model: resolved.model(modelToUse),
        prompt,
        temperature: 0.3,
      })

      const raw = res.text.trim()
      const jsonMatch = raw.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        if (Array.isArray(parsed) && parsed.length >= 2) {
          executiveSummary = parsed.map((p) => String(p).trim()).slice(0, 3)
        }
      }
    }
  } catch (aiErr) {
    console.warn("[BriefingEngine] AI briefing generation fallback to deterministic:", aiErr)
  }

  return {
    generatedAt: now.toISOString(),
    candidateName: user?.name || null,
    metrics,
    stagedApplications: stagedApps,
    followUpsDue,
    upcomingInterviews,
    weeklyGoalSummary,
    priorityActions,
    executiveSummary,
  }
}
