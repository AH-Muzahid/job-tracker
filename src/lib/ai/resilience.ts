/* eslint-disable @typescript-eslint/no-explicit-any */
import { generateText, streamText } from "ai"
import type { LanguageModelV4 } from "@ai-sdk/provider"
import { getProvider, AIProviderConfig } from "./client"
import { getUserAIConfig, getAllUserAIProfiles } from "./config"
import { LoopDetector } from "./loop-detector"
import { getToolRisk, ToolRisk } from "./tool-registry"

export interface ResilientModelCandidate {
  id: string
  name: string
  providerType: AIProviderConfig["providerType"]
  model: LanguageModelV4
}

export interface ResilientExecutionResult {
  text: string
  modelUsed: string
  providerUsed: string
  attemptsCount: number
  fallbackTriggered: boolean
  durationMs: number
}

/**
 * Checks if an error is transient and retryable (Rate Limit, Server Timeout, Gateway Error, Network Drop)
 */
export function isRetryableError(err: unknown): boolean {
  if (!err) return false
  const errorObj = err as any
  const status = errorObj?.status || errorObj?.statusCode || errorObj?.response?.status
  const message = (errorObj?.message || "").toLowerCase()
  const code = errorObj?.code || ""

  // Rate limits & Server errors
  if (status === 429 || status === 500 || status === 502 || status === 503 || status === 504) {
    return true
  }

  // Network / Abort / Timeout errors
  if (
    message.includes("timeout") ||
    message.includes("rate limit") ||
    message.includes("econnreset") ||
    message.includes("etimedout") ||
    message.includes("fetch failed") ||
    message.includes("network") ||
    message.includes("aborted") ||
    message.includes("overloaded") ||
    code === "UND_ERR_CONNECT_TIMEOUT" ||
    code === "ECONNRESET"
  ) {
    return true
  }

  return false
}

/**
 * Calculate exponential backoff delay with random jitter to prevent thundering herds
 */
export function getBackoffDelay(attempt: number, baseMs: number = 800, maxMs: number = 4000): number {
  const exp = Math.min(attempt, 3)
  const delay = Math.min(baseMs * Math.pow(2, exp), maxMs)
  const jitter = Math.random() * 200
  return delay + jitter
}

/**
 * Resolves an ordered list of model candidates for a user:
 * 1. User's explicitly requested / active model
 * 2. User's other configured API key profiles (e.g. Gemini, Anthropic)
 * 3. Server-side environment variables as emergency backup
 */
export async function getFallbackModelCascade(
  userId: string,
  preferredModelId?: string
): Promise<ResilientModelCandidate[]> {
  const candidates: ResilientModelCandidate[] = []
  const seenKeys = new Set<string>()

  // 1. Get user profiles
  const userProfiles = await getAllUserAIProfiles(userId)
  const activeConfig = await getUserAIConfig(userId)

  // Add active profile first
  if (activeConfig) {
    try {
      const provider = getProvider(activeConfig)
      const modelId = preferredModelId || activeConfig.model || provider.defaultModel
      candidates.push({
        id: modelId,
        name: `${activeConfig.providerType.toUpperCase()} (${modelId})`,
        providerType: activeConfig.providerType,
        model: provider.model(modelId),
      })
      seenKeys.add(`${activeConfig.providerType}:${modelId}`)
    } catch {
      // Ignore initial config resolution error
    }
  }

  // Add secondary user profiles
  for (const prof of userProfiles) {
    const keyTag = `${prof.providerType}:${prof.model || "default"}`
    if (!seenKeys.has(keyTag)) {
      try {
        const provider = getProvider({
          providerType: prof.providerType,
          apiKey: prof.apiKey,
          baseUrl: prof.baseUrl,
          model: prof.model,
        })
        const modelId = prof.model || provider.defaultModel
        candidates.push({
          id: modelId,
          name: `${prof.name} (${modelId})`,
          providerType: prof.providerType,
          model: provider.model(modelId),
        })
        seenKeys.add(keyTag)
      } catch {
        // Continue
      }
    }
  }

  // 2. Add Server Environment Backups if available
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY && !seenKeys.has("google:gemini-2.0-flash")) {
    try {
      const provider = getProvider({
        providerType: "google",
        apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      })
      candidates.push({
        id: "gemini-2.0-flash",
        name: "Google Gemini 2.0 Flash (Server Fallback)",
        providerType: "google",
        model: provider.model("gemini-2.0-flash"),
      })
      seenKeys.add("google:gemini-2.0-flash")
    } catch {}
  }

  if (process.env.OPENAI_API_KEY && !seenKeys.has("openai:gpt-4o-mini")) {
    try {
      const provider = getProvider({
        providerType: "openai",
        apiKey: process.env.OPENAI_API_KEY,
      })
      candidates.push({
        id: "gpt-4o-mini",
        name: "OpenAI GPT-4o-mini (Server Fallback)",
        providerType: "openai",
        model: provider.model("gpt-4o-mini"),
      })
      seenKeys.add("openai:gpt-4o-mini")
    } catch {}
  }

  return candidates
}

/**
 * Execute resilient text generation with multi-model fallback, retry backoff, and timeout control
 */
