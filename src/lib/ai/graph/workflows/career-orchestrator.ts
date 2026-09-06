import { StateGraph, START, END } from "@langchain/langgraph"
import {
  CareerOrchestratorState,
  type CareerOrchestratorStateType,
  type ApplicationPackageItem,
  type ExecutionAuditLogItem,
} from "../state/career-orchestrator-state"
import { retrieveCandidateJobsTier1 } from "@/lib/discovery/vector-retrieval"
import { deepReRankCandidateJobs } from "@/lib/discovery/ai-reranker"
import { evaluateJobScamRisk } from "@/lib/discovery/matching"
import { generateApplicationMaterialsAgent } from "@/lib/discovery/cover-letter-agent"
import { invalidateUserImplicitPreferences } from "@/lib/discovery/preferences"
import { logDiscoveryEvent } from "@/lib/discovery/telemetry"
import { prisma, withDbRetry } from "@/lib/prisma"

/**
 * Node 1: Two-Tier RecSys Discovery Node (pgvector + Gemini Cross-Encoder)
 */
async function discoveryNode(
  state: CareerOrchestratorStateType
): Promise<Partial<CareerOrchestratorStateType>> {
  const [profile, resume] = await Promise.all([
    withDbRetry(() => prisma.userProfile.findUnique({ where: { userId: state.userId } })),
    withDbRetry(() =>
      prisma.resume.findFirst({
        where: { userId: state.userId },
        orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
      })
    ),
  ])

  const targetRoles = state.candidateGoal?.targetRole
    ? [state.candidateGoal.targetRole]
    : profile?.targetRoles && profile.targetRoles.length > 0
    ? profile.targetRoles
    : ["Software Engineer", "Full Stack Developer"]

  const userSkills: string[] = []
  if (profile?.strengths) {
    userSkills.push(
      ...profile.strengths
        .split(/[,/|\n]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    )
  }
  if (resume?.textContent) {
    const resumeSkills = resume.textContent
      .toLowerCase()
      .match(/\b(typescript|javascript|react|nextjs|node|python|go|golang|postgres|postgresql|docker|kubernetes|aws|redis|graphql)\b/g)
    if (resumeSkills) {
      userSkills.push(...resumeSkills)
    }
  }

  const projects: Array<{ name: string; stack?: string; description?: string }> = Array.isArray(
    profile?.bestProjects
  )
    ? (profile.bestProjects as unknown[]).map((p) => {
        const obj = (typeof p === "object" && p !== null ? p : {}) as Record<string, unknown>
        return {
          name: typeof obj.name === "string" ? obj.name : "Engineering Project",
          stack: typeof obj.stack === "string" ? obj.stack : undefined,
          description: typeof obj.description === "string" ? obj.description : undefined,
        }
      })
    : []

  const tier1Candidates = await retrieveCandidateJobsTier1({
    userId: state.userId,
    targetRoles,
    userSkills: Array.from(new Set(userSkills)),
    projects,
    workPreference: profile?.workPreference || "remote",
    limit: 25,
  })

  const reRankedJobs = await deepReRankCandidateJobs({
    candidateProfile: {
      targetRoles,
      skills: Array.from(new Set(userSkills)),
      experienceLevel: profile?.experienceLevel || "mid",
      location: profile?.location || "Remote",
      projects,
    },
    jobs: tier1Candidates,
  })

  return {
    discoveredJobs: reRankedJobs,
    executionAuditLog: [
      {
        id: `audit-disc-${Date.now()}`,
        agent: "discovery",
        action: "TIER_1_AND_2_DISCOVERY",
        timestamp: new Date(),
        rationale: `Retrieved ${tier1Candidates.length} dense vector candidates and re-ranked ${reRankedJobs.length} opportunities.`,
        metadata: {
          totalEvaluated: reRankedJobs.length,
        },
      },
    ],
  }
}

/**
 * Node 2: Evaluation & Quality Gating Node
 */
async function evaluationNode(
  state: CareerOrchestratorStateType
): Promise<Partial<CareerOrchestratorStateType>> {
  const approved = state.discoveredJobs.filter((job) => {
    if (job.fitScore < 80) return false

    const scamEvaluation = evaluateJobScamRisk({
      title: job.title,
      company: job.company,
      url: job.url,
      description: job.description || "",
      salaryMin: job.salaryMin || undefined,
      salaryMax: job.salaryMax || undefined,
      location: job.location,
    })

    return scamEvaluation.scamScore < 0.3
  })

  approved.sort((a, b) => b.fitScore - a.fitScore)
  const avgFit =
    approved.length > 0
      ? Math.round(approved.reduce((acc, j) => acc + j.fitScore, 0) / approved.length)
      : 0

  return {
    approvedOpportunities: approved,
    executionAuditLog: [
      {
        id: `audit-eval-${Date.now()}`,
        agent: "evaluation",
        action: "EVALUATE_AND_GATE",
        timestamp: new Date(),
        rationale: `Evaluated ${state.discoveredJobs.length} opportunities: ${approved.length} approved (fitScore >= 80, scamScore < 0.3).`,
        metadata: {
          totalEvaluated: state.discoveredJobs.length,
          approvedCount: approved.length,
          disqualifiedCount: state.discoveredJobs.length - approved.length,
          averageFitScore: avgFit,
        },
      },
    ],
  }
}

/**
 * Node 3: Early Exit Node (When 0 opportunities pass evaluation)
 */
async function earlyExitNode(
  state: CareerOrchestratorStateType
): Promise<Partial<CareerOrchestratorStateType>> {
  const exitLog: ExecutionAuditLogItem = {
    id: `audit-exit-${Date.now()}`,
    agent: "early_exit",
    action: "NO_OPPORTUNITIES_QUALIFIED",
    timestamp: new Date(),
    rationale: "Zero opportunities met the minimum 80% fit and <0.3 scam risk threshold. Workflow completed.",
    metadata: {
      totalEvaluated: state.discoveredJobs.length,
      approvedCount: 0,
      disqualifiedCount: state.discoveredJobs.length,
    },
  }

  const startTime = state.executionAuditLog[0]?.timestamp
    ? new Date(state.executionAuditLog[0].timestamp).getTime()
    : Date.now()

  logDiscoveryEvent({
    userId: state.userId,
    eventType: "CAREER_ORCHESTRATOR_RUN",
    metadata: {
      source: "career_orchestrator",
      status: "early_exit",
      jobsEvaluated: state.discoveredJobs.length,
      jobsStaged: 0,
      assetsCreated: 0,
      durationMs: Math.max(0, Date.now() - startTime),
      logs: [...state.executionAuditLog, exitLog],
    },
  })

  return {
    executionAuditLog: [exitLog],
  }
}

/**
 * Node 4: Application Asset Generator Node (REC-16 Cover Letter Agent)
 */
async function assetGeneratorNode(
  state: CareerOrchestratorStateType
): Promise<Partial<CareerOrchestratorStateType>> {
  const topOpportunities = state.approvedOpportunities.slice(0, 3)
  const packages: Record<string, ApplicationPackageItem> = {}

  const results = await Promise.allSettled(
    topOpportunities.map(async (opp) => {
      const materials = await generateApplicationMaterialsAgent(state.userId, opp.id, {
        jobTitle: opp.title,
        companyName: opp.company,
        jobUrl: opp.url,
        location: opp.location,
        notes: opp.matchRationale,
        salary: opp.salary || undefined,
      })

      return {
        jobId: opp.id,
        item: {
          coverLetter: materials.coverLetter,
          resumeBullets: materials.highlights,
          outreachPitch: materials.outreachPitch,
        },
      }
    })
  )

  for (const res of results) {
    if (res.status === "fulfilled") {
      packages[res.value.jobId] = res.value.item
    }
  }

  return {
    applicationPackages: packages,
    executionAuditLog: [
      {
        id: `audit-asset-${Date.now()}`,
        agent: "asset_generator",
        action: "GENERATE_APPLICATION_PACKAGES",
        timestamp: new Date(),
        rationale: `Generated personalized application packages for ${Object.keys(packages).length} opportunities.`,
        metadata: {
          assetsGenerated: Object.keys(packages).length,
        },
      },
    ],
  }
}

/**
 * Node 5: Persistence & Notification Node
 */
async function persistenceNode(
  state: CareerOrchestratorStateType
): Promise<Partial<CareerOrchestratorStateType>> {
  const targetOpps = state.approvedOpportunities.slice(0, 3)
  let stagedCount = 0

  for (const opp of targetOpps) {
    const existing = await withDbRetry(() =>
      prisma.application.findFirst({
        where: {
          userId: state.userId,
          companyName: opp.company,
          jobTitle: opp.title,
        },
      })
    )

    let applicationId = existing?.id

    if (existing) {
      await withDbRetry(() =>
        prisma.application.update({
          where: { id: existing.id },
          data: {
            status: "STAGED",
            jobUrl: opp.url,
            notes: `Discovered & staged via Career Orchestrator (Fit: ${opp.fitScore}%)`,
          },
        })
      )
    } else {
      const created = await withDbRetry(() =>
        prisma.application.create({
          data: {
            userId: state.userId,
            companyName: opp.company,
            jobTitle: opp.title,
            jobUrl: opp.url,
            source: "Career Orchestrator",
            status: "STAGED",
            applicationDate: new Date(),
            notes: `Discovered & staged via Career Orchestrator (Fit: ${opp.fitScore}%)`,
          },
        })
      )
      applicationId = created.id
    }

    stagedCount++

    const pkg = state.applicationPackages[opp.id]
    if (pkg && applicationId) {
      await withDbRetry(() =>
        prisma.applicationAnalysis.upsert({
          where: { applicationId },
          create: {
            applicationId,
            matchScore: opp.fitScore,
            confidence: "high",
            verdict: "Ready to Submit",
            rawAnalysis: pkg.coverLetter,
            resumeAdvice: { highlights: pkg.resumeBullets },
            applyStrategy: { outreachPitch: pkg.outreachPitch },
          },
          update: {
            matchScore: opp.fitScore,
            rawAnalysis: pkg.coverLetter,
            resumeAdvice: { highlights: pkg.resumeBullets },
            applyStrategy: { outreachPitch: pkg.outreachPitch },
          },
        })
      )
    }

    // Upsert UserJobMatch to STAGED
    await withDbRetry(() =>
      prisma.userJobMatch.upsert({
        where: {
          userId_jobId: { userId: state.userId, jobId: opp.id },
        },
        create: {
          userId: state.userId,
          jobId: opp.id,
          fitScore: opp.fitScore,
          matchRationale: opp.matchRationale,
          status: "STAGED",
          batchId: `orchestrator-${Date.now()}`,
        },
        update: {
          fitScore: opp.fitScore,
          matchRationale: opp.matchRationale,
          status: "STAGED",
        },
      })
    ).catch(() => null)
  }

  if (stagedCount > 0) {
    await withDbRetry(() =>
      prisma.notification.create({
        data: {
          userId: state.userId,
          title: "Career Orchestrator: Applications Staged",
          message: `Prepared and staged ${stagedCount} high-fit application package(s) matching your career goals.`,
          type: "ORCHESTRATOR_BATCH",
          link: "/applications",
        },
      })
    ).catch((err: Error) =>
      console.warn("[CareerOrchestrator] Notification warning:", err.message)
    )
  }

  return {
    executionAuditLog: [
      {
        id: `audit-persist-${Date.now()}`,
        agent: "persistence",
        action: "PERSIST_APPLICATIONS_AND_NOTIFY",
        timestamp: new Date(),
        rationale: `Upserted ${stagedCount} applications with status STAGED and notified candidate.`,
        metadata: {
          approvedCount: stagedCount,
        },
      },
    ],
  }
}

/**
 * Node 6: Learning Feedback & Telemetry Node
 */
async function learningFeedbackNode(
  state: CareerOrchestratorStateType
): Promise<Partial<CareerOrchestratorStateType>> {
  await invalidateUserImplicitPreferences(state.userId)

  logDiscoveryEvent({
    userId: state.userId,
    eventType: "BATCH_PUBLISHED",
    metadata: {
      source: "career_orchestrator",
      approvedCount: state.approvedOpportunities.length,
      topJobTitles: state.approvedOpportunities.slice(0, 3).map((j) => j.title),
    },
  })

  const learnLog: ExecutionAuditLogItem = {
    id: `audit-learn-${Date.now()}`,
    agent: "learning_feedback",
    action: "UPDATE_PREFERENCES_AND_TELEMETRY",
    timestamp: new Date(),
    rationale: "Invalidated implicit preferences cache and recorded discovery telemetry event.",
  }

  const startTime = state.executionAuditLog[0]?.timestamp
    ? new Date(state.executionAuditLog[0].timestamp).getTime()
    : Date.now()

  logDiscoveryEvent({
    userId: state.userId,
    eventType: "CAREER_ORCHESTRATOR_RUN",
    metadata: {
      source: "career_orchestrator",
      status: "completed",
      jobsEvaluated: state.discoveredJobs.length,
      jobsStaged: state.approvedOpportunities.length,
      assetsCreated: Object.keys(state.applicationPackages).length,
      durationMs: Math.max(0, Date.now() - startTime),
      logs: [...state.executionAuditLog, learnLog],
    },
  })

  return {
    executionAuditLog: [learnLog],
  }
}

/**
 * Constructs and compiles the deterministic Career Orchestrator StateGraph
 */
export function createCareerOrchestratorGraph() {
  const workflow = new StateGraph(CareerOrchestratorState)
    .addNode("discovery", discoveryNode)
    .addNode("evaluation", evaluationNode)
    .addNode("asset_generator", assetGeneratorNode)
    .addNode("persistence", persistenceNode)
    .addNode("learning_feedback", learningFeedbackNode)
    .addNode("early_exit", earlyExitNode)

    .addEdge(START, "discovery")
    .addEdge("discovery", "evaluation")

    .addConditionalEdges("evaluation", (state: CareerOrchestratorStateType) => {
      if (state.approvedOpportunities.length > 0) {
        return "asset_generator"
      }
      return "early_exit"
    })

    .addEdge("asset_generator", "persistence")
    .addEdge("persistence", "learning_feedback")
    .addEdge("learning_feedback", END)
    .addEdge("early_exit", END)

  return workflow.compile()
}
