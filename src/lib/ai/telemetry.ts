import { getLangfuseInstance } from "./graph/telemetry"

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
