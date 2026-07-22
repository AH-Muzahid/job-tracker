import { createOpenAI } from "@ai-sdk/openai"
import { createAnthropic } from "@ai-sdk/anthropic"
import { createGoogle } from "@ai-sdk/google"
import type { LanguageModelV4 } from "@ai-sdk/provider"

export interface AIProviderConfig {
  providerType: "openai" | "anthropic" | "google" | "custom-openai"
  apiKey: string
  baseUrl?: string
  model?: string
}

type ModelFn = (id: string) => LanguageModelV4

export function getProvider(config: AIProviderConfig): { model: ModelFn; defaultModel: string } {
  switch (config.providerType) {
    case "openai": {
      const openai = createOpenAI({ apiKey: config.apiKey })
      return {
        model: (id) => openai.chat(id),
        defaultModel: "gpt-4o-mini",
      }
    }
    case "anthropic": {
      return {
        model: createAnthropic({ apiKey: config.apiKey }),
        defaultModel: "claude-3-haiku-20240307",
      }
    }
    case "google": {
      return {
        model: createGoogle({ apiKey: config.apiKey }),
        defaultModel: "gemini-1.5-flash",
      }
    }
    case "custom-openai": {
      const openai = createOpenAI({ baseURL: config.baseUrl, apiKey: config.apiKey })
      return {
        model: (id) => openai.chat(id),
        defaultModel: config.model || "gpt-4o-mini",
      }
    }
  }
}