export async function resilientGenerateText(options: {
  userId: string
  preferredModelId?: string
  systemPrompt: string
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>
  temperature?: number
  maxRetriesPerModel?: number
  timeoutMs?: number
}): Promise<ResilientExecutionResult> {
  const {
    userId,
    preferredModelId,
    systemPrompt,
    messages,
    temperature = 0.7,
    maxRetriesPerModel = 2,
    timeoutMs = 15000,
  } = options

  const startTime = Date.now()
  const candidates = await getFallbackModelCascade(userId, preferredModelId)

  if (candidates.length === 0) {
    throw new Error(
      "No valid AI provider found. Please configure your API key in Settings."
    )
  }

  let totalAttempts = 0
  let lastError: unknown = null

  for (let modelIdx = 0; modelIdx < candidates.length; modelIdx++) {
    const candidate = candidates[modelIdx]
    const isFallback = modelIdx > 0

    for (let attempt = 1; attempt <= maxRetriesPerModel; attempt++) {
      totalAttempts++
      try {
        const timeoutSignal = AbortSignal.timeout(timeoutMs)

        const result = await generateText({
          model: candidate.model,
          system: systemPrompt,
          messages: messages as any,
          temperature,
          abortSignal: timeoutSignal,
        })

        if (result.text && result.text.trim().length > 0) {
          return {
            text: result.text.trim(),
            modelUsed: candidate.id,
            providerUsed: candidate.name,
            attemptsCount: totalAttempts,
            fallbackTriggered: isFallback,
            durationMs: Date.now() - startTime,
          }
        }
      } catch (err: unknown) {
        lastError = err
        const retryable = isRetryableError(err)

        if (!retryable || attempt === maxRetriesPerModel) {
          // If non-retryable or last attempt for this model, break to try next provider candidate
          break
        }

        // Wait before retry
        const backoff = getBackoffDelay(attempt)
        await new Promise((resolve) => setTimeout(resolve, backoff))
      }
    }
  }

  const errMsg =
    lastError instanceof Error ? lastError.message : "AI generation failed across all providers"
  throw new Error(`AI Resilient Execution Failed after ${totalAttempts} attempts: ${errMsg}`)
}

/**
 * Emergency Fallback generator for live spoken interview turns if all upstream LLMs are unreachable
 */
export function getEmergencyInterviewTurn(
  targetRole: string,
  targetCompany: string,
  currentPhase: string,
  turnNumber: number
): string {
  const fallbackBank: Record<number, string> = {
    1: `Glad to meet you! Let's start with your core background. Can you share an overview of your recent technical stack and key projects related to ${targetRole}?`,
    2: `Thanks for sharing. Diving into engineering design: when architecting services for ${targetCompany}, how do you ensure high availability, data consistency, and low latency?`,
    3: `Great points. Let's discuss trade-offs: what is a critical architectural compromise or performance bottleneck you tackled recently, and why did you choose that solution?`,
    4: `Understood. Imagine a major production outage or sudden traffic surge occurs on your service. Walk me through your step-by-step triage, debugging, and postmortem mitigation.`,
    5: `Excellent discussion today! You've covered some strong engineering foundations for the ${targetRole} position at ${targetCompany}. That wraps up our questions for this round.`,
  }

  return (
    fallbackBank[turnNumber] ||
    `Could you walk me through your technical approach and how you'd implement that for ${targetCompany}?`
  )
}

/**
 * Execute resilient text streaming with multi-provider fallback cascades
 */
export async function resilientStreamText(options: {
  userId: string
  preferredModelId?: string
  system: string
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>
  temperature?: number
  tools?: any
  maxSteps?: number
  onError?: (error: unknown) => void
  onFinish?: (event: any) => Promise<void> | void
  onStepFinish?: (event: any) => Promise<void> | void
}) {
  const candidates = await getFallbackModelCascade(options.userId, options.preferredModelId)

  if (candidates.length === 0) {
    throw new Error("No valid AI provider found. Please configure your API key in Settings.")
  }

  const loopDetector = new LoopDetector({ repetitionThreshold: 3, timeWindowMs: 30_000 })

  let lastError: unknown = null

  for (const candidate of candidates) {
    try {
      console.log(`[Stream] Trying provider: ${candidate.name} (${candidate.id})`)
      const result = (streamText as any)({
        model: candidate.model,
        system: options.system,
        messages: options.messages as any,
        temperature: options.temperature ?? 0.35,
        tools: options.tools,
        maxSteps: options.maxSteps ?? 5,
        onError: options.onError,
        onFinish: options.onFinish,
        onStepFinish: (event: any) => {
          const { toolCalls, toolResults, text } = event

          if (toolCalls && toolCalls.length > 0) {
            for (const tc of toolCalls) {
              console.log(`[Tool] Calling: ${tc.toolName}`, JSON.stringify(tc.args, null, 2))
              const isLoop = loopDetector.recordCall(tc.toolName, tc.args as Record<string, unknown>)
              if (isLoop) {
                console.warn(`[LoopDetector] Loop detected for tool: ${tc.toolName}`)
              }

              const risk = getToolRisk(tc.toolName)
              if (risk === ToolRisk.DESTRUCTIVE || risk === ToolRisk.EXTERNAL) {
                console.warn(`[ToolRisk] ${risk} tool called: ${tc.toolName}`)
              }
            }
          }

          if (toolResults && toolResults.length > 0) {
            for (const tr of toolResults) {
              const resultStr = typeof tr.result === "string" ? tr.result : JSON.stringify(tr.result)
              console.log(`[Tool] Result: ${tr.toolName} → ${resultStr?.slice(0, 200)}`)
            }
          }

          if (text) {
            console.log(`[Stream] Text generated: ${text.length} chars`)
          }

          return options.onStepFinish?.(event)
        },
      })

      console.log(`[Stream] Provider ${candidate.name} connected successfully`)
      return {
        result,
        modelUsed: candidate.id,
        providerUsed: candidate.name,
      }
    } catch (err) {
      lastError = err
      console.warn(`[Stream Fallback] Provider ${candidate.name} failed initialization:`, err)
    }
  }

  throw lastError || new Error("All streaming model providers failed.")
}
