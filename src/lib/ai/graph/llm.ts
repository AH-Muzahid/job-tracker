import { ChatOpenAI } from "@langchain/openai"
import { ChatAnthropic } from "@langchain/anthropic"
import { BaseChatModel } from "@langchain/core/language_models/chat_models"
import type { AIProviderConfig } from "@/lib/ai/client"

/**
 * Normalizes known broken combos or invalid model IDs across custom gateways
 */
export function normalizeModelId(modelId?: string): string | undefined {
  if (!modelId) return undefined
  // OmniRoute advertises auto/gemini in /models, but rejects it with 400 (unknown built-in auto combo)
  if (modelId === "auto/gemini") {
    return "antigravity/gemini-2.5-flash"
  }
  return modelId
}

/**
 * Returns a LangChain Chat Model configured from user's AIProviderConfig
 */
export function getLangChainChatModel(
  config: AIProviderConfig,
  options?: {
    modelName?: string
    temperature?: number
    streaming?: boolean
  }
): BaseChatModel {
  const temperature = options?.temperature ?? 0.3
  const streaming = options?.streaming ?? false
  if (config.providerType === "anthropic" || config.providerType === "custom-anthropic") {
    return new ChatAnthropic({ apiKey: config.apiKey, model: options?.modelName || config.model || "claude-sonnet-4-5", temperature, streaming, maxTokens: 4096, maxRetries: 1, clientOptions: { timeout: 30000, ...(config.baseUrl ? { baseURL: config.baseUrl.replace(/\/v1\/?$/, "") } : {}) } })
  }

  switch (config.providerType) {
    case "openai": {
      return new ChatOpenAI({
        apiKey: config.apiKey,
        modelName: normalizeModelId(options?.modelName || config.model) || "gpt-4o-mini",
        temperature,
        streaming,
        timeout: 30000,
        maxRetries: 1,
        maxTokens: 4096,
      })
    }
    case "custom-openai": {
      return new ChatOpenAI({
        apiKey: config.apiKey,
        modelName: normalizeModelId(options?.modelName || config.model) || "gpt-4o-mini",
        temperature,
        streaming,
        timeout: 30000,
        maxRetries: 1,
        maxTokens: 4096,
        configuration: {
          baseURL: config.baseUrl || "https://api.openai.com/v1",
        },
      })
    }
    case "google": {
      const googleBaseUrl = config.baseUrl || "https://generativelanguage.googleapis.com/v1beta/openai/"
      let rawModel = options?.modelName || config.model || "gemini-2.5-flash"
      if (rawModel === "gemini-3.6-flash") {
        rawModel = "gemini-2.5-flash"
      }
      return new ChatOpenAI({
        apiKey: config.apiKey,
        modelName: normalizeModelId(rawModel) || "gemini-2.5-flash",
        temperature,
        streaming,
        timeout: 30000,
        maxRetries: 1,
        maxTokens: 4096,
        configuration: {
          baseURL: googleBaseUrl,
        },
      })
    }
    default: {
      return new ChatOpenAI({
        apiKey: config.apiKey,
        modelName: options?.modelName || "gpt-4o-mini",
        temperature,
        streaming,
      })
    }
  }
}
