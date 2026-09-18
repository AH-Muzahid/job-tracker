/* eslint-disable @typescript-eslint/no-explicit-any */
import { generateText, streamText } from "ai"
import type { LanguageModelV4 } from "@ai-sdk/provider"
import { getProvider, AIProviderConfig } from "./client"
import { getUserAIConfig, getAllUserAIProfiles, updateUserAIProfileModel } from "./config"
import { getToolRisk, ToolRisk } from "./tool-registry"

/**
 * Deprecated → Successor model mapping.
 * When a provider says "model X is no longer available", we auto-retry with the successor.
 * Add entries here as providers deprecate models.
 */
const MODEL_UPGRADE_MAP: Record<string, string> = {
  // Google Gemini deprecations
  "gemini-2.0-flash": "gemini-3.6-flash",
  "gemini-2.0-flash-exp": "gemini-3.6-flash",
  "gemini-2.0-flash-lite": "gemini-3.6-flash",
  "gemini-1.5-flash": "gemini-3.6-flash",
  "gemini-1.5-pro": "gemini-3.1-pro-preview",
  "gemini-2.5-flash": "gemini-3.6-flash",
  "gemini-2.5-pro": "gemini-3.1-pro-preview",
  // OpenAI deprecations
  "gpt-4-turbo": "gpt-4o",
  "gpt-4-turbo-preview": "gpt-4o",
  "gpt-3.5-turbo": "gpt-4o-mini",
  // Anthropic deprecations
  "claude-3-sonnet-20240229": "claude-3-5-sonnet-20241022",
  "claude-3-haiku-20240307": "claude-3-5-haiku-20241022",
}

/**
 * Detect if an error indicates the model is deprecated/unavailable (not a transient error)
 */
function isModelDeprecatedError(err: unknown): boolean {
  if (!err) return false
  const msg = ((err as any)?.message || "").toLowerCase()
  return (
    msg.includes("no longer available") ||
    msg.includes("has been deprecated") ||
    msg.includes("model not found") ||
    msg.includes("does not exist") ||
    msg.includes("is not available") ||
    msg.includes("decommissioned") ||
    msg.includes("please update your code to use")
  )
}

/**
 * Extract the deprecated model ID from an error message, if possible
 */
