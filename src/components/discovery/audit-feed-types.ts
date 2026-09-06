export interface OrchestratorAuditItem {
  id: string
  agent: "discovery" | "evaluation" | "asset_generator" | "persistence" | "learning_feedback" | "early_exit"
  action: string
  timestamp: string | Date
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

export interface OrchestratorExecutionSummary {
  lastRunAt: string | Date | null
  status: "idle" | "running" | "completed" | "early_exit" | "failed"
  jobsEvaluated: number
  jobsStaged: number
  assetsCreated: number
  durationMs: number
  logs: OrchestratorAuditItem[]
}
