/* eslint-disable @typescript-eslint/no-explicit-any */
import crypto from "crypto"
import { LangfuseClient } from "@langfuse/client"
import { LangfuseSpanProcessor } from "@langfuse/otel"
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node"
import {
  startObservation,
  propagateAttributes,
  setLangfuseTracerProvider,
} from "@langfuse/tracing"
import { redactTelemetry } from "@/lib/ai/telemetry-redaction"
import { countTokens } from "@/lib/ai/token-counter"
import { recordAgentStepToRing } from "@/lib/ops/telemetry-ring"

export type TraceTaskCategory =
  | "chat_interactive"
  | "background_audit"
  | "weekly_memory_hygiene"
  | "job_discovery"
  | "ats_resume_tailor"
  | "mock_interview"
  | "telemetry_verification"

let langfuseClientInstance: LangfuseClient | null = null
let langfuseSpanProcessorInstance: LangfuseSpanProcessor | null = null
let tracerProviderInitialized = false

/**
 * Normalizes an arbitrary string, UUID, or trace identifier into a 32-character hexadecimal OpenTelemetry traceId.
 */
export function toOtelTraceId(id: string): string {
  if (!id) return crypto.randomBytes(16).toString("hex")
  const clean = id.replace(/-/g, "")
  if (/^[0-9a-f]{32}$/i.test(clean)) {
    return clean.toLowerCase()
  }
  return crypto.createHash("md5").update(id).digest("hex")
}

/**
 * Normalizes an arbitrary ID into a 16-character hexadecimal OpenTelemetry spanId.
 */
export function toOtelSpanId(id: string): string {
  if (!id) return crypto.randomBytes(8).toString("hex")
  const clean = id.replace(/-/g, "")
  if (/^[0-9a-f]{16}$/i.test(clean)) {
    return clean.toLowerCase()
  }
  return crypto.createHash("md5").update(id).digest("hex").slice(0, 16)
}

/**
 * Returns singleton Langfuse client for scoring, datasets, and API calls.
 * Gracefully returns null if keys are absent, ensuring no runtime crashes.
 */
export function getLangfuseInstance(): LangfuseClient | null {
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY
  const secretKey = process.env.LANGFUSE_SECRET_KEY
  const baseUrl = process.env.LANGFUSE_BASE_URL || process.env.LANGFUSE_HOST || "https://cloud.langfuse.com"

  if (!publicKey || !secretKey) {
    langfuseClientInstance = null
    return null
  }

  if (!langfuseClientInstance) {
    langfuseClientInstance = new LangfuseClient({
      publicKey,
      secretKey,
      baseUrl,
    })
  }

  return langfuseClientInstance
}

/**
 * Returns singleton Langfuse OpenTelemetry Span Processor, initializing
 * and registering an isolated NodeTracerProvider for @langfuse/tracing.
 */
export function getLangfuseSpanProcessor(): LangfuseSpanProcessor | null {
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY
  const secretKey = process.env.LANGFUSE_SECRET_KEY
  const baseUrl = process.env.LANGFUSE_BASE_URL || process.env.LANGFUSE_HOST || "https://cloud.langfuse.com"

  if (!publicKey || !secretKey) {
    langfuseSpanProcessorInstance = null
    tracerProviderInitialized = false
    return null
  }

  if (!langfuseSpanProcessorInstance) {
    langfuseSpanProcessorInstance = new LangfuseSpanProcessor({
      publicKey,
      secretKey,
      baseUrl,
      mask: ({ data }) => redactTelemetry(data),
      environment: process.env.LANGFUSE_TRACING_ENVIRONMENT || process.env.NODE_ENV,
      release: process.env.LANGFUSE_RELEASE,
    })

    if (!tracerProviderInitialized) {
      const provider = new NodeTracerProvider({
        spanProcessors: [langfuseSpanProcessorInstance],
      })
      setLangfuseTracerProvider(provider)
      tracerProviderInitialized = true
    }
  }

  return langfuseSpanProcessorInstance
}

/**
 * Builds standard, dynamic tags and metadata for Langfuse traces across all execution contexts.
 */
export function buildTraceTagsAndMetadata(params: {
  category: TraceTaskCategory
  userId: string
  sessionId?: string
  additionalTags?: string[]
  additionalMetadata?: Record<string, any>
}) {
  const env = process.env.NODE_ENV || "development"
  const defaultTags = [env, "career-track", params.category]
  const combinedTags = Array.from(new Set([...defaultTags, ...(params.additionalTags || [])]))

  const metadata: Record<string, any> = {
    environment: env,
    userId: params.userId,
    sessionId: params.sessionId || "anonymous",
    taskCategory: params.category,
    timestamp: new Date().toISOString(),
    ...(params.additionalMetadata || {}),
  }

  return { tags: combinedTags, metadata }
}

/**
 * Traces a LangGraph execution span or step adhering to Langfuse v4 observations-first model:
 * - Emits typed observations (`span`)
 * - Propagates correlating attributes (`userId`, `sessionId`, `traceName`, `tags`, `metadata`)
 * - Recursively redacts PII at the boundary
 */
