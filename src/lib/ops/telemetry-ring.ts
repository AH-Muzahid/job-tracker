import { getRedisClient } from "@/lib/redis"

export interface LLMCallRingItem {
  id: string
  name: string
  provider: string
  model: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  latencyMs: number
  status: "success" | "error"
  error?: string
  userId?: string
  sessionId?: string
  estimatedCostUsd: number
  timestamp: string
}

export interface AgentStepRingItem {
  id: string
  nodeName: string
  sessionId: string
  userId?: string
  tokens: number
  durationMs: number
  status: "success" | "error"
  error?: string
  timestamp: string
}

export interface JobRunRingItem {
  id: string
  functionId: string
  eventId?: string
  status: "completed" | "failed" | "running"
  durationMs: number
  error?: string
  startedAt: string
  details?: Record<string, unknown>
  logs?: string[]
}

export interface OpsMetricsSummary {
  totalLLMCalls: number
  totalTokens: number
  promptTokens: number
  completionTokens: number
  totalCostUsd: number
  avgLatencyMs: number
  errorCount: number
  successRate: number
  activePipelinesCount: number
  recentJobsCount: number
  jobSuccessRate: number
}

const REDIS_KEYS = {
  LLM_RECENT: "ops:llm:recent",
  AGENT_RECENT: "ops:agent:recent",
  JOB_RECENT: "ops:job:recent",
  DAILY_STATS: (date: string) => `ops:stats:daily:${date}`,
}

const MAX_RING_BUFFER_SIZE = 50

/**
 * Calculates estimated USD cost based on published frontier and small model rates.
 */
export function estimateTokenCost(model: string, promptTokens = 0, completionTokens = 0): number {
  const m = (model || "").toLowerCase()
  let inputRate = 1.50 // default per 1M tokens
  let outputRate = 5.00 // default per 1M tokens

  if (m.includes("gpt-4o-mini")) {
    inputRate = 0.15
    outputRate = 0.60
  } else if (m.includes("gpt-4o")) {
    inputRate = 2.50
    outputRate = 10.00
  } else if (m.includes("claude-3-5-sonnet") || m.includes("claude-3.5-sonnet")) {
    inputRate = 3.00
    outputRate = 15.00
  } else if (m.includes("gemini") && m.includes("flash")) {
    inputRate = 0.075
    outputRate = 0.30
  } else if (m.includes("text-embedding-3")) {
    inputRate = 0.02
    outputRate = 0.00
  }

  const cost = (promptTokens / 1_000_000) * inputRate + (completionTokens / 1_000_000) * outputRate
  return Math.round(cost * 10000) / 10000
}

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Non-blocking recording of an LLM generation call into Redis ring buffer & stats.
 */
