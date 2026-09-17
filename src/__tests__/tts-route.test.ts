import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

const mockGetInternalUserId = vi.fn()
const mockCheckDistributedRateLimit = vi.fn()
const mockGetUserAIConfig = vi.fn()

vi.mock("@/lib/auth", () => ({
  getInternalUserId: () => mockGetInternalUserId(),
}))

vi.mock("@/lib/rate-limit", () => ({
  checkDistributedRateLimit: (...args: any[]) => mockCheckDistributedRateLimit(...args),
  rateLimitResponse: () => new Response("Too Many Requests", { status: 429 }),
}))

vi.mock("@/lib/ai/config", () => ({
  getUserAIConfig: (...args: any[]) => mockGetUserAIConfig(...args),
}))

describe("TTS API Route (INT-09)", () => {
  let GET: typeof import("@/app/api/ai/tts/route").GET
  let POST: typeof import("@/app/api/ai/tts/route").POST

  beforeEach(async () => {
    vi.clearAllMocks()
    delete process.env.OPENAI_API_KEY
    mockGetInternalUserId.mockResolvedValue("user-tts-123")
    mockCheckDistributedRateLimit.mockResolvedValue({ success: true, remaining: 59 })
    mockGetUserAIConfig.mockResolvedValue(null)

    // Dynamic import to ensure mocks are active
    const mod = await import("@/app/api/ai/tts/route")
    GET = mod.GET
    POST = mod.POST
  })

  it("returns 401 when user is not authenticated", async () => {
    mockGetInternalUserId.mockResolvedValueOnce(null)
    const req = new NextRequest("http://localhost/api/ai/tts?text=hello")
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it("uses 60 requests per 60 seconds distributed rate limit", async () => {
    const req = new NextRequest("http://localhost/api/ai/tts?text=hello")
    await GET(req)
    expect(mockCheckDistributedRateLimit).toHaveBeenCalledWith("tts:user-tts-123", 60, 60)
  })

  it("returns 400 when text is empty", async () => {
    const req = new NextRequest("http://localhost/api/ai/tts?text=")
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it("returns 204 No Content for Bengali text to trigger native browser speech synthesis", async () => {
    const req = new NextRequest("http://localhost/api/ai/tts?text=" + encodeURIComponent("আপনি কেমন আছেন?"))
    const res = await GET(req)
    expect(res.status).toBe(204)
  })

  it("returns 204 No Content when no OpenAI API key is configured", async () => {
    mockGetUserAIConfig.mockResolvedValueOnce(null)
    const req = new NextRequest("http://localhost/api/ai/tts?text=Welcome+to+the+interview")
    const res = await GET(req)
    expect(res.status).toBe(204)
  })

  it("calls OpenAI TTS when API key is present and returns audio stream", async () => {
    mockGetUserAIConfig.mockResolvedValueOnce({
      providerType: "openai",
      apiKey: "sk-mock-openai-key",
    })

    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
    })
    globalThis.fetch = mockFetch as any

    const req = new NextRequest("http://localhost/api/ai/tts?text=Welcome+to+the+interview&gender=female")
    const res = await GET(req)

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.openai.com/v1/audio/speech",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer sk-mock-openai-key",
        }),
        body: JSON.stringify({
          model: "tts-1",
          input: "Welcome to the interview",
          voice: "nova",
          response_format: "mp3",
        }),
      })
    )
    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Type")).toBe("audio/mpeg")
  })
})
