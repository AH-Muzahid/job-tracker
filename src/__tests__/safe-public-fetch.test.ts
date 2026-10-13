import { beforeEach, describe, expect, it, vi } from "vitest"
import { EventEmitter } from "node:events"
import { isPublicAddress, safePublicFetchText } from "@/lib/safe-public-fetch"

const network = vi.hoisted(() => ({ dns: vi.fn(), request: vi.fn() }))
vi.mock("node:dns/promises", () => ({ lookup: network.dns, default: { lookup: network.dns } }))
vi.mock("node:http", () => ({ request: network.request, default: { request: network.request } }))
vi.mock("node:https", () => ({ request: network.request, default: { request: network.request } }))

describe("public fetch outbound boundary", () => {
  beforeEach(() => { vi.clearAllMocks(); network.dns.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]) })
  function response(status: number, chunks: string[], location?: string) {
    network.request.mockImplementationOnce((_url, _options, receive) => {
      const req = new EventEmitter() as EventEmitter & { end: () => void; destroy: () => void }
      req.destroy = () => req.emit("close")
      req.end = () => queueMicrotask(() => {
        const res = new EventEmitter() as EventEmitter & { statusCode: number; headers: Record<string, string>; destroy: () => void }
        res.statusCode = status; res.headers = location ? { location } : {}; res.destroy = () => req.emit("close")
        receive(res)
        for (const chunk of chunks) res.emit("data", Buffer.from(chunk))
        res.emit("end"); req.emit("close")
      })
      return req
    })
  }
  it("rejects literal/mapped private addresses and DNS rebinding targets", async () => {
    expect(isPublicAddress("::ffff:127.0.0.1")).toBe(false)
    network.dns.mockResolvedValue([{ address: "127.0.0.1", family: 4 }])
    await expect(safePublicFetchText("https://jobs.example.test")).rejects.toThrow("Unsafe resolved")
    expect(network.request).not.toHaveBeenCalled()
  })
  it("pins the validated DNS result in the transport lookup", async () => {
    response(200, ["job content"])
    expect(await (await safePublicFetchText("https://jobs.example.test")).text()).toBe("job content")
    const callback = vi.fn()
    network.request.mock.calls[0][1].lookup("ignored", {}, callback)
    expect(callback).toHaveBeenCalledWith(null, "93.184.216.34", 4)
  })
  it("rejects redirects to private addresses before the next connection", async () => {
    response(302, [], "http://127.0.0.1/metadata")
    await expect(safePublicFetchText("https://jobs.example.test")).rejects.toThrow("Unsafe URL")
    expect(network.request).toHaveBeenCalledTimes(1)
  })
  it("caps chunked response bytes even without content-length", async () => {
    response(200, ["1234", "5678"])
    await expect(safePublicFetchText("https://jobs.example.test", { maxBytes: 5 })).rejects.toThrow("size limit")
  })
  it("rejects URL credentials and nonstandard ports", async () => {
    await expect(safePublicFetchText("https://name:password@jobs.example.test")).rejects.toThrow("Unsafe URL")
    await expect(safePublicFetchText("https://jobs.example.test:8080")).rejects.toThrow("Unsupported URL port")
  })
})
