import { lookup } from "node:dns/promises"
import { isIP } from "node:net"
import { request as httpRequest } from "node:http"
import { request as httpsRequest } from "node:https"
import { validateSafePublicUrl } from "./ssrf"

export function isPublicAddress(address: string): boolean {
  if (isIP(address) === 4) return validateSafePublicUrl(`https://${address}`).isValid
  // Only global unicast IPv6; exclude documentation space. Mapped/transition IPs fail closed.
  if (isIP(address) !== 6) return false
  const normalized = new URL(`http://[${address}]/`).hostname.slice(1, -1)
  return /^[23]/i.test(normalized) && !/^2001:(?:db8|:|0:|2:|10:|20:)/i.test(normalized) && !/^2002:/i.test(normalized)
}

/** DNS is validated and pinned in lookup, including every redirect. No ambient proxy. */
export async function safePublicFetchText(input: string, options: { timeoutMs?: number; maxBytes?: number } = {}) {
  const deadline = Date.now() + (options.timeoutMs ?? 10000)
  const maxBytes = options.maxBytes ?? 2 * 1024 * 1024
  let next = input
  for (let hop = 0; hop <= 4; hop++) {
    const checked = validateSafePublicUrl(next)
    if (!checked.isValid || !checked.parsedUrl) throw new Error("Unsafe URL destination")
    const url = checked.parsedUrl
    if (url.port && url.port !== "80" && url.port !== "443") throw new Error("Unsupported URL port")
    const remaining = deadline - Date.now()
    if (remaining <= 0) throw new Error("Public fetch timed out")
    const addresses = await Promise.race([
      lookup(url.hostname, { all: true }),
      new Promise<never>((_, reject) => { const timer = setTimeout(() => reject(new Error("DNS lookup timed out")), remaining); timer.unref() }),
    ])
    if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) throw new Error("Unsafe resolved address")
    const pinned = addresses[0]
    const response = await new Promise<{ status: number; location?: string; text: string }>((resolve, reject) => {
      const request = (url.protocol === "https:" ? httpsRequest : httpRequest)(url, {
        agent: false, family: pinned.family,
        headers: { "User-Agent": "CareerTrack/1.0", Accept: "text/html,text/plain", "Accept-Encoding": "identity" },
        lookup: (_hostname, _options, callback) => callback(null, pinned.address, pinned.family),
      }, (res) => {
        const status = res.statusCode ?? 502
        if (status >= 300 && status < 400 && res.headers.location) {
          res.destroy(); resolve({ status, location: res.headers.location, text: "" }); return
        }
        if (Number(res.headers["content-length"] || 0) > maxBytes) { res.destroy(); reject(new Error("Page exceeds size limit")); return }
        const chunks: Buffer[] = []
        let bytes = 0
        res.on("data", (chunk: Buffer) => {
          bytes += chunk.length
          if (bytes > maxBytes) { res.destroy(); reject(new Error("Page exceeds size limit")); return }
          chunks.push(chunk)
        })
        res.on("end", () => resolve({ status, text: Buffer.concat(chunks).toString("utf8") }))
        res.on("error", reject)
      })
      const timer = setTimeout(() => request.destroy(new Error("Public fetch timed out")), Math.max(1, deadline - Date.now()))
      request.on("close", () => clearTimeout(timer))
      request.on("error", reject)
      request.end()
    })
    if (response.location) { next = new URL(response.location, url).toString(); continue }
    return { ok: response.status >= 200 && response.status < 300, status: response.status, text: async () => response.text, headers: new Headers() }
  }
  throw new Error("Too many redirects")
}
