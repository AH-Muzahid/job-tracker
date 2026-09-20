/**
 * Client-safe pure utility functions for follow-up date calculations.
 * Does not import any server-side, database, or Google APIs.
 */

/**
 * Calculates the number of business days (Monday-Friday) between two dates.
 */
export function calculateBusinessDays(startDate: Date | string, endDate: Date | string = new Date()): number {
  const start = new Date(startDate)
  const end = new Date(endDate)
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0

  let count = 0
  const cur = new Date(start.getTime())
  cur.setHours(0, 0, 0, 0)
  const targetEnd = new Date(end.getTime())
  targetEnd.setHours(0, 0, 0, 0)

  while (cur < targetEnd) {
    cur.setDate(cur.getDate() + 1)
    const dayOfWeek = cur.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++
    }
  }
  return count
}

/**
 * Determines if an application is dormant and eligible for a 5-day follow-up.
 * Criteria: Status is "Applied" or "Assessment", and at least 5 business days have passed
 * since the application date (or last update).
 */
export function isFollowUpDue(app: {
  status: string
  applicationDate?: string | Date | null
  createdAt?: string | Date | null
  updatedAt?: string | Date | null
}): boolean {
  const activeStatuses = ["Applied", "Assessment"]
  if (!activeStatuses.includes(app.status)) return false

  const refDate = app.applicationDate
    ? new Date(app.applicationDate)
    : app.updatedAt
    ? new Date(app.updatedAt)
    : app.createdAt
    ? new Date(app.createdAt)
    : null

  if (!refDate || isNaN(refDate.getTime())) return false

  const businessDays = calculateBusinessDays(refDate)
  return businessDays >= 5
}
