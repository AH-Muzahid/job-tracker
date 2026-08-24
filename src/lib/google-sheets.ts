import { prisma, withDbRetry } from "@/lib/prisma"

export interface GoogleSheetsConfig {
  sheetUrl: string
  webhookUrl?: string
  autoSyncEnabled: boolean
  lastSyncedAt?: string
}

export interface GoogleSheetAppItem {
  id?: string
  companyName: string
  jobTitle: string
  status: string
  source?: string
  applicationDate: string | Date
  jobUrl?: string | null
  notes?: string | null
}

const CONFIG_CATEGORY = "integration_google_sheets"

export const GOOGLE_APPS_SCRIPT_TEMPLATE = `// === CareerTrack Google Sheets Auto-Sync Webhook ===
// 1. In your Google Sheet, click Extensions > Apps Script
// 2. Paste this entire code and click Save
// 3. Click Deploy > New Deployment > Select type: "Web app"
// 4. Set "Execute as": "Me" and "Who has access": "Anyone"
// 5. Click Deploy, copy the "Web app URL", and paste it into CareerTrack!

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var payload = JSON.parse(e.postData.contents);
    
    // Set up standard headers if sheet is brand new
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Company Name",
        "Job Title",
        "Status",
        "Source",
        "Date Applied",
        "Job URL",
        "Notes",
        "Synced At"
      ]);
      sheet.getRange("A1:H1")
        .setFontWeight("bold")
        .setBackground("#f3f4f6")
        .setFontColor("#111827");
      sheet.setFrozenRows(1);
    }
    
    var applications = payload.applications || [];
    var nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
    
    for (var i = 0; i < applications.length; i++) {
      var app = applications[i];
      sheet.appendRow([
        app.companyName || "",
        app.jobTitle || "",
        app.status || "Saved",
        app.source || "Other",
        app.applicationDate ? String(app.applicationDate).split("T")[0] : "",
        app.jobUrl || "",
        app.notes || "",
        nowStr
      ]);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      importedCount: applications.length,
      syncedAt: nowStr
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}`

/**
 * Retrieve user's configured Google Sheet integration settings.
 */
export async function getGoogleSheetsConfig(userId: string): Promise<GoogleSheetsConfig | null> {
  if (!userId) return null
  try {
    const memory = await withDbRetry<{ id: string; content: string } | null>(() =>
      prisma.userMemory.findFirst({
        where: {
          userId,
          category: CONFIG_CATEGORY,
        },
      })
    )

    if (!memory) return null
    return JSON.parse(memory.content) as GoogleSheetsConfig
  } catch (error) {
    console.error("Error retrieving Google Sheets config:", error)
    return null
  }
}

/**
 * Persist or update user's Google Sheet integration settings.
 */
export async function saveGoogleSheetsConfig(
  userId: string,
  config: GoogleSheetsConfig
): Promise<boolean> {
  if (!userId) return false
  try {
    const serialized = JSON.stringify(config)
    const existing = await withDbRetry<{ id: string; content: string } | null>(() =>
      prisma.userMemory.findFirst({
        where: {
          userId,
          category: CONFIG_CATEGORY,
        },
      })
    )

    if (existing) {
      await withDbRetry(() =>
        prisma.userMemory.update({
          where: { id: existing.id },
          data: { content: serialized },
        })
      )
    } else {
      await withDbRetry(() =>
        prisma.userMemory.create({
          data: {
            userId,
            category: CONFIG_CATEGORY,
            content: serialized,
            source: "settings",
          },
        })
      )
    }
    return true
  } catch (error) {
    console.error("Error saving Google Sheets config:", error)
    return false
  }
}

/**
 * Dispatches applications to the user's configured Google Sheet via their Webhook.
 * Non-blocking and fail-safe.
 */
export async function syncApplicationsToGoogleSheets(
  userId: string,
  applications: GoogleSheetAppItem[]
): Promise<{ success: boolean; count: number; error?: string }> {
  if (!applications || applications.length === 0) {
    return { success: true, count: 0 }
  }

  try {
    const config = await getGoogleSheetsConfig(userId)
    if (!config || !config.webhookUrl || !config.autoSyncEnabled) {
      return { success: false, count: 0, error: "Auto-sync not configured or disabled" }
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)

    const response = await fetch(config.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "append",
        applications: applications.map((app) => ({
          companyName: app.companyName,
          jobTitle: app.jobTitle,
          status: app.status,
          source: app.source || "CareerTrack",
          applicationDate: app.applicationDate,
          jobUrl: app.jobUrl || "",
          notes: app.notes || "",
        })),
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      return { success: false, count: 0, error: `HTTP ${response.status}` }
    }

    // Update lastSyncedAt timestamp in background
    config.lastSyncedAt = new Date().toISOString()
    void saveGoogleSheetsConfig(userId, config)

    return { success: true, count: applications.length }
  } catch (error) {
    console.error("Google Sheets sync error:", error)
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : "Sync dispatch failed",
    }
  }
}
