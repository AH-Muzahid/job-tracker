import { describe, it, expect } from "vitest"
import { sanitizePII, maskEmail, maskUrl, containsPII } from "../pii-sanitizer"

describe("maskEmail", () => {
  it("masks local part keeping first char", () => {
    expect(maskEmail("john@example.com")).toBe("j***@example.com")
  })

  it("handles single char local part", () => {
    expect(maskEmail("a@test.com")).toBe("***@test.com")
  })
})

describe("maskUrl", () => {
  it("masks domain and path", () => {
    expect(maskUrl("https://linkedin.com/in/john")).toBe("https://***.com/**")
  })

  it("handles invalid URL gracefully", () => {
    expect(maskUrl("not-a-url")).toBe("***")
  })
})

describe("containsPII", () => {
  it("detects email", () => {
    expect(containsPII("Contact me at john@example.com")).toBe(true)
  })

  it("detects phone number", () => {
    expect(containsPII("Call me at 555-123-4567")).toBe(true)
  })

  it("detects URL", () => {
    expect(containsPII("Visit https://example.com")).toBe(true)
  })

  it("returns false for clean text", () => {
    expect(containsPII("Just a normal sentence")).toBe(false)
  })
})

describe("sanitizePII", () => {
  it("masks email addresses", () => {
    const result = sanitizePII("Email: john@example.com")
    expect(result).not.toContain("john@example.com")
    expect(result).toContain("***@example.com")
  })

  it("masks phone numbers", () => {
    const result = sanitizePII("Phone: 555-123-4567")
    expect(result).not.toContain("555-123-4567")
    expect(result).toContain("***-***-4567")
  })

  it("masks URLs", () => {
    const result = sanitizePII("Visit https://linkedin.com/in/john")
    expect(result).not.toContain("linkedin.com/in/john")
    expect(result).toContain("***.com/**")
  })

  it("handles empty string", () => {
    expect(sanitizePII("")).toBe("")
  })

  it("preserves non-PII text", () => {
    expect(sanitizePII("Hello world")).toBe("Hello world")
  })

  it("handles multiple PII types in one string", () => {
    const result = sanitizePII("Email john@test.com or call 555-123-4567")
    expect(result).not.toContain("john@test.com")
    expect(result).not.toContain("555-123-4567")
  })
})
