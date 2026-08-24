/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  getGoogleSheetsConfig,
  saveGoogleSheetsConfig,
  syncApplicationsToGoogleSheets,
  GOOGLE_APPS_SCRIPT_TEMPLATE,
} from "@/lib/google-sheets"
import { prisma } from "@/lib/prisma"

// Mock prisma and withDbRetry
vi.mock("@/lib/prisma", () => {
  const mockPrisma = {
    userMemory: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    application: {
      findMany: vi.fn(),
    },
  }

  return {
    prisma: mockPrisma,
    withDbRetry: vi.fn(async (fn: () => unknown) => fn()),
  }
})

describe("Google Sheets Auto-Sync Engine", () => {
  const userId = "test-user-sync-123"

  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  it("contains valid Google Apps Script template code", () => {
    expect(GOOGLE_APPS_SCRIPT_TEMPLATE).toContain("SpreadsheetApp.getActiveSpreadsheet()")
    expect(GOOGLE_APPS_SCRIPT_TEMPLATE).toContain("doPost(e)")
    expect(GOOGLE_APPS_SCRIPT_TEMPLATE).toContain("Company Name")
  })

  it("getGoogleSheetsConfig returns null when no memory entry exists", async () => {
    vi.mocked(prisma.userMemory.findFirst).mockResolvedValueOnce(null)

    const config = await getGoogleSheetsConfig(userId)
    expect(config).toBeNull()
  })

  it("getGoogleSheetsConfig parses stored config properly", async () => {
    vi.mocked(prisma.userMemory.findFirst).mockResolvedValueOnce({
      id: "mem-sheets-1",
      userId,
      category: "integration_google_sheets",
      content: JSON.stringify({
        sheetUrl: "https://docs.google.com/spreadsheets/d/abc/edit",
        webhookUrl: "https://script.google.com/macros/s/xyz/exec",
        autoSyncEnabled: true,
      }),
    } as any)

    const config = await getGoogleSheetsConfig(userId)
    expect(config).not.toBeNull()
    expect(config?.sheetUrl).toContain("docs.google.com")
    expect(config?.autoSyncEnabled).toBe(true)
  })

  it("saveGoogleSheetsConfig creates new record when none exists", async () => {
    vi.mocked(prisma.userMemory.findFirst).mockResolvedValueOnce(null)
    vi.mocked(prisma.userMemory.create).mockResolvedValueOnce({ id: "mem-new" } as any)

    const saved = await saveGoogleSheetsConfig(userId, {
      sheetUrl: "https://docs.google.com/spreadsheets/d/abc/edit",
      webhookUrl: "https://script.google.com/macros/s/xyz/exec",
      autoSyncEnabled: true,
    })

    expect(saved).toBe(true)
    expect(prisma.userMemory.create).toHaveBeenCalled()
  })

  it("syncApplicationsToGoogleSheets safely skips when autoSyncEnabled is false", async () => {
    vi.mocked(prisma.userMemory.findFirst).mockResolvedValueOnce({
      id: "mem-sheets-1",
      content: JSON.stringify({
        sheetUrl: "https://docs.google.com/spreadsheets/d/abc/edit",
        webhookUrl: "https://script.google.com/macros/s/xyz/exec",
        autoSyncEnabled: false,
      }),
    } as any)

    const result = await syncApplicationsToGoogleSheets(userId, [
      {
        companyName: "Netflix",
        jobTitle: "Senior Frontend Engineer",
        status: "Applied",
        applicationDate: new Date(),
      },
    ])

    expect(result.success).toBe(false)
    expect(result.count).toBe(0)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it("syncApplicationsToGoogleSheets dispatches payload when configured and enabled", async () => {
    vi.mocked(prisma.userMemory.findFirst).mockResolvedValueOnce({
      id: "mem-sheets-1",
      content: JSON.stringify({
        sheetUrl: "https://docs.google.com/spreadsheets/d/abc/edit",
        webhookUrl: "https://script.google.com/macros/s/xyz/exec",
        autoSyncEnabled: true,
      }),
    } as any)

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as any)

    const result = await syncApplicationsToGoogleSheets(userId, [
      {
        companyName: "Stripe",
        jobTitle: "Infrastructure Engineer",
        status: "Interview",
        applicationDate: new Date(),
      },
    ])

    expect(result.success).toBe(true)
    expect(result.count).toBe(1)
    expect(global.fetch).toHaveBeenCalledWith(
      "https://script.google.com/macros/s/xyz/exec",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
    )
  })
})