export async function recordLLMCallToRing(params: {
  name: string
  model?: string
  provider?: string
  promptTokens?: number
  completionTokens?: number
  latencyMs?: number
  status: "success" | "error"
  error?: string
  userId?: string
  sessionId?: string
}): Promise<void> {
  const redis = getRedisClient()
  if (!redis) return

  try {
    const promptTokens = params.promptTokens || 0
    const completionTokens = params.completionTokens || 0
    const totalTokens = promptTokens + completionTokens
    const model = params.model || "unknown-model"
    const cost = estimateTokenCost(model, promptTokens, completionTokens)

    const item: LLMCallRingItem = {
      id: `llm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: params.name,
      provider: params.provider || "openai",
      model,
      promptTokens,
      completionTokens,
      totalTokens,
      latencyMs: Math.round(params.latencyMs || 0),
      status: params.status,
      error: params.error,
      userId: params.userId,
      sessionId: params.sessionId,
      estimatedCostUsd: cost,
      timestamp: new Date().toISOString(),
    }

    const today = getTodayKey()
    const statsKey = REDIS_KEYS.DAILY_STATS(today)

    await Promise.allSettled([
      // 1. Push to ring buffer & trim
      (async () => {
        await redis.lpush(REDIS_KEYS.LLM_RECENT, JSON.stringify(item))
        await redis.ltrim(REDIS_KEYS.LLM_RECENT, 0, MAX_RING_BUFFER_SIZE - 1)
        await redis.expire(REDIS_KEYS.LLM_RECENT, 86400 * 7) // 7 days retention
      })(),
      // 2. Increment daily aggregation counters
      (async () => {
        await redis.hincrby(statsKey, "totalCalls", 1)
        await redis.hincrby(statsKey, "promptTokens", promptTokens)
        await redis.hincrby(statsKey, "completionTokens", completionTokens)
        await redis.hincrby(statsKey, "totalTokens", totalTokens)
        await redis.hincrby(statsKey, "totalLatencyMs", Math.round(params.latencyMs || 0))
        if (params.status === "error") {
          await redis.hincrby(statsKey, "errorCount", 1)
        }
        await redis.expire(statsKey, 86400 * 14) // 14 days retention
      })(),
    ])
  } catch (err) {
    console.warn("[Ops Telemetry Ring] Failed to record LLM call:", err)
  }
}

/**
 * Returns recent LLM calls from ring buffer.
 */
export async function getRecentLLMCalls(limit = 30): Promise<LLMCallRingItem[]> {
  const redis = getRedisClient()
  if (!redis) return []

  try {
    const rawItems = await redis.lrange(REDIS_KEYS.LLM_RECENT, 0, limit - 1)
    return (rawItems || []).map((str) => {
      try {
        return typeof str === "string" ? JSON.parse(str) : str
      } catch {
        return null
      }
    }).filter(Boolean) as LLMCallRingItem[]
  } catch (err) {
    console.warn("[Ops Telemetry Ring] Failed to get recent LLM calls:", err)
    return []
  }
}

/**
 * Non-blocking recording of an Agent execution step into Redis ring buffer.
 */
export async function recordAgentStepToRing(params: {
  nodeName: string
  sessionId: string
  userId?: string
  tokens?: number
  durationMs?: number
  status: "success" | "error"
  error?: string
}): Promise<void> {
  const redis = getRedisClient()
  if (!redis) return

  try {
    const item: AgentStepRingItem = {
      id: `agent_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      nodeName: params.nodeName,
      sessionId: params.sessionId,
      userId: params.userId,
      tokens: params.tokens || 0,
      durationMs: Math.round(params.durationMs || 0),
      status: params.status,
      error: params.error,
      timestamp: new Date().toISOString(),
    }

    await redis.lpush(REDIS_KEYS.AGENT_RECENT, JSON.stringify(item))
    await redis.ltrim(REDIS_KEYS.AGENT_RECENT, 0, MAX_RING_BUFFER_SIZE - 1)
    await redis.expire(REDIS_KEYS.AGENT_RECENT, 86400 * 7)
  } catch (err) {
    console.warn("[Ops Telemetry Ring] Failed to record Agent step:", err)
  }
}

/**
 * Returns recent Agent steps from ring buffer.
 */
export async function getRecentAgentSteps(limit = 30): Promise<AgentStepRingItem[]> {
  const redis = getRedisClient()
  if (!redis) return []

  try {
    const rawItems = await redis.lrange(REDIS_KEYS.AGENT_RECENT, 0, limit - 1)
    return (rawItems || []).map((str) => {
      try {
        return typeof str === "string" ? JSON.parse(str) : str
      } catch {
        return null
      }
    }).filter(Boolean) as AgentStepRingItem[]
  } catch (err) {
    console.warn("[Ops Telemetry Ring] Failed to get recent Agent steps:", err)
    return []
  }
}

/**
 * Non-blocking recording of Inngest Job execution into Redis ring buffer.
 */