export async function trackGraphExecution(params: {
  userId: string
  sessionId: string
  nodeName: string
  traceId?: string
  input: any
  output?: any
  error?: any
  startTime: number
  category?: TraceTaskCategory
}) {
  const durationMs = Date.now() - params.startTime
  const inputTokenCount = params.input ? countTokens(typeof params.input === "string" ? params.input : JSON.stringify(params.input)) : 0
  const outputTokenCount = params.output ? countTokens(typeof params.output === "string" ? params.output : JSON.stringify(params.output)) : 0

  // Always record to Redis Ops Ring Buffer (works even without Langfuse credentials)
  void recordAgentStepToRing({
    nodeName: params.nodeName,
    sessionId: params.sessionId,
    userId: params.userId,
    tokens: inputTokenCount + outputTokenCount,
    durationMs,
    status: params.error ? "error" : "success",
    error: params.error ? "Operation failed" : undefined,
  })

  const processor = getLangfuseSpanProcessor()
  if (!processor) return

  try {
    const { tags } = buildTraceTagsAndMetadata({
      category: params.category || "chat_interactive",
      userId: params.userId,
      sessionId: params.sessionId,
      additionalTags: [`node:${params.nodeName}`],
    })

    const otelTraceId = params.traceId ? toOtelTraceId(params.traceId) : undefined
    const otelSpanId = params.traceId ? toOtelSpanId(params.traceId) : undefined

    await propagateAttributes(
      {
        traceName: params.traceId ? "career-agent-run" : `career-agent-${params.nodeName}`,
        userId: params.userId,
        sessionId: params.sessionId,
        tags,
        metadata: {
          node: params.nodeName,
          taskCategory: params.category || "chat_interactive",
          inputTokens: String(inputTokenCount),
          outputTokens: String(outputTokenCount),
          totalTokens: String(inputTokenCount + outputTokenCount),
        },
      },
      async () => {
        const span = startObservation(
          params.nodeName,
          {
            input: redactTelemetry(params.input),
            output: redactTelemetry(params.output),
            level: params.error ? "ERROR" : "DEFAULT",
            statusMessage: params.error ? "Operation failed" : "OK",
            metadata: {
              node: params.nodeName,
              inputTokens: inputTokenCount,
              outputTokens: outputTokenCount,
              totalTokens: inputTokenCount + outputTokenCount,
              durationMs,
            },
          },
          {
            asType: "span",
            startTime: new Date(params.startTime),
            ...(otelTraceId && otelSpanId
              ? {
                  parentSpanContext: {
                    traceId: otelTraceId,
                    spanId: otelSpanId,
                    traceFlags: 1,
                  },
                }
              : {}),
          }
        )
        span.end()
      }
    )
  } catch (err) {
    console.warn("[Langfuse Telemetry Notice]:", err instanceof Error ? err.message : err)
  }
}

/**
 * Attaches quantitative score / feedback to a trace in Langfuse v4 (POST /api/public/scores)
 */
export async function scoreTrace(params: {
  id?: string
  traceId: string
  name: string
  value: number
  comment?: string
  dataType?: "NUMERIC" | "BOOLEAN"
}) {
  const langfuse = getLangfuseInstance()
  if (!langfuse) return

  try {
    const otelTraceId = toOtelTraceId(params.traceId)
    await langfuse.score.create({
      id: params.id,
      traceId: otelTraceId,
      name: params.name,
      value: params.value,
      comment: params.comment,
      dataType: params.dataType || "NUMERIC",
    })
  } catch (err) {
    console.warn("[Langfuse Score Notice]:", err instanceof Error ? err.message : err)
  }
}

/**
 * Flushes pending traces and scores to Langfuse with a strict timeout (default 1500ms).
 * Flushes both the OpenTelemetry LangfuseSpanProcessor and LangfuseClient queue.
 */
export async function flushLangfuse(timeoutMs = 1500): Promise<void> {
  const processor = getLangfuseSpanProcessor()
  const client = getLangfuseInstance()
  if (!processor && !client) return

  try {
    const promises: Promise<unknown>[] = []
    if (processor) promises.push(processor.forceFlush())
    if (client) promises.push(client.flush())

    const flushPromise = Promise.all(promises)
    const timeoutPromise = new Promise<void>((_, reject) =>
      setTimeout(() => reject(new Error(`Langfuse flush exceeded timeout of ${timeoutMs}ms`)), timeoutMs)
    )

    await Promise.race([flushPromise, timeoutPromise])
  } catch (err) {
    console.warn("[Langfuse Flush Notice]:", err instanceof Error ? err.message : err)
  }
}

/**
 * Gracefully shuts down Langfuse tracing and flushes pending events before exit.
 */
export async function shutdownLangfuse(timeoutMs = 3000): Promise<void> {
  const processor = getLangfuseSpanProcessor()
  const client = getLangfuseInstance()
  if (!processor && !client) return

  try {
    const promises: Promise<unknown>[] = []
    if (processor) promises.push(processor.shutdown())
    if (client) promises.push(client.flush())

    const shutdownPromise = Promise.all(promises)
    const timeoutPromise = new Promise<void>((_, reject) =>
      setTimeout(() => reject(new Error(`Langfuse shutdown exceeded timeout of ${timeoutMs}ms`)), timeoutMs)
    )

    await Promise.race([shutdownPromise, timeoutPromise])
  } catch (err) {
    console.warn("[Langfuse Shutdown Notice]:", err instanceof Error ? err.message : err)
  }
}
