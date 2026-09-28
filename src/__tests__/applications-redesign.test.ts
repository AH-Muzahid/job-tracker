import { describe, it, expect } from "vitest"
import { boardColumns, STATUS_OPTIONS, SORT_OPTIONS } from "@/components/dashboard/types"
import { isFollowUpDue, calculateBusinessDays } from "@/lib/applications/follow-up-utils"

describe("Applications Pipeline Redesign Guardrails", () => {
  describe("1. Board Columns Structure & Impeccable Standards", () => {
    it("configures exactly 6 standardized pipeline stages in logical progression", () => {
      expect(boardColumns).toHaveLength(6)
      const columnKeys = boardColumns.map((col) => col.key)
      expect(columnKeys).toEqual(["staged", "saved", "applied", "interviews", "rejected", "offer"])
    })

    it("ensures every board column has a concise title and empty state guidance description", () => {
      for (const col of boardColumns) {
        expect(col.title).toBeTruthy()
        expect(col.title.length).toBeLessThan(15) // Concise, no clumsy suffix
        expect("description" in col).toBe(true)
        expect((col as any).description).toBeTruthy()
      }
    })

    it("strictly verifies NO Sparkles icon is used in boardColumns", () => {
      for (const col of boardColumns) {
        const iconName = (col.icon as any)?.name || (col.icon as any)?.displayName || ""
        expect(iconName.toLowerCase()).not.toContain("sparkle")
      }
    })
  })

  describe("2. Follow-Up Business Logic & Dormancy Alerting", () => {
    it("identifies applied application silent for >= 5 business days as due for follow-up", () => {
      // 10 calendar days ago is > 5 business days
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
      const isDue = isFollowUpDue({
        status: "Applied",
        applicationDate: tenDaysAgo,
      })
      expect(isDue).toBe(true)
    })

    it("does not flag freshly submitted applications (< 5 business days)", () => {
      const yesterday = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      const isDue = isFollowUpDue({
        status: "Applied",
        applicationDate: yesterday,
      })
      expect(isDue).toBe(false)
    })

    it("does not flag non-active statuses (e.g. Staged, Saved, Offer, Rejected)", () => {
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
      expect(isFollowUpDue({ status: "Staged", applicationDate: twoWeeksAgo })).toBe(false)
      expect(isFollowUpDue({ status: "Saved", applicationDate: twoWeeksAgo })).toBe(false)
      expect(isFollowUpDue({ status: "Offer", applicationDate: twoWeeksAgo })).toBe(false)
      expect(isFollowUpDue({ status: "Rejected", applicationDate: twoWeeksAgo })).toBe(false)
    })

    it("correctly calculates business days excluding weekends", () => {
      const monday = new Date("2026-09-21T09:00:00Z")
      const nextMonday = new Date("2026-09-28T09:00:00Z")
      const days = calculateBusinessDays(monday, nextMonday)
      expect(days).toBe(5)
    })
  })

  describe("3. Filter & Sort Options", () => {
    it("provides all canonical statuses for filtering", () => {
      expect(STATUS_OPTIONS).toContain("Staged")
      expect(STATUS_OPTIONS).toContain("Saved")
      expect(STATUS_OPTIONS).toContain("Applied")
      expect(STATUS_OPTIONS).toContain("Assessment")
      expect(STATUS_OPTIONS).toContain("Interview")
      expect(STATUS_OPTIONS).toContain("Offer")
      expect(STATUS_OPTIONS).toContain("Rejected")
    })

    it("provides standard sorting options", () => {
      const sortKeys = SORT_OPTIONS.map((s) => s.value)
      expect(sortKeys).toContain("newest")
      expect(sortKeys).toContain("oldest")
      expect(sortKeys).toContain("company")
      expect(sortKeys).toContain("status")
    })
  })
})
