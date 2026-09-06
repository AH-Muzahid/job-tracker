import { inngest } from "../client"
import { createCareerOrchestratorGraph } from "@/lib/ai/graph/workflows/career-orchestrator"
import type { CandidateGoal } from "@/lib/ai/graph/state/career-orchestrator-state"

export const careerOrchestratorPipeline = inngest.createFunction(
  {
    id: "career-orchestrator-pipeline",
    name: "Career Orchestrator Autonomous Pipeline (REC-18)",
    triggers: [{ event: "career/orchestrator.execute" }],
  },
  async ({ step, event }) => {
    const { userId, candidateGoal } = event.data as {
      userId: string
      candidateGoal?: CandidateGoal
    }

    if (!userId) {
      throw new Error("Missing required 'userId' in career/orchestrator.execute payload")
    }

    const result = await step.run("execute-orchestrator-graph", async () => {
      const graph = createCareerOrchestratorGraph()
      const finalState = await graph.invoke({
        userId,
        candidateGoal: candidateGoal || { targetRole: "Software Engineer" },
      })

      return {
        userId: finalState.userId,
        discoveredCount: finalState.discoveredJobs.length,
        approvedCount: finalState.approvedOpportunities.length,
        packagesCount: Object.keys(finalState.applicationPackages).length,
        auditLogCount: finalState.executionAuditLog.length,
        lastAction: finalState.executionAuditLog[finalState.executionAuditLog.length - 1]?.action,
      }
    })

    return result
  }
)
