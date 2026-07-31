import { generateText } from "ai"
import { getInternalUserId } from "@/lib/auth"
import { getProvider } from "@/lib/ai/client"
import { getUserAIConfig } from "@/lib/ai/config"

export async function POST(request: Request) {
  const userId = await getInternalUserId()
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
  }

  let configToTest = await getUserAIConfig(userId)

  try {
    const body = await request.json().catch(() => ({}))
    if (body && body.providerType && body.apiKey) {
      configToTest = {
        providerType: body.providerType,
        apiKey: body.apiKey,
        baseUrl: body.baseUrl,
        model: body.model,
      }
    }
  } catch {
    // Ignore body parse error if empty
  }

  if (!configToTest || !configToTest.apiKey) {
    return new Response(JSON.stringify({ ok: false, error: "AI provider not configured" }), { status: 400 })
  }

  try {
    const resolvedProvider = getProvider({
      providerType: configToTest.providerType,
      apiKey: configToTest.apiKey,
      baseUrl: configToTest.baseUrl,
      model: configToTest.model,
    })

    const modelToUse = configToTest.model || resolvedProvider.defaultModel

    await generateText({
      model: resolvedProvider.model(modelToUse),
      prompt: "ping",
      maxOutputTokens: 5,
      timeout: 8000,
    })

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (error: unknown) {
    console.error("[AI Test Connection Error]:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to connect to AI provider"
    return new Response(JSON.stringify({ ok: false, error: errorMessage }), { status: 200 })
  }
}

