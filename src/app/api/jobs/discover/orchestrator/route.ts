export const dynamic = "force-dynamic"

import { NextRequest } from "next/server"
import { getInternalUserId } from "@/lib/auth"
import { ResponseUtil } from "@/lib/api-response"
import { checkDistributedRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { prisma } from "@/lib/prisma"
import { createCareerOrchestratorGraph } from "@/lib/ai/graph/workflows/career-orchestrator"
import type { OrchestratorExecutionSummary, OrchestratorAuditItem } from "@/components/discovery/audit-feed-types"

export async function GET(_request: NextRequest) {
  const userId = await getInternalUserId()
  if (!userId) {
    return ResponseUtil.unauthorized()
  }

  const rateLimit = await checkDistributedRateLimit(`orchestrator:get:${userId}`, 60, 60)
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit)
  }

  try {
    const latestRun = await prisma.discoveryEvent.findFirst({
      where: {
        userId,
        eventType: "CAREER_ORCHESTRATOR_RUN",
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    if (latestRun && latestRun.metadata && typeof latestRun.metadata === "object") {
      const meta = latestRun.metadata as Record<string, unknown>
      const rawLogs = Array.isArray(meta.logs) ? meta.logs : []
      const validAgents = new Set<string>([
        "discovery",
        "evaluation",
        "asset_generator",
        "persistence",
        "learning_feedback",
        "early_exit",
      ])

      const logs: OrchestratorAuditItem[] = rawLogs.map((log: Record<string, unknown>, idx: number) => {
        let agent = (log.agent || "discovery") as OrchestratorAuditItem["agent"]
        if (!validAgents.has(agent)) {
          if (agent === ("DiscoveryAgent" as unknown)) agent = "discovery"
          else if (agent === ("EvaluationAgent" as unknown)) agent = "evaluation"
          else if (agent === ("AssetGeneratorAgent" as unknown)) agent = "asset_generator"
          else if (agent === ("PersistenceAgent" as unknown)) agent = "persistence"
          else if (agent === ("LearningFeedbackAgent" as unknown)) agent = "learning_feedback"
          else agent = "discovery"
        }

        return {
          id: (log.id as string) || `log-${latestRun.id}-${idx}`,
          agent,
          action: String(log.action || "ORCHESTRATOR_STEP"),
          timestamp: (log.timestamp as string) || latestRun.createdAt.toISOString(),
          rationale: String(log.rationale || ""),
          metadata: (log.metadata as OrchestratorAuditItem["metadata"]) || undefined,
        }
      })

      const summary: OrchestratorExecutionSummary = {
        lastRunAt: latestRun.createdAt,
        status: (meta.status as OrchestratorExecutionSummary["status"]) || "completed",
        jobsEvaluated: typeof meta.jobsEvaluated === "number" ? meta.jobsEvaluated : 0,
        jobsStaged: typeof meta.jobsStaged === "number" ? meta.jobsStaged : 0,
        assetsCreated: typeof meta.assetsCreated === "number" ? meta.assetsCreated : 0,
        durationMs: typeof meta.durationMs === "number" ? meta.durationMs : 0,
        logs,
      }

      return ResponseUtil.success(summary)
    }

    const summary: OrchestratorExecutionSummary = {
      lastRunAt: null,
      status: "idle",
      jobsEvaluated: 0,
      jobsStaged: 0,
      assetsCreated: 0,
      durationMs: 0,
      logs: [],
    }

    return ResponseUtil.success(summary)
  } catch (error: unknown) {
    const err = error as Error
    console.error("[CareerOrchestrator API] GET Error:", err)
    return ResponseUtil.error(err.message || "Failed to retrieve orchestrator summary", 500)
  }
}

export async function POST(request: NextRequest) {
  const userId = await getInternalUserId()
  if (!userId) {
    return ResponseUtil.unauthorized()
  }

  // Rate limit manual orchestrator triggers (5 calls / min)
  const rateLimit = await checkDistributedRateLimit(`orchestrator:post:${userId}`, 5, 60)
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit)
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      targetRole?: string
      targetCompanies?: string[]
    }

    const userProfile = await prisma.userProfile.findUnique({
      where: { userId },
      select: { targetRoles: true },
    })

    const targetRole =
      body.targetRole ||
      (userProfile?.targetRoles && userProfile.targetRoles.length > 0
        ? userProfile.targetRoles[0]
        : "Software Engineer")

    const startTime = Date.now()
    const graph = createCareerOrchestratorGraph()
    const finalState = await graph.invoke({
      userId,
      candidateGoal: {
        targetRole,
        targetCompanies: body.targetCompanies,
      },
    })
    const durationMs = Date.now() - startTime

    const validAgents = new Set<string>([
      "discovery",
      "evaluation",
      "asset_generator",
      "persistence",
      "learning_feedback",
      "early_exit",
    ])

    const logs: OrchestratorAuditItem[] = finalState.executionAuditLog.map((log, idx) => {
      let agent = log.agent as OrchestratorAuditItem["agent"]
      if (!validAgents.has(agent)) {
        if (agent === ("DiscoveryAgent" as unknown)) agent = "discovery"
        else if (agent === ("EvaluationAgent" as unknown)) agent = "evaluation"
        else if (agent === ("AssetGeneratorAgent" as unknown)) agent = "asset_generator"
        else if (agent === ("PersistenceAgent" as unknown)) agent = "persistence"
        else if (agent === ("LearningFeedbackAgent" as unknown)) agent = "learning_feedback"
        else agent = "discovery"
      }

      return {
        id: log.id || `log-${Date.now()}-${idx}`,
        agent,
        action: log.action,
        timestamp: log.timestamp,
        rationale: log.rationale,
        metadata: log.metadata,
      }
    })

    const status: OrchestratorExecutionSummary["status"] =
      finalState.approvedOpportunities.length > 0 ? "completed" : "early_exit"

    const summary: OrchestratorExecutionSummary = {
      lastRunAt: new Date(),
      status,
      jobsEvaluated: finalState.discoveredJobs.length,
      jobsStaged: finalState.approvedOpportunities.length,
      assetsCreated: Object.keys(finalState.applicationPackages).length,
      durationMs,
      logs,
    }

    return ResponseUtil.success(summary)
  } catch (error: unknown) {
    const err = error as Error
    console.error("[CareerOrchestrator API] POST Error:", err)
    return ResponseUtil.error(err.message || "Failed to execute career orchestrator", 500)
  }
}