function extractDeprecatedModelFromError(err: unknown): string | null {
  const msg = (err as any)?.message || ""
  // Pattern: "models/gemini-2.0-flash is no longer available"
  const match = msg.match(/models\/([a-z0-9._-]+)\s+(?:is|has)/i)
  if (match) return match[1]
  // Pattern: "model 'gpt-4-turbo' does not exist"
  const match2 = msg.match(/model\s+['"]?([a-z0-9._-]+)['"]?\s+(?:does|is|has)/i)
  if (match2) return match2[1]
  return null
}

class LoopDetector {
  private calls = new Map<string, number>()
  private threshold: number
  constructor(options?: { repetitionThreshold?: number; timeWindowMs?: number }) {
    this.threshold = options?.repetitionThreshold ?? 3
  }
  recordCall(name: string, args?: Record<string, unknown>): boolean {
    void args
    const count = (this.calls.get(name) || 0) + 1
    this.calls.set(name, count)
    return count > this.threshold
  }
}

export interface ResilientModelCandidate {
  id: string
  name: string
  providerType: AIProviderConfig["providerType"]
  model: LanguageModelV4
  /** Provider's model factory — used for auto-switching deprecated models to successors */
  modelFactory: (id: string) => LanguageModelV4
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
        modelFactory: provider.model,
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
          modelFactory: provider.model,
        })
        seenKeys.add(keyTag)
      } catch {
        // Continue
      }
    }
  }

  // 2. Add Server Environment Backups if available
  // Anthropic Claude Backup (e.g. from server ANTHROPIC_API_KEY)
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (anthropicKey && !seenKeys.has("anthropic:claude-3-5-sonnet-20241022")) {
    try {
      const provider = getProvider({
        providerType: "anthropic",
        apiKey: anthropicKey,
      })
      const modelId = process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022"
      candidates.push({
        id: modelId,
        name: `Anthropic Claude (${modelId}) (Server Fallback)`,
        providerType: "anthropic",
        model: provider.model(modelId),
        modelFactory: provider.model,
      })
      seenKeys.add(`anthropic:${modelId}`)
    } catch {}
  }

  // Google Gemini Backup (supports GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY)
  const googleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY
  if (googleKey && !seenKeys.has("google:gemini-3.6-flash")) {
    try {
      const provider = getProvider({
        providerType: "google",
        apiKey: googleKey,
      })
      const modelId = process.env.GEMINI_MODEL || "gemini-3.6-flash"
      candidates.push({
        id: modelId,
        name: `Google Gemini (${modelId}) (Server Fallback)`,
        providerType: "google",
        model: provider.model(modelId),
        modelFactory: provider.model,
      })
      seenKeys.add(`google:${modelId}`)
    } catch {}
  }

  // OpenAI Backup
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
        modelFactory: provider.model,
      })
      seenKeys.add("openai:gpt-4o-mini")
    } catch {}
  }

  // OpenRouter Backup
  if (process.env.OPENROUTER_API_KEY && !seenKeys.has("openrouter:default")) {
    try {
      const provider = getProvider({
        providerType: "custom-openai",
        apiKey: process.env.OPENROUTER_API_KEY,
        baseUrl: "https://openrouter.ai/api/v1",
        model: process.env.OPENROUTER_MODEL || "anthropic/claude-3.5-sonnet",
      })
      const modelId = process.env.OPENROUTER_MODEL || "anthropic/claude-3.5-sonnet"
      candidates.push({
        id: modelId,
        name: `OpenRouter (${modelId}) (Server Fallback)`,
        providerType: "custom-openai",
        model: provider.model(modelId),
        modelFactory: provider.model,
      })
      seenKeys.add("openrouter:default")
    } catch {}
  }

  // Groq Backup
  if (process.env.GROQ_API_KEY && !seenKeys.has("groq:default")) {
    try {
      const provider = getProvider({
        providerType: "custom-openai",
        apiKey: process.env.GROQ_API_KEY,
        baseUrl: "https://api.groq.com/openai/v1",
        model: "llama-3.3-70b-versatile",
      })
      candidates.push({
        id: "llama-3.3-70b-versatile",
        name: "Groq Llama 3.3 70B (Server Fallback)",
        providerType: "custom-openai",
        model: provider.model("llama-3.3-70b-versatile"),
        modelFactory: provider.model,
      })
      seenKeys.add("groq:default")
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

        // ── Auto-switch: deprecated model → successor ──
        if (isModelDeprecatedError(err)) {
          const depModel = extractDeprecatedModelFromError(err) || candidate.id
          const successor = MODEL_UPGRADE_MAP[depModel]
          if (successor && successor !== candidate.id) {
            console.warn(
              `[ModelAutoSwitch] ${depModel} deprecated → upgrading to ${successor}`
            )
            try {
              // Use the same provider's model factory to create successor model
              const timeoutSignal2 = AbortSignal.timeout(timeoutMs)
              const result2 = await generateText({
                model: candidate.modelFactory(successor),
                system: systemPrompt,
                messages: messages as any,
                temperature,
                abortSignal: timeoutSignal2,
              })
              if (result2.text && result2.text.trim().length > 0) {
                // Persist the upgrade so user never hits this again
                void updateUserAIProfileModel(userId, successor).catch(() => {})
                return {
                  text: result2.text.trim(),
                  modelUsed: successor,
                  providerUsed: `${candidate.name} (auto-upgraded from ${depModel})`,
                  attemptsCount: totalAttempts + 1,
                  fallbackTriggered: isFallback,
                  durationMs: Date.now() - startTime,
                }
              }
            } catch (upgradeErr) {
              console.warn(`[ModelAutoSwitch] Successor ${successor} also failed:`, upgradeErr)
              lastError = upgradeErr
            }
          }
          // Deprecated and no successor → skip retries, move to next provider
          break
        }

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
  turnNumber: number,
  language: string = "en"
): string {
  const phaseLower = (currentPhase || "").toLowerCase()
  const isBengali = language === "bn" || language === "mixed"

  if (phaseLower.includes("wrap-up") || phaseLower.includes("closing") || turnNumber >= 5) {
    if (isBengali) {
      return `আজকের ইন্টারভিউ সেশন এখানেই সম্পন্ন হলো! ${targetCompany}-র ${targetRole} পজিশনের জন্য আপনার মূল্যবান সময় এবং উত্তরের জন্য অনেক ধন্যবাদ। আপনার ইভ্যালুয়েশন রিপোর্ট তৈরি হচ্ছে।`
    }
    return `That concludes our interview session today! Thank you so much for your time and thoughtful responses regarding the ${targetRole} role at ${targetCompany}. Your evaluation report is now being prepared.`
  }

  if (phaseLower.includes("star") || phaseLower.includes("behavioral")) {
    if (phaseLower.includes("situation") || phaseLower.includes("challenge")) {
      return isBengali
        ? `আপনার সাম্প্রতিক কাজের এমন একটি চ্যালেঞ্জিং প্রজেক্ট বা হাই-প্রেসার সিচুয়েশনের কথা বলুন, যেখানে আপনার মূল দায়িত্ব কী ছিল?`
        : `Could you describe a challenging project or high-pressure situation you navigated in your recent engineering work, and what your exact responsibility was?`
    }
    if (phaseLower.includes("action") || phaseLower.includes("conflict")) {
      return isBengali
        ? `সেই চ্যালেঞ্জ মোকাবেলায় আপনি নিজে কী কী সুনির্দিষ্ট পদক্ষেপ নিয়েছিলেন এবং কীভাবে টিমকে অ্যালাইন করেছিলেন?`
        : `When facing that hurdle, what specific actions did you personally take to align your team, resolve conflict, and drive the solution forward?`
    }
    if (phaseLower.includes("result") || phaseLower.includes("impact")) {
      return isBengali
        ? `এর মেজারেবল আউটকাম কী হয়েছিল, এবং এই অভিজ্ঞতা থেকে আপনার সবচেয়ে বড় লার্নিং কী ছিল?`
        : `What was the measurable outcome of your actions, and what key lesson did you take away from that experience?`
    }
  }

  if (phaseLower.includes("system design") || phaseLower.includes("architecture") || phaseLower.includes("partitioning")) {
    if (phaseLower.includes("requirements") || phaseLower.includes("scope")) {
      return isBengali
        ? `চলুন ${targetCompany}-র একটি কোর সার্ভিসের ডিজাইন নিয়ে কথা বলি। অ্যাভেইল্যাবিলিটি, থ্রুপুট এবং কনসিস্টেন্সির রিকোয়ারমেন্টস আপনি কীভাবে ডিফাইন করবেন?`
        : `Let's design a core service for ${targetCompany}. How would you define the functional and non-functional requirements, specifically around availability, throughput, and consistency?`
    }
    if (phaseLower.includes("architecture") || phaseLower.includes("entities")) {
      return isBengali
        ? `সিস্টেমটির হাই-লেভেল আর্কিটেকচার এবং কোর ডেটা এন্ট্রিগুলো আমাকে বুঝিয়ে বলুন: কী কী মাইক্রোসার্ভিস, এপিআই কন্ট্রাক্ট এবং ডেটাবেজ মডেল তৈরি করবেন?`
        : `Walk me through the high-level architecture and core data entities: what services, API contracts, and database models would you create for ${targetCompany}?`
    }
    if (phaseLower.includes("partition") || phaseLower.includes("bottleneck")) {
      return isBengali
        ? `ট্রাফিক যখন ১০ গুণ বাড়বে, তখন ডেটা লেয়ার পার্টিশনিং, ক্যাশিং স্ট্র্যাটেজি এবং হট-কি বটলনেক কীভাবে হ্যান্ডেল করবেন?`
        : `As traffic scales 10x, how would you partition the data layer, handle caching strategies, and mitigate hot-key bottlenecks?`
    }
    if (phaseLower.includes("failure") || phaseLower.includes("resiliency")) {
      return isBengali
        ? `পিক আওয়ারে প্রাইমারি ডেটাবেজ নোড বা ডাউনস্ট্রিম সার্ভিস ফেইল করলে কীভাবে হাই অ্যাভেইল্যাবিলিটি ও গ্রেসফুল ডিগ্রেডেশন নিশ্চিত করবেন?`
        : `What happens if a primary database node or downstream dependency fails during peak hours? How do you ensure high availability and graceful degradation?`
    }
  }

  const fallbackBankBn: Record<number, string> = {
    1: `স্বাগতম! আপনার সাথে পরিচিত হয়ে খুব ভালো লাগল। ${targetCompany}-তে ${targetRole} রোলের জন্য আপনার সাম্প্রতিক টেক স্ট্যাক এবং মূল প্রজেক্টগুলো সম্পর্কে সংক্ষেপে কিছু বলুন।`,
    2: `ধন্যবাদ শেয়ার করার জন্য। আর্কিটেকচার প্রসঙ্গে: ${targetCompany}-র সার্ভিসের জন্য হাই অ্যাভেইল্যাবিলিটি, কনসিস্টেন্সি এবং লো-লেটেন্সি আপনি কীভাবে নিশ্চিত করেন?`,
    3: `দারুণ পয়েন্ট! ট্রেড-অফ নিয়ে কথা বলি: সম্প্রতি কোনো ক্রিটিক্যাল আর্কিটেকচারাল কম্প্রোমাইজ বা পারফরম্যান্স বটলনেক ফেস করেছিলেন কি? কীভাবে সলভ করেছিলেন?`,
    4: `বুঝতে পেরেছি। ধরুন প্রোডাকশনে সাডেন ট্রাফিক সার্জ বা সিস্টেম ডাউনটাইম দেখা দিল। তখন আপনার স্টেপ-বাই-স্টেপ ডিবাগিং এবং ট্রায়াজ প্রসেস কেমন হবে?`,
    5: `খুবই চমৎকার আলোচনা হলো আজ! ${targetCompany}-তে ${targetRole} পজিশনের জন্য প্রয়োজনীয় ফাউন্ডেশন সম্পর্কে দারুণ বলেছেন। এই রাউন্ডের প্রশ্ন এখানেই শেষ করছি।`,
  }

  const fallbackBankEn: Record<number, string> = {
    1: `Glad to meet you! Let's start with your core background. Can you share an overview of your recent technical stack and key projects related to ${targetRole}?`,
    2: `Thanks for sharing. Diving into engineering design: when architecting services for ${targetCompany}, how do you ensure high availability, data consistency, and low latency?`,
    3: `Great points. Let's discuss trade-offs: what is a critical architectural compromise or performance bottleneck you tackled recently, and why did you choose that solution?`,
    4: `Understood. Imagine a major production outage or sudden traffic surge occurs on your service. Walk me through your step-by-step triage, debugging, and postmortem mitigation.`,
    5: `Excellent discussion today! You've covered some strong engineering foundations for the ${targetRole} position at ${targetCompany}. That wraps up our questions for this round.`,
  }

  const bank = isBengali ? fallbackBankBn : fallbackBankEn

  return (
    bank[turnNumber] ||
    (isBengali
      ? `${targetCompany}-র জন্য আপনার টেকনিক্যাল অ্যাপ্রোচ এবং ইমপ্লিমেন্টেশন প্ল্যান সম্পর্কে বিস্তারিত বলুন।`
      : `Could you walk me through your technical approach and how you'd implement that for ${targetCompany}?`)
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

      // ── Auto-switch: deprecated model → successor (streaming) ──
      if (isModelDeprecatedError(err)) {
        const depModel = extractDeprecatedModelFromError(err) || candidate.id
        const successor = MODEL_UPGRADE_MAP[depModel]
        if (successor && successor !== candidate.id) {
          console.warn(
            `[Stream ModelAutoSwitch] ${depModel} deprecated → upgrading to ${successor}`
          )
          try {
            const result = (streamText as any)({
              model: candidate.modelFactory(successor),
              system: options.system,
              messages: options.messages as any,
              temperature: options.temperature ?? 0.35,
              tools: options.tools,
              maxSteps: options.maxSteps ?? 5,
              onError: options.onError,
              onFinish: options.onFinish,
              onStepFinish: options.onStepFinish,
            })
            // Persist the upgrade
            void updateUserAIProfileModel(options.userId, successor).catch(() => {})
            console.log(`[Stream] Auto-upgraded ${depModel} → ${successor} successfully`)
            return {
              result,
              modelUsed: successor,
              providerUsed: `${candidate.name} (auto-upgraded from ${depModel})`,
            }
          } catch (upgradeErr) {
            console.warn(`[Stream ModelAutoSwitch] Successor ${successor} also failed:`, upgradeErr)
            lastError = upgradeErr
          }
        }
      }

      console.warn(`[Stream Fallback] Provider ${candidate.name} failed initialization:`, err)
    }
  }

  throw lastError || new Error("All streaming model providers failed.")
}
