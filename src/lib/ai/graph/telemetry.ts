/* eslint-disable @typescript-eslint/no-explicit-any */
import { Langfuse } from "langfuse"
import { CallbackHandler } from "@langfuse/langchain"

export type TraceTaskCategory =
  | "chat_interactive"
  | "background_audit"
  | "weekly_memory_hygiene"
  | "job_discovery"
  | "ats_resume_tailor"
  | "mock_interview"
  | "telemetry_verification"

let langfuseInstance: Langfuse | null = null

/**
 * Returns singleton Langfuse client if credentials are configured.
 * Gracefully returns null if keys are absent, ensuring no runtime crashes.
 */
export function getLangfuseInstance(): Langfuse | null {
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY
  const secretKey = process.env.LANGFUSE_SECRET_KEY
  const baseUrl = process.env.LANGFUSE_BASE_URL || "https://cloud.langfuse.com"

  if (!publicKey || !secretKey) {
    return null
  }

  if (!langfuseInstance) {
    langfuseInstance = new Langfuse({
      publicKey,
      secretKey,
      baseUrl,
    })
  }

  return langfuseInstance
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
 * Creates an official LangChain / LangGraph CallbackHandler for automated tracing.
 * Returns null safely if Langfuse credentials are not provided.
 */
export function createLangfuseCallbackHandler(params: {
  userId: string
  sessionId?: string
  category?: TraceTaskCategory
  tags?: string[]
  metadata?: Record<string, any>
}): CallbackHandler | null {
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY
  const secretKey = process.env.LANGFUSE_SECRET_KEY

  if (!publicKey || !secretKey) {
    return null
  }

  const { tags, metadata } = buildTraceTagsAndMetadata({
    category: params.category || "chat_interactive",
    userId: params.userId,
    sessionId: params.sessionId,
    additionalTags: params.tags,
    additionalMetadata: params.metadata,
  })

  return new CallbackHandler({
    userId: params.userId,
    sessionId: params.sessionId,
    tags,
    traceMetadata: metadata,
  })
}

/**
 * Traces a LangGraph execution span or step
 */
export async function trackGraphExecution(params: {
  userId: string
  sessionId: string
  nodeName: string
  input: any
  output?: any
  error?: any
  startTime: number
  category?: TraceTaskCategory
}) {
  const langfuse = getLangfuseInstance()
  if (!langfuse) return

  try {
    const { tags } = buildTraceTagsAndMetadata({
      category: params.category || "chat_interactive",
      userId: params.userId,
      sessionId: params.sessionId,
      additionalTags: [`node:${params.nodeName}`],
    })

    const trace = langfuse.trace({
      id: `${params.sessionId}-${params.startTime}`,
      name: `career-agent-${params.nodeName}`,
      userId: params.userId,
      sessionId: params.sessionId,
      tags,
      metadata: {
        node: params.nodeName,
      },
    })

    trace.span({
      name: params.nodeName,
      input: params.input,
      output: params.output,
      level: params.error ? "ERROR" : "DEFAULT",
      statusMessage: params.error ? String(params.error) : "OK",
    })
  } catch (err) {
    console.warn("[Langfuse Telemetry Notice]:", err instanceof Error ? err.message : err)
  }
}

/**
 * Attaches quantitative score / feedback to a trace in Langfuse
 */
export async function scoreTrace(params: {
  traceId: string
  name: string
  value: number
  comment?: string
  dataType?: "NUMERIC" | "BOOLEAN"
}) {
  const langfuse = getLangfuseInstance()
  if (!langfuse) return

  try {
    langfuse.score({
      traceId: params.traceId,
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
 * Flushes pending traces to Langfuse with a strict timeout (default 1500ms).
 * Prevents serverless functions (e.g. Vercel, Node) from hanging if Langfuse network experiences latency.
 */
export async function flushLangfuse(timeoutMs = 1500): Promise<void> {
  const langfuse = getLangfuseInstance()
  if (!langfuse) return

  try {
    const flushPromise = langfuse.flushAsync()
    const timeoutPromise = new Promise<void>((_, reject) =>
      setTimeout(() => reject(new Error(`Langfuse flush exceeded timeout of ${timeoutMs}ms`)), timeoutMs)
    )

    await Promise.race([flushPromise, timeoutPromise])
  } catch (err) {
    console.warn("[Langfuse Flush Notice]:", err instanceof Error ? err.message : err)
  }
}
