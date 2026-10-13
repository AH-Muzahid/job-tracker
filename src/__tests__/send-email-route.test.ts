vi.mock("@/lib/ai/side-effect-dedup", () => ({ sideEffectKey: vi.fn(() => "test"), deduplicateDelivery: vi.fn((_key, task) => task()) }))
import { beforeEach, describe, expect, it, vi } from "vitest"
const mocks = vi.hoisted(() => ({ auth: vi.fn(), find: vi.fn(), update: vi.fn(), change: vi.fn(), send: vi.fn() }))
vi.mock("@/lib/auth", () => ({ getInternalUserId: mocks.auth }))
vi.mock("@/lib/prisma", () => ({ prisma: { application: { findFirst: mocks.find, update: mocks.update }, statusChange: { create: mocks.change } }, withDbRetry: (fn: () => unknown) => fn() }))
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: () => ({ success: true }), rateLimitResponse: vi.fn() }))
vi.mock("@/lib/email", async (original) => ({ ...await original<typeof import("@/lib/email")>(), sendEmail: mocks.send }))
import { POST } from "@/app/api/ai/send-email/route"
import { NextRequest } from "next/server"
const request = (body: unknown) => new NextRequest("https://example.com/api/ai/send-email", { method: "POST", body: JSON.stringify(body) })
const payload = { to: "recruiter@example.com", subject: "Application", body: "Hello", applicationId: "app-1" }
beforeEach(() => { vi.resetAllMocks(); mocks.auth.mockResolvedValue("user-1"); mocks.find.mockResolvedValue({ id: "app-1", status: "Saved", companyName: "Acme", jobTitle: "Engineer" }); mocks.send.mockResolvedValue({ success: true, simulated: true }) })
describe("outreach email API", () => {
  it("requires authentication", async () => {
    mocks.auth.mockResolvedValue(null); expect((await POST(request(payload))).status).toBe(401); expect(mocks.send).not.toHaveBeenCalled()
  })
  it.each([{ ...payload, to: "bad" }, { ...payload, subject: "Hi\r\nBcc: x" }, { ...payload, body: { invalid: true } }])("validates payload before sending", async (body) => {
    expect((await POST(request(body))).status).toBe(400); expect(mocks.send).not.toHaveBeenCalled()
  })
  it("rejects applications outside the user's ownership", async () => {
    mocks.find.mockResolvedValue(null); expect((await POST(request(payload))).status).toBe(404)
    expect(mocks.find).toHaveBeenCalledWith({ where: { id: "app-1", userId: "user-1" } }); expect(mocks.send).not.toHaveBeenCalled()
  })
  it("does not advance applications after simulated sends", async () => {
    expect((await POST(request(payload))).status).toBe(200); expect(mocks.update).not.toHaveBeenCalled(); expect(mocks.change).not.toHaveBeenCalled()
  })
  it("does not expose provider secrets", async () => {
    mocks.send.mockResolvedValue({ success: false, error: "secret provider diagnostics" })
    const result = await POST(request(payload)); expect(result.status).toBe(500); expect(await result.text()).not.toContain("secret")
  })
})
