export const VALID_STATUSES = [
  "Saved",
  "Applied",
  "Assessment",
  "Interview",
  "Rejected",
  "Offer",
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

export type ValidStatus = (typeof VALID_STATUSES)[number]
export type ValidSource = (typeof VALID_SOURCES)[number]

export const DEFAULT_PAGE_SIZE = 100
export const MAX_PAGE_SIZE = 500
