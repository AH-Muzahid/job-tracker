import { NextRequest, NextResponse } from "next/server"
import { getInternalUserId } from "@/lib/auth"
import { checkDistributedRateLimit, rateLimitResponse } from "@/lib/rate-limit"

export async function POST(req: NextRequest) {
  try {
    const userId = await getInternalUserId()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const rl = await checkDistributedRateLimit(`scrape:${userId}`, 10, 60)
    if (!rl.success) return rateLimitResponse(rl)

    const { url } = await req.json()
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    let parsedUrl: URL
    try {
      parsedUrl = new URL(url.startsWith("http") ? url : `https://${url}`)
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 })
    }

    // Block internal/private IPs to prevent SSRF
    const hostname = parsedUrl.hostname
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("172.") ||
      hostname.endsWith(".local")
    ) {
      return NextResponse.json({ error: "Internal URLs are not allowed" }, { status: 400 })
    }

    const res = await fetch(parsedUrl.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) {
      return NextResponse.json({ error: `Failed to fetch page content (Status ${res.status})` }, { status: 500 })
    }

    // Limit response size to 2MB
    const contentLength = res.headers.get("content-length")
    if (contentLength && parseInt(contentLength) > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "Page too large (max 2MB)" }, { status: 400 })
    }

    const html = await res.text()
    const truncatedHtml = html.length > 2 * 1024 * 1024 ? html.slice(0, 2 * 1024 * 1024) : html

    const titleMatch = truncatedHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
    const title = titleMatch ? titleMatch[1].trim() : ""

    const text = truncatedHtml
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, " ")
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()

    if (!text || text.length < 50) {
      return NextResponse.json({ error: "Could not extract meaningful text from URL" }, { status: 400 })
    }

    const truncated = text.length > 8000 ? text.slice(0, 8000) + "..." : text

    return NextResponse.json({
      url: parsedUrl.toString(),
      title,
      text: truncated,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to scrape URL" },
      { status: 500 }
    )
  }
}
