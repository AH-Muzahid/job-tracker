export interface ExternalJobOpportunity {
  id: string
  title: string
  company: string
  location: string
  url: string
  sourceBoard: "remoteok" | "arbeitnow" | "adzuna" | "curated" | "linkedin" | "jobicy" | "linkedin_post" | "company_portal"
  tags: string[]
  salary?: string
  fitScore: number
  matchRationale: string
  descriptionSnippet: string
  authorName?: string
  authorUrl?: string
  outreachPitch?: string
  atsScore?: number
  missingKeywords?: string[]
  batchSlot?: "just-in" | "earlier-today" | "yesterday"
  batchLabel?: string
  batchId?: string
  publishedAt?: string
  isSaved?: boolean
  appliedStatus?: string | null
  applicationId?: string | null
}

export interface UnifiedRawJob {
  id: string
  title: string
  company: string
  location: string
  url: string
  sourceBoard: "remoteok" | "arbeitnow" | "adzuna" | "curated" | "linkedin" | "jobicy" | "linkedin_post" | "company_portal"
  tags: string[]
  authorName?: string
  authorUrl?: string
  salaryMin?: number
  salaryMax?: number
  salaryText?: string
  description: string
}
