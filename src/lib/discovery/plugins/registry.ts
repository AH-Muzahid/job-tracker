import type { UnifiedRawJob } from "../types"
import type { JobScraperPlugin, ScraperFetchParams } from "./types"

export interface ScraperExecutionResult {
  jobs: UnifiedRawJob[]
  failures: { id: string; error: string }[]
}

export class ScraperRegistry {
  private plugins: Map<string, JobScraperPlugin> = new Map()

  /**
   * Registers a new job scraper plugin into the system.
   * Enables the Open-Closed architecture: new job boards can be registered
   * at runtime without modifying the core discovery aggregator.
   */
  public register(plugin: JobScraperPlugin): this {
    this.plugins.set(plugin.id, plugin)
    return this
  }

  /**
   * Unregisters a scraper plugin by its identifier.
   */
  public unregister(id: string): boolean {
    return this.plugins.delete(id)
  }

  /**
   * Retrieves a registered plugin by ID.
   */
  public getPlugin(id: string): JobScraperPlugin | undefined {
    return this.plugins.get(id)
  }

  /**
   * Returns all registered plugins.
   */
  public getAllPlugins(): JobScraperPlugin[] {
    return Array.from(this.plugins.values())
  }

  /**
   * Returns all currently enabled plugins.
   */
  public getEnabledPlugins(): JobScraperPlugin[] {
    return this.getAllPlugins().filter((p) => p.enabled)
  }

  /**
   * Executes all enabled scraper plugins in parallel with failure isolation.
   * Individual scraper failures are captured and will not terminate other sources.
   */
  public async executeAll(params: ScraperFetchParams = {}): Promise<ScraperExecutionResult> {
    const enabled = this.getEnabledPlugins()
    if (enabled.length === 0) {
      return { jobs: [], failures: [] }
    }

    const settled = await Promise.allSettled(
      enabled.map(async (plugin) => {
        const jobs = await plugin.fetch(params)
        return { pluginId: plugin.id, jobs }
      })
    )

    const aggregatedJobs: UnifiedRawJob[] = []
    const failures: { id: string; error: string }[] = []

    for (let i = 0; i < settled.length; i++) {
      const res = settled[i]
      const plugin = enabled[i]

      if (res.status === "fulfilled") {
        if (Array.isArray(res.value.jobs)) {
          aggregatedJobs.push(...res.value.jobs)
        }
      } else {
        const errorMessage =
          res.reason instanceof Error ? res.reason.message : String(res.reason)
        failures.push({
          id: plugin.id,
          error: errorMessage,
        })
        console.warn(`[ScraperRegistry] Plugin "${plugin.id}" failed:`, errorMessage)
      }
    }

    return {
      jobs: aggregatedJobs,
      failures,
    }
  }
}

/**
 * Global default registry instance for CareerTrack discovery scrapers.
 */
export const defaultScraperRegistry = new ScraperRegistry()
