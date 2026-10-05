import { describe, it, expect } from "vitest"
import { validateSafePublicUrl } from "@/lib/ssrf"

describe("SSRF Protection Guardrail", () => {
  it("permits safe public HTTPS and HTTP URLs", () => {
    const urls = [
      "https://jobs.lever.co/stripe/software-engineer",
      "https://boards.greenhouse.io/airbnb/jobs/12345",
      "http://careers.google.com/jobs/results",
      "https://news.ycombinator.com/item?id=123",
    ]

    for (const url of urls) {
      const result = validateSafePublicUrl(url)
      expect(result.isValid).toBe(true)
      expect(result.parsedUrl).toBeDefined()
    }
  })

  it("blocks localhost, loopback, and internal hostnames", () => {
    const malicious = [
      "http://localhost:3000/api",
      "http://127.0.0.1:8080/admin",
      "http://127.0.0.2/secret",
      "http://0.0.0.0:5000",
      "http://[::1]:8080",
      "http://server.local",
      "http://database.internal",
      "http://app.localhost",
    ]

    for (const url of malicious) {
      const result = validateSafePublicUrl(url)
      expect(result.isValid).toBe(false)
      expect(result.error).toMatch(/prohibited|private|local/i)
    }
  })

  it("blocks private RFC 1918 IPv4 ranges", () => {
    const privateIps = [
      "http://10.0.0.1/sensitive",
      "http://10.254.1.1",
      "http://172.16.0.1/admin",
      "http://172.31.255.255",
      "http://192.168.1.1/router",
      "http://192.168.0.254",
    ]

    for (const url of privateIps) {
      const result = validateSafePublicUrl(url)
      expect(result.isValid).toBe(false)
      expect(result.error).toMatch(/private network/i)
    }
  })

  it("blocks cloud metadata service (169.254.169.254)", () => {
    const metadataUrls = [
      "http://169.254.169.254/latest/meta-data/",
      "http://169.254.169.254/computeMetadata/v1/",
      "http://169.254.1.1",
    ]

    for (const url of metadataUrls) {
      const result = validateSafePublicUrl(url)
      expect(result.isValid).toBe(false)
      expect(result.error).toMatch(/cloud metadata|link-local/i)
    }
  })

  it("blocks non-HTTP protocols such as file://, ftp://, and gopher://", () => {
    const dangerousProtocols = [
      "file:///etc/passwd",
      "ftp://ftp.example.com/files",
      "gopher://gopher.example.com",
      "javascript:alert(1)",
    ]

    for (const url of dangerousProtocols) {
      const result = validateSafePublicUrl(url)
      expect(result.isValid).toBe(false)
      expect(result.error).toMatch(/HTTP and HTTPS|Invalid URL format/i)
    }
  })
})
