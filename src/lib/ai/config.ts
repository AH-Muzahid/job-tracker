import { prisma, withDbRetry } from "@/lib/prisma"
import { encrypt, decrypt } from "@/lib/encryption"
import { getCachedJson, setCachedJson, invalidateCache } from "@/lib/redis"
import type { AIProviderConfig } from "@/lib/ai/client"

export interface AIKeyProfile {
  id: string
  name: string
  providerType: "openai" | "anthropic" | "google" | "custom-openai" | "custom-anthropic"
  apiKey: string
  baseUrl?: string
  model?: string
}

export interface StoredMultiAIConfig {
  activeId: string
  profiles: AIKeyProfile[]
}

export interface PublicAIKeyProfile {
  id: string
  name: string
  providerType: "openai" | "anthropic" | "google" | "custom-openai" | "custom-anthropic"
  baseUrl?: string
  model?: string
  hasKey: boolean
}

/**
 * Internal helper to read and parse the full multi-key configuration with Redis caching.
 * Handles automatic migration from legacy single-key format.
 */
async function getRawMultiConfig(userId: string): Promise<StoredMultiAIConfig | null> {
  if (!userId) return null

  // 1. Check Redis cache first (15ms)
  const cacheKey = `settings:ai:${userId}`
  const cached = await getCachedJson<StoredMultiAIConfig>(cacheKey)
  if (cached) return cached

  // 2. Try reading from Database on cache miss
  try {
    const user = await withDbRetry(() =>
      prisma.user.findUnique({
        where: { id: userId },
        select: { aiConfig: true },
      })
    )

    if (user?.aiConfig) {
      try {
        const decrypted = decrypt(user.aiConfig)
        const parsed = JSON.parse(decrypted)

        // Handle new multi-profile schema
        if (parsed.profiles && Array.isArray(parsed.profiles)) {
          const config = parsed as StoredMultiAIConfig
          void setCachedJson(cacheKey, config, 3600)
          return config
        }

        // Handle legacy single-key schema (auto migration)
        if (parsed.apiKey && parsed.providerType) {
          const defaultProfile: AIKeyProfile = {
            id: "default",
            name: parsed.providerType.toUpperCase() + " Key",
            providerType: parsed.providerType,
            apiKey: parsed.apiKey,
            baseUrl: parsed.baseUrl || undefined,
            model: parsed.model || undefined,
          }
          const migratedConfig: StoredMultiAIConfig = {
            activeId: "default",
            profiles: [defaultProfile],
          }
          saveRawMultiConfig(userId, migratedConfig).catch(() => {})
          void setCachedJson(cacheKey, migratedConfig, 3600)
          return migratedConfig
        }
      } catch (decErr) {
        console.warn("[AI Config Decrypt Warning]:", decErr)
      }
    }
  } catch (dbErr) {
    console.error("[AI Config DB Error]:", dbErr)
  }

  return null
}

/**
 * Saves the full StoredMultiAIConfig object to DB with write-through cache invalidation.
 */
async function saveRawMultiConfig(userId: string, multiConfig: StoredMultiAIConfig): Promise<void> {
  const encrypted = encrypt(JSON.stringify(multiConfig))
  await withDbRetry(() =>
    prisma.user.update({
      where: { id: userId },
      data: { aiConfig: encrypted },
    })
  )

  // Invalidate and write-through cache immediately
  const cacheKey = `settings:ai:${userId}`
  const bundleKey = `settings:bundle:${userId}`
  await Promise.all([
    setCachedJson(cacheKey, multiConfig, 3600),
    invalidateCache(bundleKey),
  ])
}

/**
 * Returns the currently active AIProviderConfig for making LLM calls.
 */
export async function getUserAIConfig(userId: string, profileId?: string): Promise<AIProviderConfig | null> {
  const multi = await getRawMultiConfig(userId)
  if (multi && multi.profiles && multi.profiles.length > 0) {
    const target = profileId
      ? multi.profiles.find((p) => p.id === profileId)
      : multi.profiles.find((p) => p.id === multi.activeId) || multi.profiles[0]

    if (target && target.apiKey) {
      return {
        providerType: target.providerType,
        apiKey: target.apiKey,
        baseUrl: target.baseUrl || undefined,
        model: target.model || undefined,
      }
    }
  }

  // System environment variables fallback
  if (process.env.OPENAI_API_KEY) {
    return {
      providerType: "openai",
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    }
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return {
      providerType: "anthropic",
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: "claude-3-5-sonnet-20241022",
    }
  }
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY) {
    return {
      providerType: "google",
      apiKey: (process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY)!,
      model: "gemini-2.0-flash",
    }
  }
  if (process.env.GROQ_API_KEY) {
    return {
      providerType: "custom-openai",
      apiKey: process.env.GROQ_API_KEY,
      baseUrl: "https://api.groq.com/openai/v1",
      model: "llama-3.3-70b-versatile",
    }
  }

  return null
}

