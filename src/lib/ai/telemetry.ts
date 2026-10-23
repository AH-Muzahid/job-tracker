import {
  getLangfuseSpanProcessor,
  flushLangfuse,
  toOtelTraceId,
} from "./graph/telemetry"
import { redactTelemetry } from "./telemetry-redaction"
import { recordLLMCallToRing } from "@/lib/ops/telemetry-ring"
import { startObservation, propagateAttributes } from "@langfuse/tracing"

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
const sanitizeForTelemetry = redactTelemetry

/**
 * Records a full LLM Generation trace in Langfuse adhering to production best practices in v4:
 * - Observations-first data model with typed root span + generation child observation
 * - Propagates correlating attributes (userId, sessionId, traceName, tags, metadata)
 * - PII masking on inputs & outputs
 * - Exact model & token accounting
 * - Latency, provider, and fallback metadata
 * - Optional serverless timeout-safe flush
 */
export async function traceAIGeneration(params: TraceAIGenerationParams): Promise<void> {
  // Always record to Redis Ops Ring Buffer (works even without Langfuse credentials)
  void recordLLMCallToRing({
    name: params.name,
    model: params.model,
    provider: params.provider,
    promptTokens: params.promptTokens,
    completionTokens: params.completionTokens,
    latencyMs: params.latencyMs,
    status: params.status,
    error: params.error ? "Generation failed" : undefined,
    userId: params.userId,
    sessionId: params.sessionId,
  })

  const processor = getLangfuseSpanProcessor()
  if (!processor) return

  try {
    const env = process.env.NODE_ENV || "development"
    const defaultTags = [env, "career-track"]
    const tags = Array.from(new Set([...defaultTags, ...(params.tags || [])]))

    const sanitizedInput = sanitizeForTelemetry(params.input)
    const sanitizedOutput = sanitizeForTelemetry(params.output)
    const totalTokens = (params.promptTokens ?? 0) + (params.completionTokens ?? 0)

    await propagateAttributes(
      {
        traceName: params.name,
        userId: params.userId,
        sessionId: params.sessionId,
        tags,
        metadata: {
          provider: params.provider || "unknown",
          status: params.status,
          latencyMs: String(params.latencyMs),
          ...(params.metadata
            ? Object.fromEntries(
                Object.entries(params.metadata).map(([k, v]) => [
                  k,
                  typeof v === "object" ? JSON.stringify(v) : String(v),
                ])
              )
            : {}),
        },
      },
      async () => {
        // Root observation captures overall input & output per v4 architecture
        const rootObs = startObservation(
          params.name,
          {
            input: sanitizedInput,
            output: sanitizedOutput,
            level: params.status === "error" ? "ERROR" : "DEFAULT",
            statusMessage: params.status === "error" ? "Generation Failed" : "OK",
            metadata: {
              provider: params.provider,
              latencyMs: params.latencyMs,
              error: params.error ? "Generation failed" : undefined,
            },
          },
          { asType: "span" }
        )

        // Nested child generation observation captures specific LLM parameters and token usage
        const gen = rootObs.startObservation(
          `${params.name}-generation`,
          {
            model: params.model,
            input: sanitizedInput,
            output: sanitizedOutput,
            usageDetails: {
              promptTokens: params.promptTokens,
              completionTokens: params.completionTokens,
              totalTokens: totalTokens > 0 ? totalTokens : undefined,
            },
            metadata: {
              latencyMs: params.latencyMs,
              provider: params.provider,
              error: params.error ? "Generation failed" : undefined,
            },
            level: params.status === "error" ? "ERROR" : "DEFAULT",
            statusMessage: params.status === "error" ? "Generation Failed" : "OK",
          },
          { asType: "generation" }
        )
        gen.end()
        rootObs.end()
      }
    )

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

  // Connect to Langfuse for generation tracing in v4 observations-first model
  const processor = getLangfuseSpanProcessor()
  if (processor) {
    const otelTraceId = toOtelTraceId(data.traceId)
    const totalTokens = (data.promptTokens ?? 0) + (data.completionTokens ?? 0)

    void propagateAttributes(
      {
        traceName: data.endpoint,
        userId: data.userId,
        sessionId: data.sessionId,
        metadata: {
          provider: data.provider,
          status: data.status,
          toolCallsCount: String(data.toolCallsCount ?? 0),
        },
      },
      async () => {
        const rootObs = startObservation(
          data.endpoint,
          {
            level: data.status === "error" ? "ERROR" : "DEFAULT",
            statusMessage: data.status === "error" ? "Transaction Failed" : "OK",
            metadata: {
              provider: data.provider,
              status: data.status,
              latencyMs: data.latencyMs,
              ttftMs: data.ttftMs,
            },
          },
          {
            asType: "span",
            parentSpanContext: {
              traceId: otelTraceId,
              spanId: otelTraceId.slice(0, 16),
              traceFlags: 1,
            },
          }
        )

        const gen = rootObs.startObservation(
          `${data.endpoint}-generation`,
          {
            model: data.model,
            usageDetails: {
              promptTokens: data.promptTokens,
              completionTokens: data.completionTokens,
              totalTokens: totalTokens > 0 ? totalTokens : undefined,
            },
            metadata: {
              latencyMs: data.latencyMs,
              ttftMs: data.ttftMs,
              error: data.error ? "Generation failed" : undefined,
            },
          },
          { asType: "generation" }
        )
        gen.end()
        rootObs.end()
      }
    ).catch((err) => {
      console.warn("[Langfuse Telemetry Direct Log Warning]:", err)
    })
  }
}
