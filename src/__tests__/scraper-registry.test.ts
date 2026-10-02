import { describe, it, expect, vi } from "vitest"
import { ScraperRegistry } from "@/lib/discovery/plugins/registry"
import type { JobScraperPlugin } from "@/lib/discovery/plugins/types"
import type { UnifiedRawJob } from "@/lib/discovery/types"

describe("Job Scraper Open-Closed Plugin Registry", () => {
  const dummyJob: UnifiedRawJob = {
    id: "test_job_1",
    title: "Senior Cloud Engineer",
    company: "Acme Cloud",
    location: "Remote",
    url: "https://greenhouse.io/acme/job/123",
    sourceBoard: "company_portal",
    tags: ["aws", "kubernetes"],
    description: "Build cloud infrastructure with AWS and Kubernetes.",
  }

  it("registers and retrieves plugins dynamically", () => {
    const registry = new ScraperRegistry()

    const plugin: JobScraperPlugin = {
      id: "custom_ats",
      name: "Custom ATS Board",
      enabled: true,
      fetch: vi.fn().mockResolvedValue([dummyJob]),
    }

    registry.register(plugin)
    expect(registry.getPlugin("custom_ats")).toBe(plugin)
    expect(registry.getAllPlugins()).toHaveLength(1)
    expect(registry.getEnabledPlugins()).toHaveLength(1)

    registry.unregister("custom_ats")
    expect(registry.getPlugin("custom_ats")).toBeUndefined()
    expect(registry.getAllPlugins()).toHaveLength(0)
  })

  it("respects enabled toggle and skips disabled plugins", async () => {
    const registry = new ScraperRegistry()

    const activePlugin: JobScraperPlugin = {
      id: "active",
      name: "Active Source",
      enabled: true,
      fetch: vi.fn().mockResolvedValue([dummyJob]),
    }

    const disabledPlugin: JobScraperPlugin = {
      id: "disabled",
      name: "Disabled Source",
      enabled: false,
      fetch: vi.fn().mockResolvedValue([{ ...dummyJob, id: "disabled_job" }]),
    }

    registry.register(activePlugin).register(disabledPlugin)

    const result = await registry.executeAll({ query: "cloud" })

    expect(activePlugin.fetch).toHaveBeenCalledWith({ query: "cloud" })
    expect(disabledPlugin.fetch).not.toHaveBeenCalled()
    expect(result.jobs).toHaveLength(1)
    expect(result.jobs[0].id).toBe("test_job_1")
    expect(result.failures).toHaveLength(0)
  })

  it("isolates plugin errors so failing plugins do not break the discovery pipeline", async () => {
    const registry = new ScraperRegistry()

    const goodPlugin: JobScraperPlugin = {
      id: "good",
      name: "Good Scraper",
      enabled: true,
      fetch: vi.fn().mockResolvedValue([dummyJob]),
    }

    const failingPlugin: JobScraperPlugin = {
      id: "flaky",
      name: "Flaky Scraper",
      enabled: true,
      fetch: vi.fn().mockRejectedValue(new Error("Rate limit exceeded 429")),
    }

    registry.register(goodPlugin).register(failingPlugin)

    const result = await registry.executeAll({ query: "engineer" })

    // Good plugin's data should still be aggregated cleanly
    expect(result.jobs).toHaveLength(1)
    expect(result.jobs[0].id).toBe("test_job_1")

    // Flaky plugin's error should be recorded in failures
    expect(result.failures).toHaveLength(1)
    expect(result.failures[0].id).toBe("flaky")
    expect(result.failures[0].error).toContain("Rate limit exceeded 429")
  })
})
