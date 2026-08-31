/* eslint-disable @typescript-eslint/no-explicit-any */
import { Langfuse } from "langfuse"
import { CallbackHandler } from "@langfuse/langchain"

let langfuseInstance: Langfuse | null = null

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
 * Creates an official LangChain / LangGraph CallbackHandler for automated tracing
 */
export function createLangfuseCallbackHandler(params: {
  userId: string
  sessionId?: string
  tags?: string[]
  metadata?: Record<string, any>
}): CallbackHandler | null {
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY
  const secretKey = process.env.LANGFUSE_SECRET_KEY

  if (!publicKey || !secretKey) {
    return null
  }

  return new CallbackHandler({
    userId: params.userId,
    sessionId: params.sessionId,
    tags: params.tags || ["production", "career-agent"],
    traceMetadata: params.metadata,
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
}) {
  const langfuse = getLangfuseInstance()
  if (!langfuse) return

  try {
    const trace = langfuse.trace({
      id: `${params.sessionId}-${params.startTime}`,
      name: `career-agent-${params.nodeName}`,
      userId: params.userId,
      sessionId: params.sessionId,
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
    console.warn("[Langfuse Telemetry Warning]:", err)
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
    console.warn("[Langfuse Score Warning]:", err)
  }
}

/**
 * Flushes pending traces to Langfuse (essential in serverless & Edge runtimes)
 */
export async function flushLangfuse(): Promise<void> {
  const langfuse = getLangfuseInstance()
  if (!langfuse) return

  try {
    await langfuse.flushAsync()
  } catch (err) {
    console.warn("[Langfuse Flush Warning]:", err)
  }
}
