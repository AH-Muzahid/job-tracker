/**
 * Source Host & ATS Provenance Verification Engine
 *
 * Validates job posting URLs against official ATS apex domains and installed
 * portal boards. Anti-spoofing defense against look-alike domains.
 *
 * Reference: ai-job-search/tests/test_apply_host_check.py
 */

export interface HostVerificationResult {
  host: string
  category: "installed_portal" | "official_ats" | "unverified"
  isTrustedAts: boolean
  apexDomain?: string
  warning?: string
}

/**
 * Official ATS platform apex domains.
 * A URL is classified as "official_ats" if its hostname IS or ENDS WITH `.{apex}`.
 */
export const OFFICIAL_ATS_APEXES: readonly string[] = [
  "greenhouse.io",
  "lever.co",
  "myworkdayjobs.com",
  "workday.com",
  "ashbyhq.com",
  "smartrecruiters.com",
  "workable.com",
  "icims.com",
  "jobvite.com",
  "breezy.hr",
  "jazz.co",
  "recruitee.com",
  "bamboohr.com",
  "pinpointhq.com",
  "dover.com",
  "wellfound.com",
] as const

/**
 * Installed portal/aggregator hosts recognized by the discovery pipeline.
 * These are legitimate job boards but NOT employer-operated ATS platforms.
 */
export const INSTALLED_PORTAL_HOSTS: readonly string[] = [
  "linkedin.com",
  "indeed.com",
  "glassdoor.com",
  "remoteok.com",
  "jobicy.com",
  "arbeitnow.com",
  "weworkremotely.com",
  "angel.co",
  "wellfound.com",
  "dice.com",
  "stackoverflow.com",
  "jobs.github.com",
  "ycombinator.com",
  "jobindex.dk",
  "jobnet.dk",
  "jobbank.dk",
  "jobdanmark.dk",
  "freehire.me",
] as const

/**
 * Verifies a job posting URL against known ATS apex domains and installed portals.
 * Anti-spoofing: Only exact match or valid subdomain match (.apex) passes.
 * Look-alike attacks (evil-greenhouse.io, greenhouse.io.evil.com, userinfo tricks) fail closed.
 */
export function verifySourceHost(urlStr: string): HostVerificationResult {
  if (!urlStr || typeof urlStr !== "string") {
    return {
      host: "invalid",
      category: "unverified",
      isTrustedAts: false,
      warning: "Invalid URL provided",
    }
  }

  try {
    const parsed = new URL(urlStr)
    const hostname = parsed.hostname.toLowerCase()

    if (!hostname) {
      return {
        host: "invalid",
        category: "unverified",
        isTrustedAts: false,
        warning: "Invalid URL provided",
      }
    }

    // Check installed portal boards first (exact match or subdomain)
    for (const portal of INSTALLED_PORTAL_HOSTS) {
      if (hostname === portal || hostname.endsWith(`.${portal}`)) {
        return {
          host: hostname,
          category: "installed_portal",
          isTrustedAts: false,
          apexDomain: portal,
        }
      }
    }

    // Check official ATS apex domains (exact match or subdomain)
    for (const apex of OFFICIAL_ATS_APEXES) {
      if (hostname === apex || hostname.endsWith(`.${apex}`)) {
        return {
          host: hostname,
          category: "official_ats",
          isTrustedAts: true,
          apexDomain: apex,
        }
      }
    }

    // Unverified — fail closed
    return {
      host: hostname,
      category: "unverified",
      isTrustedAts: false,
      warning: `Unverified source host: ${hostname}. Not an official ATS apex.`,
    }
  } catch {
    return {
      host: "invalid",
      category: "unverified",
      isTrustedAts: false,
      warning: "Invalid URL provided",
    }
  }
}

/**
 * Detects look-alike / spoofed hosts that impersonate an official ATS apex
 * (e.g. "evil-greenhouse.io", "greenhouse.io.evil.com", "greenhouse-io.com").
 * Returns true only for hosts that CONTAIN an apex as a substring (or its
 * hyphenated variant) but are NOT the apex itself or a valid `.{apex}` subdomain.
 */
export function isAtsLookalikeHost(hostname: string): boolean {
  const h = hostname.toLowerCase()
  for (const apex of OFFICIAL_ATS_APEXES) {
    if (h === apex || h.endsWith(`.${apex}`)) continue
    if (h.includes(apex)) return true
    if (h.includes(apex.replace(/\./g, "-"))) return true
  }
  return false
}
