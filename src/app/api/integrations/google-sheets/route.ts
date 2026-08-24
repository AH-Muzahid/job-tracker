import { NextRequest, NextResponse } from "next/server"
import { getInternalUserId } from "@/lib/auth"
import { getGoogleSheetsConfig, saveGoogleSheetsConfig } from "@/lib/google-sheets"

export async function GET() {
  const userId = await getInternalUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const config = await getGoogleSheetsConfig(userId)
  return NextResponse.json({
    config: config || {
      sheetUrl: "",
      webhookUrl: "",
      autoSyncEnabled: false,
    },
  })
}

export async function POST(request: NextRequest) {
  const userId = await getInternalUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { sheetUrl, webhookUrl, autoSyncEnabled } = body

    if (!sheetUrl && !webhookUrl) {
      return NextResponse.json(
        { error: "Please provide a Google Sheet link or Apps Script Webhook URL." },
        { status: 400 }
      )
    }

    const updatedConfig = {
      sheetUrl: sheetUrl?.trim() || "",
      webhookUrl: webhookUrl?.trim() || "",
      autoSyncEnabled: Boolean(autoSyncEnabled),
    }

    const saved = await saveGoogleSheetsConfig(userId, updatedConfig)
    if (!saved) {
      return NextResponse.json({ error: "Failed to save configuration." }, { status: 500 })
    }

    return NextResponse.json({ success: true, config: updatedConfig })
  } catch (error) {
    console.error("Save Google Sheets config error:", error)
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 })
  }
}
