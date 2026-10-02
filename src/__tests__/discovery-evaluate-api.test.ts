import { describe, it, expect, vi, beforeEach } from "vitest"
import { extractTechTagsFromText } from "@/lib/discovery/scrapers"
import { evaluateJobScamRisk } from "@/lib/discovery/matching"

describe("Discovery Evaluate & Ingestion Engine (CAG-03)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("Tech Stack Extraction", () => {
    it("extracts canonical technologies from job posting text", () => {
      const sampleJd = `
        We are seeking a Senior Full Stack Engineer.
        Must have deep experience with React, Next.js, TypeScript, PostgreSQL, and Tailwind CSS.
        Familiarity with GraphQL and Docker is a strong plus.
      `
      const tags = extractTechTagsFromText(sampleJd)
      expect(tags).toContain("react")
      expect(tags).toContain("typescript")
      expect(tags).toContain("postgresql")
      expect(tags).toContain("nextjs")
      expect(tags).toContain("docker")
    })

    it("handles empty or non-tech text gracefully", () => {
      const tags = extractTechTagsFromText("General office manager position with administrative duties.")
      expect(Array.isArray(tags)).toBe(true)
    })
  })

  describe("Autonomous Scam Risk Evaluation", () => {
    it("verifies clean, legitimate job postings as safe", () => {
      const legitJob = {
        title: "Senior Frontend Engineer",
        company: "Stripe",
        description: "Join Stripe's payments platform team. Build scalable UIs with React and TypeScript.",
        url: "https://stripe.com/jobs/senior-frontend-engineer",
      }
      const evalResult = evaluateJobScamRisk(legitJob)
      expect(evalResult.isSuspicious).toBe(false)
      expect(evalResult.scamScore).toBeLessThan(0.3)
      expect(evalResult.flags.length).toBe(0)
    })

    it("flags job postings requiring contact via Telegram / WhatsApp", () => {
      const scamJob = {
        title: "Remote Data Assistant",
        company: "Global Career Ltd",
        description: "Immediate hire! No experience required. Message hiring manager on Telegram: @quick_hire_hr to interview.",
        url: "https://sketchy-jobs-free.xyz/apply",
      }
      const evalResult = evaluateJobScamRisk(scamJob)
      expect(evalResult.scamScore).toBeGreaterThanOrEqual(0.4)
      expect(evalResult.flags.some((f) => f.includes("telegram") || f.includes("contact"))).toBe(true)
    })

    it("flags job postings demanding up-front fees, equipment checks, or cryptocurrency", () => {
      const feeJob = {
        title: "Data Entry Clerk",
        company: "Apex Innovations",
        description: "Candidates will receive a cashier's check to buy equipment from our certified vendor. Upfront payment required.",
      }
      const evalResult = evaluateJobScamRisk(feeJob)
      expect(evalResult.scamScore).toBeGreaterThanOrEqual(0.5)
      expect(evalResult.flags.some((f) => f.includes("payment") || f.includes("fee"))).toBe(true)
    })
  })

  describe("SSRF URL Defense Rules", () => {
    const isPrivateOrLocalHost = (hostname: string) => {
      const h = hostname.toLowerCase()
      return (
        h === "localhost" ||
        h === "127.0.0.1" ||
        h === "0.0.0.0" ||
        h.startsWith("192.168.") ||
        h.startsWith("10.") ||
        h.startsWith("172.") ||
        h.endsWith(".local") ||
        h.endsWith(".internal")
      )
    }

    it("rejects loopback and private IP addresses", () => {
      expect(isPrivateOrLocalHost("localhost")).toBe(true)
      expect(isPrivateOrLocalHost("127.0.0.1")).toBe(true)
      expect(isPrivateOrLocalHost("192.168.1.1")).toBe(true)
      expect(isPrivateOrLocalHost("10.0.0.25")).toBe(true)
      expect(isPrivateOrLocalHost("server.internal")).toBe(true)
    })

    it("permits public job board domains", () => {
      expect(isPrivateOrLocalHost("boards.greenhouse.io")).toBe(false)
      expect(isPrivateOrLocalHost("jobs.lever.co")).toBe(false)
      expect(isPrivateOrLocalHost("linkedin.com")).toBe(false)
      expect(isPrivateOrLocalHost("stripe.com")).toBe(false)
    })
  })

  describe("LinkedIn Post & URL Scraper Resilience", () => {
    it("correctly extracts company and role using pipe delimiter and decodes HTML entities", () => {
      const rawTitle = "🚀 We’re Hiring: Full Stack Developer | BEK &amp; Co."
      const decodedTitle = rawTitle
        .replace(/&amp;/g, "&")
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .trim()

      const parts = decodedTitle.split(/[-|–|\|]/)
      const rolePart = parts[0]?.trim()
      const companyPart = parts[1]?.trim()

      expect(decodedTitle).toBe("🚀 We’re Hiring: Full Stack Developer | BEK & Co.")
      expect(rolePart).toContain("Full Stack Developer")
      expect(companyPart).toBe("BEK & Co.")
    })

    it("detects LinkedIn login and authentication walls to prevent feeding junk to LLM", () => {
      const isAuthwall = (text: string) =>
        /authwall|join linkedin to view|agree & join linkedin|sign in to linkedin|sign-in to view/i.test(text) &&
        !/responsibilities|qualifications|requirements|we are hiring|about the role/i.test(text)

      const authwallPageText = "Agree & Join LinkedIn. By clicking Continue to join or sign in, you agree to LinkedIn's User Agreement."
      expect(isAuthwall(authwallPageText)).toBe(true)

      const realPostText = "🚀 We are hiring a Senior Full Stack Engineer. Responsibilities include building scalable web apps with React and Node.js."
      expect(isAuthwall(realPostText)).toBe(false)
    })

    it("safely handles non-JSON responses from Vercel without throwing SyntaxError", async () => {
      // Simulates Vercel 504 / 500 plain text response
      const mockVercel504Response = {
        ok: false,
        status: 504,
        headers: new Headers({ "content-type": "text/plain; charset=utf-8" }),
        json: async () => {
          throw new SyntaxError("Unexpected token 'A', \"An error o\"... is not valid JSON")
        },
        text: async () => "An error occurred with this application.",
      }

      let parsedError = `Evaluation failed (HTTP ${mockVercel504Response.status})`
      try {
        const contentType = mockVercel504Response.headers.get("content-type") || ""
        if (contentType.includes("application/json")) {
          const json = (await mockVercel504Response.json()) as { error?: string }
          parsedError = json.error || parsedError
        } else {
          const raw = await mockVercel504Response.text()
          if (mockVercel504Response.status === 504) {
            parsedError = "Evaluation timed out on the server. Please copy and paste the job description text directly into the box."
          } else if (raw && raw.length < 300 && !raw.includes("<html")) {
            parsedError = raw.trim()
          }
        }
      } catch {
        // Fallback
      }

      expect(parsedError).toBe("Evaluation timed out on the server. Please copy and paste the job description text directly into the box.")
      expect(parsedError).not.toContain("Unexpected token")
    })
  })
})
