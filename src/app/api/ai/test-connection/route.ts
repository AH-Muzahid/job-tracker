import { generateText } from "ai"
import { cookies } from "next/headers"
import { getInternalUserId } from "@/lib/auth"
import { getProvider } from "@/lib/ai/client"
import { decrypt } from "@/lib/encryption"

export async function POST() {
  const userId = await getInternalUserId()
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
  }

  const cookieStore = await cookies()
  const encrypted = cookieStore.get("ai_config")?.value
  if (!encrypted) {
    return new Response(JSON.stringify({ error: "AI provider not configured" }), { status: 400 })
  }

  let aiConfig: { providerType: string; apiKey: string; baseUrl?: string; model?: string }
  try {
    const decrypted = decrypt(encrypted)
    aiConfig = JSON.parse(decrypted)
  } catch {
    return new Response(JSON.stringify({ error: "Invalid AI configuration" }), { status: 400 })
  }

  try {
    const resolvedProvider = getProvider({
      providerType: aiConfig.providerType as "openai" | "anthropic" | "google" | "custom-openai",
      apiKey: aiConfig.apiKey,
      baseUrl: aiConfig.baseUrl,
      model: aiConfig.model,
    })

    const modelToUse = resolvedProvider.defaultModel

    await generateText({
      model: resolvedProvider.model(modelToUse),
      prompt: "Say 'connected' and nothing else",
      maxOutputTokens: 10,
    })

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch {
    return new Response(JSON.stringify({ ok: false }), { status: 500 })
  }
}
