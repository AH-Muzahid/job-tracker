import { NextResponse } from "next/server"
import { getInternalUserId } from "@/lib/auth"
import { getGoogleSheetsConfig } from "@/lib/google-sheets"
import { getUserAIProfiles } from "@/lib/ai/config"
import { prisma, withDbRetry } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET() {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    // Run all 3 queries concurrently in parallel with db retry
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

    return NextResponse.json(
      {
        googleSheets: sheetsConfig || {
          sheetUrl: "",
          webhookUrl: "",
          autoSyncEnabled: false,
          lastSyncedAt: null,
        },
        ai: aiProfiles || { activeId: null, profiles: [] },
        memories: memories || [],
      },
      {
        headers: {
          "Cache-Control": "private, no-cache, no-transform",
        },
      }
    )
  } catch (error) {
    console.error("Settings bundle load error:", error)
    return NextResponse.json({ error: "Failed to load settings bundle" }, { status: 500 })
  }
}
