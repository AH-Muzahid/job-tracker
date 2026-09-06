import { Annotation } from "@langchain/langgraph"
import type { ReRankedJobOpportunity } from "@/lib/discovery/ai-reranker"

export interface CandidateGoal {
  targetRole: string
  targetCompanies?: string[]
  maxTimelineDays?: number
}

export interface ApplicationPackageItem {
  coverLetter: string
  resumeBullets: string[]
  outreachPitch: string
}

export interface ExecutionAuditLogItem {
  id?: string
  agent: string
  action: string
  timestamp: Date
  rationale: string
  metadata?: {
    totalEvaluated?: number
    approvedCount?: number
    disqualifiedCount?: number
    averageFitScore?: number
    assetsGenerated?: number
    latencyMs?: number
  }
}

/**
 * Career Orchestrator State Schema (REC-18)
 * Channels for unifying Discovery, Evaluation, Application Assets, and Persistence.
 */
export const CareerOrchestratorState = Annotation.Root({
  userId: Annotation<string>({
    reducer: (_, update) => update,
    default: () => "",
  }),
  candidateGoal: Annotation<CandidateGoal>({
    reducer: (_, update) => update,
    default: () => ({ targetRole: "Software Engineer" }),
  }),
  discoveredJobs: Annotation<ReRankedJobOpportunity[]>({
    reducer: (_, update) => update,
    default: () => [],
  }),
  approvedOpportunities: Annotation<ReRankedJobOpportunity[]>({
    reducer: (_, update) => update,
    default: () => [],
  }),
  applicationPackages: Annotation<Record<string, ApplicationPackageItem>>({
    reducer: (curr, update) => ({ ...curr, ...update }),
    default: () => ({}),
  }),
  executionAuditLog: Annotation<ExecutionAuditLogItem[]>({
    reducer: (curr, update) => curr.concat(update),
    default: () => [],
  }),
})

export type CareerOrchestratorStateType = typeof CareerOrchestratorState.State
