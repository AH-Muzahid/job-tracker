import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  calculateImplicitPreferenceAdjustment,
  getUserImplicitPreferences,
  invalidateUserImplicitPreferences,
  type UserImplicitPreferences,
} from "@/lib/discovery/preferences"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    userJobMatch: {
      findMany: vi.fn(),
    },
    discoveryEvent: {
      findMany: vi.fn(),
    },
  },
  withDbRetry: vi.fn((cb) => cb()),
}))

vi.mock("@/lib/redis", () => {
  const store = new Map<string, any>()
  return {
    getCachedJson: vi.fn(async (key: string) => store.get(key) || null),
    setCachedJson: vi.fn(async (key: string, val: any) => {
      store.set(key, val)
      return true
    }),
    invalidateCache: vi.fn(async (key: string) => {
      store.delete(key)
      return true
    }),
  }
})

describe("Implicit Preference Learning Engine (REC-09)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("calculateImplicitPreferenceAdjustment", () => {
    const basePrefs: UserImplicitPreferences = {
      userId: "user-123",
      updatedAt: new Date().toISOString(),
      favoredSkills: { typescript: 3.0, nextjs: 2.5, react: 2.0 },
      favoredRoles: { fullstack: 2.5, frontend: 2.0 },
      favoredCompanies: { vercel: 2.0, stripe: 1.5 },
      favoredWorkModes: { remote: 3.0 },
      dislikedRoles: { devops: 2.5, salesforce: 3.0, qa: 1.0 }, // qa is only 1.0 (below threshold)
      dislikedSkills: { c: 2.0, php: 2.0, ruby: 1.0 },
      dislikedCompanies: { "bad corp": 2.0 },
      dislikedLocations: { "chicago, il": 2.0 },
      averseToOnsite: true,
      totalSaved: 5,
      totalDismissed: 6,
      totalApplied: 2,
      dismissReasons: { wrong_role: 4, bad_company: 1, wrong_location: 1 },
    }

    it("applies positive affinity boost when job matches favored company, role, and skills", () => {
      const job = {
        title: "Senior Fullstack Engineer",
        company: "Vercel",
        location: "Remote",
        isRemote: true,
        tags: ["react", "nextjs", "typescript"],
      }

      const adj = calculateImplicitPreferenceAdjustment(job, basePrefs)
      expect(adj.scoreDelta).toBeGreaterThan(0)
      expect(adj.boostPoints).toBeGreaterThanOrEqual(8)
      expect(adj.penaltyPoints).toBe(0)
      expect(adj.reasons[0]).toContain("Learned Preference")
      expect(adj.reasons[0]).toContain("Vercel")
    })

    it("caps positive boost at +10 points max", () => {
      const hyperAlignedJob = {
        title: "Staff Fullstack Frontend Engineer",
        company: "Vercel",
        location: "Remote",
        isRemote: true,
        tags: ["typescript", "nextjs", "react"],
      }

      const adj = calculateImplicitPreferenceAdjustment(hyperAlignedJob, basePrefs)
      expect(adj.boostPoints).toBeLessThanOrEqual(10)
      expect(adj.scoreDelta).toBeLessThanOrEqual(10)
    })

    it("activates negative aversion penalty when job matches repeated disliked role (count >= 2.0)", () => {
      const devopsJob = {
        title: "Lead DevOps & SRE Engineer",
        company: "Acme Cloud",
        location: "Remote",
        isRemote: true,
        tags: ["kubernetes", "terraform"],
      }

      const adj = calculateImplicitPreferenceAdjustment(devopsJob, basePrefs)
      expect(adj.penaltyPoints).toBeGreaterThanOrEqual(12)
      expect(adj.scoreDelta).toBeLessThan(0)
      expect(adj.reasons.some((r) => r.includes("devops"))).toBe(true)
    })

    it("enforces Threshold Defense: single dismissal (< 2.0 count) does NOT penalize", () => {
      // 'qa' role in basePrefs is only 1.0, below the 2.0 threshold
      const qaJob = {
        title: "QA Automation Engineer",
        company: "Independent Co",
        location: "Remote",
        isRemote: true,
        tags: ["playwright", "cypress"],
      }

      const adj = calculateImplicitPreferenceAdjustment(qaJob, basePrefs)
      // Should NOT penalize QA because count is below the threshold of 2.0
      expect(adj.penaltyPoints).toBe(0)
      expect(adj.reasons).toHaveLength(0)
    })

    it("penalizes disliked company when dismissed under bad_company", () => {
      const badCorpJob = {
        title: "Software Engineer",
        company: "Bad Corp",
        location: "Remote",
        isRemote: true,
        tags: ["typescript"],
      }

      const adj = calculateImplicitPreferenceAdjustment(badCorpJob, basePrefs)
      expect(adj.penaltyPoints).toBeGreaterThanOrEqual(15)
      expect(adj.reasons.some((r) => r.includes("Bad Corp"))).toBe(true)
    })

    it("penalizes onsite jobs when user has averseToOnsite flag", () => {
      const onsiteJob = {
        title: "Junior Developer",
        company: "Local Retail",
        location: "Boston, MA",
        isRemote: false,
        tags: [],
      }

      const adj = calculateImplicitPreferenceAdjustment(onsiteJob, basePrefs)
      expect(adj.penaltyPoints).toBeGreaterThanOrEqual(8)
      expect(adj.reasons.some((r) => r.includes("on-site"))).toBe(true)
    })

    it("caps negative penalty at -25 points max", () => {
      const extremeBadJob = {
        title: "Senior Salesforce DevOps Engineer",
        company: "Bad Corp",
        location: "Onsite in Chicago",
        isRemote: false,
        tags: ["c", "php"],
      }

      const adj = calculateImplicitPreferenceAdjustment(extremeBadJob, basePrefs)
      expect(adj.penaltyPoints).toBeLessThanOrEqual(25)
      expect(adj.scoreDelta).toBeGreaterThanOrEqual(-25)
    })

    it("gracefully returns zero delta when preferences are null or empty", () => {
      const adj = calculateImplicitPreferenceAdjustment(
        { title: "Developer", company: "Meta", location: "Remote" },
        null
      )
      expect(adj).toEqual({ scoreDelta: 0, boostPoints: 0, penaltyPoints: 0, reasons: [] })
    })
  })

  describe("getUserImplicitPreferences & Invalidation", () => {
    it("aggregates UserJobMatch records into learned affinities and aversions", async () => {
      const { prisma } = await import("@/lib/prisma")

      const now = new Date()
      ;(prisma.userJobMatch.findMany as any).mockResolvedValue([
        {
          status: "SAVED",
          isSaved: true,
          updatedAt: now,
          job: {
            title: "Senior Frontend Engineer",
            company: "Stripe",
            isRemote: true,
            tags: ["react", "typescript"],
          },
        },
        {
          status: "DISMISSED",
          dismissReason: "wrong_role",
          updatedAt: now,
          job: {
            title: "DevOps Engineer",
            company: "OldTech",
            isRemote: true,
            tags: ["terraform"],
          },
        },
        {
          status: "DISMISSED",
          dismissReason: "wrong_role",
          updatedAt: now,
          job: {
            title: "DevOps & Infrastructure Architect",
            company: "LegacyCorp",
            isRemote: true,
            tags: ["docker"],
          },
        },
      ])
      ;(prisma.discoveryEvent.findMany as any).mockResolvedValue([])

      const prefs = await getUserImplicitPreferences("user-test-777")
      expect(prefs.totalSaved).toBe(1)
      expect(prefs.totalDismissed).toBe(2)
      expect(prefs.favoredCompanies["stripe"]).toBeGreaterThanOrEqual(1.0)
      expect(prefs.favoredSkills["typescript"]).toBeGreaterThanOrEqual(1.0)
      // 2 dismissals of devops roles should equal >= 2.0 count
      expect(prefs.dislikedRoles["devops"]).toBeGreaterThanOrEqual(2.0)
    })

    it("invalidates the user cache key properly and records invalidation timestamp", async () => {
      const { invalidateCache, setCachedJson } = await import("@/lib/redis")
      await invalidateUserImplicitPreferences("user-999")
      expect(invalidateCache).toHaveBeenCalledWith("user:implicit-pref:user-999")
      expect(setCachedJson).toHaveBeenCalledWith(
        "user:implicit-pref:invalidated-at:user-999",
        expect.any(Number),
        3600
      )
    })

    it("discards stale cache write when invalidation occurs during DB read window", async () => {
      const { prisma } = await import("@/lib/prisma")
      const { setCachedJson, getCachedJson } = await import("@/lib/redis")

      ;(prisma.userJobMatch.findMany as any).mockResolvedValueOnce([])
      ;(prisma.discoveryEvent.findMany as any).mockResolvedValueOnce([])

      // Simulate that an invalidation occurred after the fetch started
      vi.mocked(getCachedJson).mockImplementation(async (key: string) => {
        if (key === "user:implicit-pref:invalidated-at:user-race-1") {
          return Date.now() + 5000 // Invalidation happened during read
        }
        return null
      })

      await getUserImplicitPreferences("user-race-1")

      // Verify that setCachedJson was NOT called for the preferences cacheKey
      expect(setCachedJson).not.toHaveBeenCalledWith(
        "user:implicit-pref:user-race-1",
        expect.anything(),
        expect.anything()
      )
    })
  })
})
