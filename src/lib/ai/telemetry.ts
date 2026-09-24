import { getLangfuseInstance, flushLangfuse } from "./graph/telemetry"
import { sanitizePII } from "./pii-sanitizer"

export interface AITelemetryPayload {
  traceId: string
  userId: string
  sessionId?: string
  endpoint: string
  provider: string
  model: string
  promptTokens?: number
  completionTokens?: number
  latencyMs: number
  ttftMs?: number
  status: "success" | "error"
  error?: string
  toolCallsCount?: number
}

export interface TraceAIGenerationParams {
  name: string
  userId: string
  sessionId?: string
  model: string
  provider?: string
  input: unknown
  output?: unknown
  promptTokens?: number
  completionTokens?: number
  latencyMs: number
  status: "success" | "error"
  error?: unknown
  tags?: string[]
  metadata?: Record<string, unknown>
  flush?: boolean
}

/**
 * Recursively sanitizes any strings inside an input or output object to prevent PII leakage to Langfuse.
 */
function sanitizeForTelemetry(data: unknown): unknown {
  if (typeof data === "string") {
    return sanitizePII(data)
  }
  if (Array.isArray(data)) {
    return data.map(sanitizeForTelemetry)
  }
  if (data !== null && typeof data === "object") {
    const sanitizedObj: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data)) {
      sanitizedObj[key] = sanitizeForTelemetry(value)
    }
    return sanitizedObj
  }
  return data
}

/**
 * Records a full LLM Generation trace in Langfuse adhering to production best practices:
 * - Proper observation typing (trace + generation)
 * - PII masking on inputs & outputs
 * - Exact model & token accounting
 * - Latency, provider, and fallback metadata
 * - Optional serverless timeout-safe flush
 */
export async function traceAIGeneration(params: TraceAIGenerationParams): Promise<void> {
  const langfuse = getLangfuseInstance()
  if (!langfuse) return

  try {
    const env = process.env.NODE_ENV || "development"
    const defaultTags = [env, "career-track"]
    const tags = Array.from(new Set([...defaultTags, ...(params.tags || [])]))

    const traceId = `${params.name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const trace = langfuse.trace({
      id: traceId,
      name: params.name,
      userId: params.userId,
      sessionId: params.sessionId,
      tags,
      metadata: {
        provider: params.provider,
        status: params.status,
        ...(params.metadata || {}),
      },
    })

    const sanitizedInput = sanitizeForTelemetry(params.input)
    const sanitizedOutput = sanitizeForTelemetry(params.output)

    const totalTokens = (params.promptTokens ?? 0) + (params.completionTokens ?? 0)

    trace.generation({
      name: `${params.name}-generation`,
      model: params.model,
      input: sanitizedInput,
      output: sanitizedOutput,
      usage: {
        promptTokens: params.promptTokens,
        completionTokens: params.completionTokens,
        totalTokens: totalTokens > 0 ? totalTokens : undefined,
      },
      metadata: {
        latencyMs: params.latencyMs,
        provider: params.provider,
        error: params.error ? (params.error instanceof Error ? params.error.message : String(params.error)) : undefined,
      },
      level: params.status === "error" ? "ERROR" : "DEFAULT",
      statusMessage: params.status === "error" ? "Generation Failed" : "OK",
    })

    if (params.flush) {
      await flushLangfuse(1500)
    }
  } catch (err) {
    console.warn("[Langfuse Telemetry Generation Warning]:", err instanceof Error ? err.message : err)
  }
}

/**
 * Structured AI event logger for monitoring throughput, latency, token consumption, and errors.
 * Seamlessly emits standardized JSON and connects directly to Langfuse when configured.
 */
export function logAITransaction(data: AITelemetryPayload) {
  const structuredLog = {
    timestamp: new Date().toISOString(),
    service: "career-track-ai",
    ...data,
  }

  if (process.env.NODE_ENV === "production") {
    // In production, emit standardized JSON for log aggregators (Datadog, Axiom, Cloudwatch, Langfuse)
    console.log(JSON.stringify(structuredLog))
  } else {
    const totalTokens = (data.promptTokens ?? 0) + (data.completionTokens ?? 0)
    console.log(
      `[AI Telemetry] ${data.endpoint} | Model: ${data.model} | ${data.latencyMs}ms | Tokens: ${totalTokens} | Status: ${data.status}`
    )
  }

  // Connect to Langfuse for generation tracing
  const langfuse = getLangfuseInstance()
  if (langfuse) {
    try {
      const trace = langfuse.trace({
        id: data.traceId,
        name: data.endpoint,
        userId: data.userId,
        sessionId: data.sessionId,
        metadata: {
          provider: data.provider,
          status: data.status,
          toolCallsCount: data.toolCallsCount,
        },
      })

      trace.generation({
        name: `${data.endpoint}-generation`,
        model: data.model,
        usage: {
          promptTokens: data.promptTokens,
          completionTokens: data.completionTokens,
          totalTokens: (data.promptTokens ?? 0) + (data.completionTokens ?? 0),
        },
        metadata: {
          latencyMs: data.latencyMs,
          ttftMs: data.ttftMs,
          error: data.error,
        },
      })
    } catch (err) {
      console.warn("[Langfuse Telemetry Direct Log Warning]:", err)
    }
  }
}
