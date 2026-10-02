import { describe, it, expect, vi, beforeEach } from "vitest"
import { isUserAdminByMetadata } from "@/lib/auth/admin"

describe("Admin RBAC Auth Verification", () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  it("authorizes user when role metadata is explicitly 'admin'", () => {
    const result = isUserAdminByMetadata({
      clerkUserId: "user_123",
      email: "test@example.com",
      role: "admin",
    })
    expect(result).toBe(true)
  })

  it("authorizes user when clerkUserId matches ADMIN_USER_IDS env", () => {
    vi.stubEnv("ADMIN_USER_IDS", "user_123,user_456")
    const result = isUserAdminByMetadata({
      clerkUserId: "user_123",
      email: "regular@example.com",
    })
    expect(result).toBe(true)
  })

  it("authorizes user when email matches ADMIN_USER_IDS env", () => {
    vi.stubEnv("ADMIN_USER_IDS", "admin@careertrack.ai,ops@careertrack.ai")
    const result = isUserAdminByMetadata({
      clerkUserId: "user_regular_999",
      email: "admin@careertrack.ai",
    })
    expect(result).toBe(true)
  })

  it("rejects regular users without admin role or env match", () => {
    vi.stubEnv("ADMIN_USER_IDS", "user_super_admin")
    const result = isUserAdminByMetadata({
      clerkUserId: "user_regular_candidate",
      email: "candidate@gmail.com",
      role: "user",
    })
    expect(result).toBe(false)
  })

  it("respects DEV_ADMIN_BYPASS in development mode", () => {
    vi.stubEnv("NODE_ENV", "development")
    vi.stubEnv("DEV_ADMIN_BYPASS", "true")
    const result = isUserAdminByMetadata({
      clerkUserId: "user_dev_test",
      email: "dev@localhost",
    })
    expect(result).toBe(true)
  })
})
