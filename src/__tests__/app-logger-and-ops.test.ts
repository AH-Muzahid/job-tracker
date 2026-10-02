import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  recordAppLogToRing,
  getRecentAppLogs,
  clearAppLogsRing,
} from "@/lib/ops/telemetry-ring"
import { appLogger } from "@/lib/ops/app-logger"

describe("Ops Application Logger & Telemetry Ring (APP-LOGS)", () => {
  beforeEach(async () => {
    await clearAppLogsRing()
    vi.clearAllMocks()
  })

  it("records error logs with error details and stack trace", async () => {
    const errorObj = new Error("Database timeout after 5000ms")
    const logItem = await recordAppLogToRing({
      level: "error",
      source: "api:applications:create",
      message: "Failed to persist application record",
      error: errorObj,
      metadata: { userId: "usr_123", company: "Stripe" },
      userId: "usr_123",
    })

    expect(logItem.id).toMatch(/^log_\d+_[a-z0-9]+$/)
    expect(logItem.level).toBe("error")
    expect(logItem.source).toBe("api:applications:create")
    expect(logItem.message).toBe("Failed to persist application record")
    expect(logItem.error).toBe("Database timeout after 5000ms")
    expect(logItem.stack).toBeTruthy()
    expect(logItem.metadata?.company).toBe("Stripe")
    expect(logItem.userId).toBe("usr_123")

    const recent = await getRecentAppLogs(10)
    expect(recent.length).toBe(1)
    expect(recent[0].id).toBe(logItem.id)
  })

  it("records warn and info logs correctly via appLogger helper", async () => {
    await appLogger.info(
      "discovery:evaluate",
      "Opportunity evaluated: Senior Engineer at Linear (92% match)",
      { matchScore: 92 },
      "usr_abc"
    )

    await appLogger.warn(
      "rate-limit",
      "Candidate approaching hourly evaluation limit",
      { currentCount: 19, max: 20 },
      "usr_abc"
    )

    const allLogs = await getRecentAppLogs(10)
    expect(allLogs.length).toBe(2)

    const errorLogs = await getRecentAppLogs(10, "error")
    expect(errorLogs.length).toBe(0)

    const warnLogs = await getRecentAppLogs(10, "warn")
    expect(warnLogs.length).toBe(1)
    expect(warnLogs[0].source).toBe("rate-limit")

    const infoLogs = await getRecentAppLogs(10, "info")
    expect(infoLogs.length).toBe(1)
    expect(infoLogs[0].source).toBe("discovery:evaluate")
  })

  it("clears all application logs when clearAppLogsRing is called", async () => {
    await appLogger.info("test:probe", "Test log 1")
    await appLogger.error("test:probe", "Test error 2")

    let logs = await getRecentAppLogs(10)
    expect(logs.length).toBe(2)

    await clearAppLogsRing()

    logs = await getRecentAppLogs(10)
    expect(logs.length).toBe(0)
  })

  it("handles string and object errors gracefully without throwing", async () => {
    const logWithStringErr = await recordAppLogToRing({
      level: "error",
      source: "scraper:feed",
      message: "Scraping failed",
      error: "403 Forbidden: Cloudflare challenge required",
    })
    expect(logWithStringErr.error).toBe("403 Forbidden: Cloudflare challenge required")

    const logWithObjectErr = await recordAppLogToRing({
      level: "error",
      source: "api:webhook",
      message: "Webhook invalid",
      error: { code: "INVALID_SIGNATURE", status: 400 },
    })
    expect(logWithObjectErr.error).toContain("INVALID_SIGNATURE")
  })
})
