import { describe, it, expect, vi, beforeEach } from "vitest"
import { reportClientError, reportClientEvent } from "@/lib/ops/client-logger"
import { getRecentAppLogs, clearAppLogsRing } from "@/lib/ops/telemetry-ring"

describe("Client-Side Telemetry Reporter (CLIENT-LOGS)", () => {
  beforeEach(async () => {
    await clearAppLogsRing()
    vi.restoreAllMocks()
  })

  it("safely ignores calls when window is undefined (SSR environment)", () => {
    // In Node.js / SSR environment where window is undefined:
    expect(() => {
      reportClientError("test:ssr", new Error("SSR test error"))
      reportClientEvent("test:ssr", "SSR test event")
    }).not.toThrow()
  })

  it("correctly captures error details and dispatches to /api/admin/ops/logs in browser context", async () => {
    // Simulate browser window environment
    const originalWindow = global.window
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    })

    // Setup mock browser globals
    global.window = {
      location: { pathname: "/applications/app-123", search: "?tab=outreach" },
      innerWidth: 1920,
      innerHeight: 1080,
    } as any
    global.navigator = { userAgent: "Mozilla/5.0 Test Agent" } as any
    global.fetch = fetchMock

    try {
      const testError = new Error("Failed to generate outreach materials (HTTP 504)")
      testError.stack = "Error: Failed to generate outreach materials\n  at handleGenerateOutreach"

      reportClientError("workbench:outreach", testError, {
        applicationId: "app-123",
        companyName: "BEK & Co.",
        jobTitle: "Full Stack Developer",
        channel: "email",
      })

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const [url, options] = fetchMock.mock.calls[0]
      expect(url).toBe("/api/admin/ops/logs")
      expect(options.method).toBe("POST")
      expect(options.keepalive).toBe(true)

      const body = JSON.parse(options.body)
      expect(body.level).toBe("error")
      expect(body.source).toBe("client:workbench:outreach")
      expect(body.message).toBe("Failed to generate outreach materials (HTTP 504)")
      expect(body.error.message).toBe("Failed to generate outreach materials (HTTP 504)")
      expect(body.error.stack).toContain("handleGenerateOutreach")
      expect(body.metadata.applicationId).toBe("app-123")
      expect(body.metadata.companyName).toBe("BEK & Co.")
      expect(body.metadata.url).toBe("/applications/app-123?tab=outreach")
    } finally {
      global.window = originalWindow
    }
  })

  it("debounces rapid duplicate errors to prevent flooding the Ops ring buffer", async () => {
    const originalWindow = global.window
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    })

    global.window = {
      location: { pathname: "/test", search: "" },
      innerWidth: 1000,
      innerHeight: 800,
    } as any
    global.navigator = { userAgent: "Test Agent" } as any
    global.fetch = fetchMock

    try {
      const err = new Error("Network timeout")

      // Fire 5 rapid errors with identical source and message
      reportClientError("test:debounce", err)
      reportClientError("test:debounce", err)
      reportClientError("test:debounce", err)
      reportClientError("test:debounce", err)
      reportClientError("test:debounce", err)

      // Only the first one should have dispatched
      expect(fetchMock).toHaveBeenCalledTimes(1)
    } finally {
      global.window = originalWindow
    }
  })

  it("records client error directly into ops telemetry ring buffer when received by API", async () => {
    const testLogPayload = {
      level: "error" as const,
      source: "client:workbench:outreach",
      message: "Outreach generation failed (HTTP 504 Gateway Timeout)",
      error: {
        message: "Outreach generation failed (HTTP 504 Gateway Timeout)",
        stack: "Error: Outreach generation failed\n  at handleGenerateOutreach",
      },
      metadata: {
        applicationId: "bek-app-1",
        companyName: "BEK & Co.",
        jobTitle: "Full Stack Developer",
      },
    }

    // Direct recording into ring buffer simulation of API handler
    const { recordAppLogToRing } = await import("@/lib/ops/telemetry-ring")
    await recordAppLogToRing(testLogPayload)

    const logs = await getRecentAppLogs(10, "error")
    expect(logs.length).toBeGreaterThanOrEqual(1)
    const found = logs.find((l) => l.source === "client:workbench:outreach")
    expect(found).toBeDefined()
    expect(found?.message).toBe("Outreach generation failed (HTTP 504 Gateway Timeout)")
    expect(found?.metadata?.companyName).toBe("BEK & Co.")
  })
})
