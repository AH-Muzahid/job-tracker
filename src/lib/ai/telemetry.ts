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
}
