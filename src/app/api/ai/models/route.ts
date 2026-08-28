import { NextResponse } from "next/server"
import { getInternalUserId } from "@/lib/auth"
import { getUserAIConfig } from "@/lib/ai/config"

export interface FetchedModel {
  id: string
  name: string
  provider?: string
}

export async function GET() {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const aiConfig = await getUserAIConfig(userId)
  if (!aiConfig) {
    return NextResponse.json({
      models: [],
      activeModel: "",
      baseUrl: null,
      providerType: null,
    })
  }

  const { baseUrl, apiKey, providerType, model: activeModel } = aiConfig
  const models: FetchedModel[] = []

  // 1. If provider has a custom baseUrl (OmniRoute, Ollama, OpenRouter, LiteLLM, vLLM, etc.)
  if (baseUrl) {
    try {
      const cleanBaseUrl = baseUrl.replace(/\/+$/, "")
      const modelsEndpoint = cleanBaseUrl.endsWith("/v1")
        ? `${cleanBaseUrl}/models`
        : `${cleanBaseUrl}/v1/models`

      const res = await fetch(modelsEndpoint, {
        headers: {
          Authorization: `Bearer ${apiKey || "test"}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(3000),
      })

      if (res.ok) {
        const data = await res.json()
        const rawList = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.models)
          ? data.models
          : []

        for (const item of rawList) {
          const id = typeof item === "string" ? item : item.id || item.name
          if (id && typeof id === "string") {
            models.push({
              id,
              name: (typeof item === "object" && item.name) || id,
              provider: typeof item === "object" ? item.owned_by : undefined,
            })
          }
        }
      }
    } catch {
      // Custom endpoint unreachable — fall through to presets
    }
  }

  // 2. Fallback / Standard presets based on provider if endpoint is empty or not custom
  if (models.length === 0) {
    if (providerType === "google") {
      models.push(
        { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash (Fast & Accurate)" },
        { id: "gemini-2.0-flash-thinking-exp-01-21", name: "Gemini 2.0 Flash Thinking" },
        { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro (Deep Context)" },
        { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash" }
      )
    } else if (providerType === "anthropic" || providerType === "custom-anthropic") {
      models.push(
        { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet (Best Reasoning)" },
        { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku (Ultra Fast)" },
        { id: "claude-3-opus-20240229", name: "Claude 3 Opus" }
      )
    } else {
      models.push(
        { id: "gpt-4o", name: "GPT-4o (Omni Flagship)" },
        { id: "gpt-4o-mini", name: "GPT-4o Mini (Fast & Cost-Efficient)" },
        { id: "o3-mini", name: "o3 Mini (Deep Reasoning)" },
        { id: "o1-mini", name: "o1 Mini" }
      )
    }
  }

  return NextResponse.json({
    models,
    activeModel: activeModel || models[0]?.id || "",
    baseUrl: baseUrl || null,
    providerType,
  })
}
