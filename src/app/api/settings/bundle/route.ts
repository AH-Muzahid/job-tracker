import { NextResponse } from "next/server"
import { getInternalUserId } from "@/lib/auth"
import { getGoogleSheetsConfig } from "@/lib/google-sheets"
import { getUserAIProfiles } from "@/lib/ai/config"
import { prisma, withDbRetry } from "@/lib/prisma"
import { getCachedJson, setCachedJson } from "@/lib/redis"

interface SettingsBundlePayload {
  googleSheets: {
    sheetUrl: string
    webhookUrl?: string
    autoSyncEnabled: boolean
    lastSyncedAt?: string | null
  }
  ai: {
    activeId: string | null
    profiles: unknown[]
  }
  memories: unknown[]
}

export async function GET() {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const bundleCacheKey = `settings:bundle:${userId}`

  // 1. Check Redis cache first (15ms response)
  const cachedBundle = await getCachedJson<SettingsBundlePayload>(bundleCacheKey)
  if (cachedBundle) {
    return NextResponse.json(cachedBundle, {
      headers: {
        "X-Cache": "HIT",
        "Cache-Control": "private, no-cache, no-transform",
      },
    })
  }

  // 2. Fetch in parallel on cache miss
  try {
    const [sheetsConfig, aiProfiles, memories] = await Promise.all([
      getGoogleSheetsConfig(userId),
      getUserAIProfiles(userId),
      withDbRetry(() =>
        prisma.userMemory.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
        })
      ),
    ])

    const bundle = {
      googleSheets: sheetsConfig || {
        sheetUrl: "",
        webhookUrl: "",
        autoSyncEnabled: false,
        lastSyncedAt: null,
      },
      ai: aiProfiles || { activeId: null, profiles: [] },
      memories: memories || [],
    }

    // Populate cache for 1 hour (3600s)
    void setCachedJson(bundleCacheKey, bundle, 3600)

    return NextResponse.json(bundle, {
      headers: {
        "X-Cache": "MISS",
        "Cache-Control": "private, no-cache, no-transform",
      },
    })
  } catch (error) {
    console.error("Settings bundle load error:", error)
    return NextResponse.json({ error: "Failed to load settings bundle" }, { status: 500 })
  }
}
