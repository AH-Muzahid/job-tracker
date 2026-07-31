import { NextRequest, NextResponse } from "next/server"
import { getInternalUserId } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const userId = await getInternalUserId()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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

    const html = await res.text()

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
    const title = titleMatch ? titleMatch[1].trim() : ""

    // Clean HTML tags and scripts
    const text = html
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
    console.error("URL scraper error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to scrape URL" },
      { status: 500 }
    )
  }
}