export async function recordJobRunToRing(params: {
  functionId: string
  eventId?: string
  status: "completed" | "failed" | "running"
  durationMs?: number
  error?: string
  startedAt?: string
  details?: Record<string, unknown>
  logs?: string[]
}): Promise<void> {
  const redis = getRedisClient()
  if (!redis) return

  try {
    const item: JobRunRingItem = {
      id: `job_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      functionId: params.functionId,
      eventId: params.eventId,
      status: params.status,
      durationMs: Math.round(params.durationMs || 0),
      error: params.error,
      startedAt: params.startedAt || new Date().toISOString(),
      details: params.details,
      logs: params.logs || [],
    }

    await redis.lpush(REDIS_KEYS.JOB_RECENT, JSON.stringify(item))
    await redis.ltrim(REDIS_KEYS.JOB_RECENT, 0, MAX_RING_BUFFER_SIZE - 1)
    await redis.expire(REDIS_KEYS.JOB_RECENT, 86400 * 7)
  } catch (err) {
    console.warn("[Ops Telemetry Ring] Failed to record Job run:", err)
  }
}

/**
 * Returns recent Inngest Job runs from ring buffer.
 */
export async function getRecentJobRuns(limit = 30): Promise<JobRunRingItem[]> {
  const redis = getRedisClient()
  if (!redis) return []

  try {
    const rawItems = await redis.lrange(REDIS_KEYS.JOB_RECENT, 0, limit - 1)
    return (rawItems || []).map((str) => {
      try {
        return typeof str === "string" ? JSON.parse(str) : str
      } catch {
        return null
      }
    }).filter(Boolean) as JobRunRingItem[]
  } catch (err) {
    console.warn("[Ops Telemetry Ring] Failed to get recent Job runs:", err)
    return []
  }
}

/**
 * Aggregates all live metrics for the Admin KPI strip and high-level charts.
 */
export async function getOpsMetricsSummary(): Promise<OpsMetricsSummary> {
  const redis = getRedisClient()
  const emptySummary: OpsMetricsSummary = {
    totalLLMCalls: 0,
    totalTokens: 0,
    promptTokens: 0,
    completionTokens: 0,
    totalCostUsd: 0,
    avgLatencyMs: 0,
    errorCount: 0,
    successRate: 100,
    activePipelinesCount: 14,
    recentJobsCount: 0,
    jobSuccessRate: 100,
  }

  if (!redis) return emptySummary

  try {
    const today = getTodayKey()
    const statsKey = REDIS_KEYS.DAILY_STATS(today)

    const [statsRaw, recentLLMs, recentJobs] = await Promise.all([
      redis.hgetall(statsKey).catch(() => ({})),
      getRecentLLMCalls(50),
      getRecentJobRuns(50),
    ])

    const stats = (statsRaw || {}) as Record<string, string | number>
    const totalCalls = Number(stats.totalCalls || recentLLMs.length || 0)
    const promptTokens = Number(stats.promptTokens || recentLLMs.reduce((acc, c) => acc + c.promptTokens, 0))
    const completionTokens = Number(stats.completionTokens || recentLLMs.reduce((acc, c) => acc + c.completionTokens, 0))
    const totalTokens = Number(stats.totalTokens || promptTokens + completionTokens)
    const totalLatencyMs = Number(stats.totalLatencyMs || recentLLMs.reduce((acc, c) => acc + c.latencyMs, 0))
    const errorCount = Number(stats.errorCount || recentLLMs.filter((c) => c.status === "error").length)

    const avgLatencyMs = totalCalls > 0 ? Math.round(totalLatencyMs / totalCalls) : 0
    const successRate = totalCalls > 0 ? Math.round(((totalCalls - errorCount) / totalCalls) * 1000) / 10 : 100

    const totalCostUsd = recentLLMs.reduce((acc, c) => acc + (c.estimatedCostUsd || 0), 0)

    const jobSuccessCount = recentJobs.filter((j) => j.status === "completed").length
    const jobSuccessRate = recentJobs.length > 0
      ? Math.round((jobSuccessCount / recentJobs.length) * 1000) / 10
      : 100

    return {
      totalLLMCalls: totalCalls,
      totalTokens,
      promptTokens,
      completionTokens,
      totalCostUsd: Math.round(totalCostUsd * 1000) / 1000,
      avgLatencyMs,
      errorCount,
      successRate,
      activePipelinesCount: 14,
      recentJobsCount: recentJobs.length,
      jobSuccessRate,
    }
  } catch (err) {
    console.warn("[Ops Telemetry Ring] Failed to get metrics summary:", err)
    return emptySummary
  }
}
