import { NextResponse } from "next/server"
import { getInternalUserId } from "@/lib/auth"
import { syncUserProfileToMemories } from "@/lib/profile-memory-sync"

export async function POST() {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const result = await syncUserProfileToMemories(userId)
    return NextResponse.json({
      success: true,
      message: `Synchronized ${result.newCount} new facts from profile. Total: ${result.syncedCount}.`,
      memories: result.memories,
      count: result.syncedCount,
      newCount: result.newCount,
    })
  } catch (error) {
    console.error("Profile to memory sync error:", error)
    return NextResponse.json({ error: "Failed to sync profile to memory" }, { status: 500 })
  }
}