/**
 * Returns public metadata of all saved AI profiles (without exposing full secret keys).
 */
export async function getUserAIProfiles(userId: string): Promise<{
  activeId: string | null
  profiles: PublicAIKeyProfile[]
}> {
  const multi = await getRawMultiConfig(userId)
  if (!multi || !multi.profiles) {
    return { activeId: null, profiles: [] }
  }

  return {
    activeId: multi.activeId || null,
    profiles: multi.profiles.map((p) => ({
      id: p.id,
      name: p.name,
      providerType: p.providerType,
      baseUrl: p.baseUrl || undefined,
      model: p.model || undefined,
      hasKey: !!p.apiKey,
    })),
  }
}

/**
 * Returns full raw AI profiles for server-side multi-provider failover
 */
export async function getAllUserAIProfiles(userId: string): Promise<AIKeyProfile[]> {
  const multi = await getRawMultiConfig(userId)
  return multi?.profiles || []
}

/**
 * Adds or updates a profile in the user's AI key collection.
 */
export async function saveUserAIProfile(
  userId: string,
  data: {
    id?: string
    name: string
    providerType: "openai" | "anthropic" | "google" | "custom-openai" | "custom-anthropic"
    apiKey?: string
    baseUrl?: string
    model?: string
    makeActive?: boolean
  }
): Promise<string> {
  const multi = (await getRawMultiConfig(userId)) || { activeId: "", profiles: [] }
  const profileId = data.id || `key_${Date.now()}`

  const existingIndex = multi.profiles.findIndex((p) => p.id === profileId)

  let finalApiKey = data.apiKey

  if (existingIndex >= 0) {
    // If editing existing profile and no new key provided, retain old key
    if (!finalApiKey) {
      finalApiKey = multi.profiles[existingIndex].apiKey
    }
  }

  if (!finalApiKey) {
    throw new Error("apiKey is required for new profile")
  }

  const updatedProfile: AIKeyProfile = {
    id: profileId,
    name: data.name || `${data.providerType.toUpperCase()} Key`,
    providerType: data.providerType,
    apiKey: finalApiKey,
    baseUrl: data.baseUrl || undefined,
    model: data.model || undefined,
  }

  if (existingIndex >= 0) {
    multi.profiles[existingIndex] = updatedProfile
  } else {
    multi.profiles.push(updatedProfile)
  }

  if (data.makeActive || !multi.activeId || multi.profiles.length === 1) {
    multi.activeId = profileId
  }

  await saveRawMultiConfig(userId, multi)
  return profileId
}

/**
 * Sets the active profile ID.
 */
export async function setActiveUserAIProfile(userId: string, profileId: string): Promise<boolean> {
  const multi = await getRawMultiConfig(userId)
  if (!multi || !multi.profiles) return false

  const exists = multi.profiles.some((p) => p.id === profileId)
  if (!exists) return false

  multi.activeId = profileId
  await saveRawMultiConfig(userId, multi)
  return true
}

/**
 * Updates the selected model of the active profile (or a specific profile).
 */
export async function updateUserAIProfileModel(userId: string, model: string, profileId?: string): Promise<boolean> {
  const multi = await getRawMultiConfig(userId)
  if (!multi || !multi.profiles || multi.profiles.length === 0) return false

  const targetId = profileId || multi.activeId || multi.profiles[0].id
  const prof = multi.profiles.find((p) => p.id === targetId)
  if (!prof) return false

  prof.model = model
  await saveRawMultiConfig(userId, multi)
  return true
}

/**
 * Deletes a profile by ID.
 */
export async function deleteUserAIProfile(userId: string, profileId: string): Promise<boolean> {
  const multi = await getRawMultiConfig(userId)
  if (!multi || !multi.profiles) return false

  const initialLength = multi.profiles.length
  multi.profiles = multi.profiles.filter((p) => p.id !== profileId)

  if (multi.profiles.length === initialLength) return false

  if (multi.activeId === profileId) {
    multi.activeId = multi.profiles[0]?.id || ""
  }

  await saveRawMultiConfig(userId, multi)
  return true
}
