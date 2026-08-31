import { ChatOpenAI } from "@langchain/openai"
import { BaseChatModel } from "@langchain/core/language_models/chat_models"
import type { AIProviderConfig } from "@/lib/ai/client"

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

  switch (config.providerType) {
    case "openai": {
      return new ChatOpenAI({
        apiKey: config.apiKey,
        modelName: options?.modelName || config.model || "gpt-4o-mini",
        temperature,
        streaming,
      })
    }
    case "custom-openai": {
      return new ChatOpenAI({
        apiKey: config.apiKey,
        modelName: options?.modelName || config.model || "gpt-4o-mini",
        temperature,
        streaming,
        configuration: {
          baseURL: config.baseUrl || "https://api.openai.com/v1",
        },
      })
    }
    case "anthropic":
    case "custom-anthropic": {
      // ChatOpenAI works seamlessly with Anthropic when routed through proxy or OpenRouter/LiteLLM,
      // or fallback to ChatOpenAI with custom endpoint if provided.
      return new ChatOpenAI({
        apiKey: config.apiKey,
        modelName: options?.modelName || config.model || "claude-3-5-sonnet-20241022",
        temperature,
        streaming,
        ...(config.baseUrl ? { configuration: { baseURL: config.baseUrl } } : {}),
      })
    }
    case "google": {
      return new ChatOpenAI({
        apiKey: config.apiKey,
        modelName: options?.modelName || config.model || "gemini-2.0-flash",
        temperature,
        streaming,
        ...(config.baseUrl ? { configuration: { baseURL: config.baseUrl } } : {}),
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
