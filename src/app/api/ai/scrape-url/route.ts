import { safePublicFetchText } from "@/lib/safe-public-fetch"
import { NextRequest, NextResponse } from "next/server"
import { getInternalUserId } from "@/lib/auth"
import { checkDistributedRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { validateSafePublicUrl } from "@/lib/ssrf"

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

    const ssrfCheck = validateSafePublicUrl(url)
    if (!ssrfCheck.isValid || !ssrfCheck.parsedUrl) {
      return NextResponse.json({ error: ssrfCheck.error || "Internal or invalid URLs are not allowed" }, { status: 400 })
    }

    const parsedUrl = ssrfCheck.parsedUrl

    const res = await safePublicFetchText(parsedUrl.toString(), { timeoutMs: 10000 })

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
