import { NextResponse } from "next/server"
import { getInternalUserId } from "@/lib/auth"
import { prisma, withDbRetry } from "@/lib/prisma"
import { syncApplicationsToGoogleSheets, getGoogleSheetsConfig } from "@/lib/google-sheets"

export async function POST() {
  const userId = await getInternalUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const config = await getGoogleSheetsConfig(userId)
    if (!config || !config.webhookUrl) {
      return NextResponse.json(
        { error: "Google Sheets Webhook URL is not configured. Please configure it in Settings." },
        { status: 400 }
      )
    }

    // Fetch all user applications
    const applications = await withDbRetry(() =>
      prisma.application.findMany({
        where: { userId },
        orderBy: { applicationDate: "desc" },
      })
    )

    if (applications.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        message: "No applications found to sync.",
      })
    }

    const syncResult = await syncApplicationsToGoogleSheets(
      userId,
      applications.map((app) => ({
        id: app.id,
        companyName: app.companyName,
        jobTitle: app.jobTitle,
        status: app.status,
        source: app.source,
        applicationDate: app.applicationDate,
        jobUrl: app.jobUrl,
        notes: app.notes,
      }))
    )

    if (!syncResult.success) {
      return NextResponse.json(
        { error: syncResult.error || "Failed to sync applications to Google Sheet." },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      count: syncResult.count,
      message: `Successfully synced ${syncResult.count} applications to your Google Sheet.`,
    })
  } catch (error) {
    console.error("Manual Google Sheets full sync error:", error)
    return NextResponse.json(
      { error: "Internal error during Google Sheets sync." },
      { status: 500 }
    )
  }
}
