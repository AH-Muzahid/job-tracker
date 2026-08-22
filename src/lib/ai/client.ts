import { createOpenAI } from "@ai-sdk/openai"
import { createAnthropic } from "@ai-sdk/anthropic"
import { createGoogle } from "@ai-sdk/google"
import type { LanguageModelV4 } from "@ai-sdk/provider"

export interface AIProviderConfig {
  providerType: "openai" | "anthropic" | "google" | "custom-openai" | "custom-anthropic"
  apiKey: string
  baseUrl?: string
  model?: string
}

type ModelFn = (id: string) => LanguageModelV4

/**
 * Smart fetch adapter for Custom OpenAI gateways (OmniRoute, OneAPI, LiteLLM, Ollama)
 * that ensures seamless compatibility between streaming and non-streaming responses.
 */
const smartOpenAIFetch: typeof fetch = async (url, init) => {
  let body = init?.body
  let isStreamRequest = false

  if (body && typeof body === "string") {
    try {
      const parsed = JSON.parse(body)
      if (parsed.stream === true) {
        isStreamRequest = true
      } else if (parsed.stream === undefined) {
        parsed.stream = false
        body = JSON.stringify(parsed)
      }
    } catch {
      // Ignore
    }
  }

  const res = await fetch(url, { ...init, body })

  // If upstream returns SSE stream on a non-streaming request, aggregate into standard JSON response
  const contentType = res.headers.get("content-type") || ""
  if (!isStreamRequest && contentType.includes("text/event-stream")) {
    const raw = await res.text()
    let accumulatedContent = ""
    const lines = raw.split("\n")
    for (const line of lines) {
      if (line.startsWith("data: ") && !line.includes("[DONE]")) {
        try {
          const chunk = JSON.parse(line.slice(6))
          const delta = chunk.choices?.[0]?.delta?.content || ""
          accumulatedContent += delta
        } catch {
          // Ignore
        }
      }
    }
    const standardJson = {
      id: "chatcmpl-proxy-" + Date.now(),
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: "custom-openai",
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: accumulatedContent },
          finish_reason: "stop",
        },
      ],
    }
    return new Response(JSON.stringify(standardJson), {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    })
  }

  return res
}

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
        defaultModel: "gemini-2.0-flash",
      }
    }
    case "custom-openai": {
      const openai = createOpenAI({
        baseURL: config.baseUrl,
        apiKey: config.apiKey,
        fetch: smartOpenAIFetch,
      })
      return {
        model: (id) => openai.chat(id),
        defaultModel: config.model || "gpt-4o-mini",
      }
    }
    case "custom-anthropic": {
      const anthropic = createAnthropic({ baseURL: config.baseUrl, apiKey: config.apiKey })
      return {
        model: anthropic,
        defaultModel: config.model || "claude-3-5-sonnet-20241022",
      }
    }
  }
}
