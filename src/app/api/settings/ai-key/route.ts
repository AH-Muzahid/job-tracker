import { NextRequest, NextResponse } from "next/server"
import { getInternalUserId } from "@/lib/auth"
import {
  getUserAIProfiles,
  saveUserAIProfile,
  setActiveUserAIProfile,
  updateUserAIProfileModel,
  deleteUserAIProfile,
} from "@/lib/ai/config"

export const dynamic = "force-dynamic"

export async function GET() {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const result = await getUserAIProfiles(userId)
  return NextResponse.json(result)
}

export async function PUT(request: NextRequest) {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const { id, name, providerType, apiKey, baseUrl, model, makeActive } = body

  if (!providerType) {
    return NextResponse.json({ error: "providerType is required" }, { status: 400 })
  }

  const validTypes = ["openai", "anthropic", "google", "custom-openai", "custom-anthropic"]
  if (!validTypes.includes(providerType)) {
    return NextResponse.json({ error: "Invalid provider type" }, { status: 400 })
  }

  try {
    const savedId = await saveUserAIProfile(userId, {
      id,
      name: name || `${providerType.toUpperCase()} Profile`,
      providerType: providerType as "openai" | "anthropic" | "google" | "custom-openai" | "custom-anthropic",
      apiKey,
      baseUrl,
      model,
      makeActive,
    })

    return NextResponse.json({ success: true, id: savedId })
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to save AI profile"
    return NextResponse.json({ error: errorMessage }, { status: 400 })
  }
}

export async function PATCH(request: NextRequest) {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const { activeId, model, profileId } = body

  if (activeId) {
    const success = await setActiveUserAIProfile(userId, activeId)
    if (!success) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }
  }

  if (model) {
    await updateUserAIProfileModel(userId, model, profileId || activeId)
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const profileId = searchParams.get("id")

  if (!profileId) {
    return NextResponse.json({ error: "Profile ID is required" }, { status: 400 })
  }

  const success = await deleteUserAIProfile(userId, profileId)
  if (!success) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
