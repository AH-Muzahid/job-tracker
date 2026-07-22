import { createOpenAI } from "@ai-sdk/openai"
import { createAnthropic } from "@ai-sdk/anthropic"
import { createGoogle } from "@ai-sdk/google"
import type { LanguageModel } from "ai"

export interface AIProviderConfig {
  providerType: "openai" | "anthropic" | "google" | "custom-openai"
  apiKey: string
  baseUrl?: string
  model?: string
}

export function getProvider(config: AIProviderConfig): { model: (id: string) => LanguageModel; defaultModel: string } {
  switch (config.providerType) {
    case "openai":
      return {
        model: createOpenAI({ apiKey: config.apiKey }),
        defaultModel: "gpt-4o-mini",
      }
    case "anthropic":
      return {
        model: createAnthropic({ apiKey: config.apiKey }),
        defaultModel: "claude-3-haiku-20240307",
      }
    case "google":
      return {
        model: createGoogle({ apiKey: config.apiKey }),
        defaultModel: "gemini-1.5-flash",
      }
    case "custom-openai":
      return {
        model: createOpenAI({ baseURL: config.baseUrl, apiKey: config.apiKey }),
        defaultModel: config.model || "gpt-4o-mini",
      }
  }
}
