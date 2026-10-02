import type { UnifiedRawJob } from "../types"

export interface ScraperFetchParams {
  query?: string
  tagParam?: string
  location?: string
  [key: string]: unknown
}

export interface ScraperPluginMetadata {
  id: string
  name: string
  description?: string
  sourceBoard: string
  defaultEnabled?: boolean
  rateLimitMs?: number
}

export interface JobScraperPlugin {
  readonly id: string
  readonly name: string
  readonly description?: string
  readonly enabled: boolean
  fetch(params: ScraperFetchParams): Promise<UnifiedRawJob[]>
}
