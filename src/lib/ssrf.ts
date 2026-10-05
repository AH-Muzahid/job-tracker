/**
 * Server-Side Request Forgery (SSRF) Guard
 * Validates and sanitizes URLs before outbound HTTP fetches.
 * Blocks private networks, cloud metadata services, loopbacks, and non-HTTP protocols.
 */

export interface SSRFValidationResult {
  isValid: boolean
  error?: string
  parsedUrl?: URL
}

export function validateSafePublicUrl(inputUrl: string): SSRFValidationResult {
  if (!inputUrl || typeof inputUrl !== "string") {
    return { isValid: false, error: "URL is required" }
  }

  const trimmed = inputUrl.trim()
  let parsedUrl: URL
  try {
    if (trimmed.includes("://") || trimmed.startsWith("//")) {
      parsedUrl = new URL(trimmed.startsWith("//") ? `https:${trimmed}` : trimmed)
    } else {
      parsedUrl = new URL(`https://${trimmed}`)
    }
  } catch {
    return { isValid: false, error: "Invalid URL format" }
  }

  // 1. Protocol gate: strictly http and https
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return { isValid: false, error: "Only HTTP and HTTPS protocols are supported" }
  }

  // Strip brackets from IPv6 hostnames if present (e.g. "[::1]")
  const hostname = parsedUrl.hostname.toLowerCase().replace(/^\[|\]$/g, "")

  // 2. Loopback & local names
  if (
    hostname === "localhost" ||
    hostname === "0.0.0.0" ||
    hostname.startsWith("127.") ||
    hostname === "::1" ||
    hostname === "0:0:0:0:0:0:0:1" ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".localhost")
  ) {
    return { isValid: false, error: "Access to private or local network URLs is prohibited (SSRF Protection)" }
  }

  // 3. Private IPv4 Ranges (RFC 1918 & RFC 3927 Link-Local / Cloud Metadata)
  // 10.0.0.0/8
  if (hostname.startsWith("10.")) {
    return { isValid: false, error: "Access to private network URLs is prohibited (SSRF Protection)" }
  }
  // 172.16.0.0/12 (172.16.0.0 to 172.31.255.255)
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)) {
    return { isValid: false, error: "Access to private network URLs is prohibited (SSRF Protection)" }
  }
  // 192.168.0.0/16
  if (hostname.startsWith("192.168.")) {
    return { isValid: false, error: "Access to private network URLs is prohibited (SSRF Protection)" }
  }
  // 169.254.0.0/16 (AWS / GCP / Azure metadata service & link-local)
  if (hostname.startsWith("169.254.")) {
    return { isValid: false, error: "Access to cloud metadata and link-local addresses is prohibited (SSRF Protection)" }
  }

  // 4. Private IPv6 Ranges (fc00::/7 Unique Local, fe80::/10 Link-Local)
  if (
    hostname.startsWith("fc") ||
    hostname.startsWith("fd") ||
    hostname.startsWith("fe8") ||
    hostname.startsWith("fe9") ||
    hostname.startsWith("fea") ||
    hostname.startsWith("feb")
  ) {
    return { isValid: false, error: "Access to private IPv6 addresses is prohibited (SSRF Protection)" }
  }

  return { isValid: true, parsedUrl }
}
