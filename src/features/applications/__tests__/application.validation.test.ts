import { describe, it, expect } from "vitest"
import { validateCreateApplication, validateUpdateApplication } from "../application.validation"

describe("application.validation", () => {
  describe("validateCreateApplication", () => {
    it("should return valid when all required fields are present and valid", () => {
      const result = validateCreateApplication({
        companyName: "Acme Corp",
        jobTitle: "Frontend Developer",
        applicationDate: "2026-07-30",
        status: "Applied",
        source: "LinkedIn",
      })
      expect(result.isValid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it("should fail when a required field is missing", () => {
      const result = validateCreateApplication({
        companyName: "Acme Corp",
        jobTitle: "Frontend Developer",
        applicationDate: "2026-07-30",
        status: "Applied",
      })
      expect(result.isValid).toBe(false)
      expect(result.error).toBe("source is required")
    })

    it("should fail when status is invalid", () => {
      const result = validateCreateApplication({
        companyName: "Acme Corp",
        jobTitle: "Frontend Developer",
        applicationDate: "2026-07-30",
        status: "InvalidStatus",
        source: "LinkedIn",
      })
      expect(result.isValid).toBe(false)
      expect(result.error).toContain("Invalid status")
    })

    it("should fail when source is invalid", () => {
      const result = validateCreateApplication({
        companyName: "Acme Corp",
        jobTitle: "Frontend Developer",
        applicationDate: "2026-07-30",
        status: "Applied",
        source: "UnknownSource",
      })
      expect(result.isValid).toBe(false)
      expect(result.error).toContain("Invalid source")
    })
  })

  describe("validateUpdateApplication", () => {
    it("should return valid for partial updates with valid values", () => {
      const result = validateUpdateApplication({
        status: "Interview",
      })
      expect(result.isValid).toBe(true)
    })

    it("should fail when update contains invalid status", () => {
      const result = validateUpdateApplication({
        status: "HiredNow",
      })
      expect(result.isValid).toBe(false)
      expect(result.error).toContain("Invalid status")
    })
  })
})
