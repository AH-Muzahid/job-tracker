/* eslint-disable @typescript-eslint/no-explicit-any */
import { Langfuse } from "langfuse"

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
