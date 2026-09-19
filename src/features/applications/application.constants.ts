export const CANONICAL_STATUSES = [
  "Staged",
  "Saved",
  "Applied",
  "Assessment",
  "Interview",
  "Rejected",
  "Offer",
  "Archived",
] as const

export const VALID_STATUSES = [
  "Staged",
  "STAGED",
  "Saved",
  "SAVED",
  "Applied",
  "APPLIED",
  "Assessment",
  "ASSESSMENT",
  "Interview",
  "INTERVIEW",
  "Rejected",
  "REJECTED",
  "Offer",
  "OFFER",
  "Archived",
  "ARCHIVED",
] as const

export const VALID_SOURCES = [
  "LinkedIn",
  "Bdjobs",
  "Indeed",
  "Wellfound",
  "Facebook",
  "Referral",
  "Other",
] as const

export type CanonicalStatus = (typeof CANONICAL_STATUSES)[number]
export type ValidStatus = (typeof VALID_STATUSES)[number]
export type ValidSource = (typeof VALID_SOURCES)[number]

export const DEFAULT_PAGE_SIZE = 25
export const MAX_PAGE_SIZE = 100
