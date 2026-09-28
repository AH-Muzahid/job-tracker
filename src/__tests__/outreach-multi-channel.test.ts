import { describe, it, expect } from "vitest"
import {
  extractContactEmail,
  sanitizeOutreachPlaceholders,
  generateDeterministicOutreachBundle,
  OutreachContext,
} from "@/lib/applications/outreach-engine"
import fs from "fs"
import path from "path"

describe("Multi-Channel Outreach Engine & Zero-Placeholder Enforcement", () => {
  const mockContext: OutreachContext = {
    companyName: "nextjobz",
    jobTitle: "Full Stack Developer - Next.js",
    candidateName: "AH Muzahid",
    candidateEmail: "muzahid@example.dev",
    githubUrl: "https://github.com/AH-Muzahid",
    linkedinUrl: "https://linkedin.com/in/ah-muzahid",
    portfolioUrl: "https://muzahid.dev",
    skills: ["Next.js", "React", "Node.js", "TypeScript"],
    topProjects: [
      {
        name: "CodeArena",
        stack: "Next.js, Node.js, WebSockets, Tailwind",
        description: "Real-time collaborative coding platform with AI feedback",
      },
    ],
  }

  describe("extractContactEmail", () => {
    it("extracts authentic contact emails from JD text", () => {
      const jd = "Please send your resume to careers@nextjobz.io or jobs@nextjobz.io for fast review."
      expect(extractContactEmail(jd)).toBe("careers@nextjobz.io")
    })

    it("ignores bogus dummy emails like hr@company.com or test@example.com", () => {
      const dummyJd = "Contact hr@company.com or info@example.com for generic questions."
      expect(extractContactEmail(dummyJd)).toBeNull()
    })

    it("returns null when no email address is present in JD", () => {
      const atsJd = "Apply directly via our Greenhouse portal: https://boards.greenhouse.io/nextjobz/jobs/123"
      expect(extractContactEmail(atsJd)).toBeNull()
    })
  })

  describe("sanitizeOutreachPlaceholders", () => {
    it("replaces [Hiring Manager/Recruiter] with authentic company hiring team", () => {
      const raw = "Hi [Hiring Manager/Recruiter], I saw the [Job Title] role at [Company Name]."
      const cleaned = sanitizeOutreachPlaceholders(raw, mockContext)
      expect(cleaned).toContain("Hi nextjobz Hiring Team")
      expect(cleaned).toContain("Full Stack Developer - Next.js role at nextjobz")
      expect(cleaned).not.toContain("[")
      expect(cleaned).not.toContain("]")
    })

    it("replaces [Your Name] and [Portfolio] with candidate's actual credentials", () => {
      const raw = "Best regards,\n[Your Name]\n[Portfolio]\n[GitHub]"
      const cleaned = sanitizeOutreachPlaceholders(raw, mockContext)
      expect(cleaned).toContain("AH Muzahid")
      expect(cleaned).toContain("https://muzahid.dev")
      expect(cleaned).toContain("https://github.com/AH-Muzahid")
      expect(cleaned).not.toContain("[Your Name]")
    })

    it("cleans up unexpected arbitrary brackets without leaking placeholder syntax", () => {
      const raw = "I recently built CodeArena [Insert Project Details] and would love to chat [Optional: time]."
      const cleaned = sanitizeOutreachPlaceholders(raw, mockContext)
      expect(cleaned).not.toContain("[")
      expect(cleaned).not.toContain("]")
    })
  })

  describe("generateDeterministicOutreachBundle", () => {
    it("generates a complete 4-channel bundle tailored to company and role", () => {
      const bundle = generateDeterministicOutreachBundle(mockContext)

      expect(bundle).toHaveProperty("email")
      expect(bundle).toHaveProperty("linkedin_dm")
      expect(bundle).toHaveProperty("linkedin_connect")
      expect(bundle).toHaveProperty("follow_up")

      // 1. Email Channel
      expect(bundle.email.subject).toContain("Full Stack Developer - Next.js - AH Muzahid")
      expect(bundle.email.body).toContain("Dear nextjobz Hiring Team,")
      expect(bundle.email.body).toContain("CodeArena")
      expect(bundle.email.body).toContain("AH Muzahid")
      expect(bundle.email.body).not.toContain("[")
      expect(bundle.email.body).not.toContain("]")

      // 2. LinkedIn InMail / DM Channel
      expect(bundle.linkedin_dm.subject).toContain("Full Stack Developer - Next.js role inquiry - AH Muzahid")
      expect(bundle.linkedin_dm.body).toContain("Hi nextjobz Team,")
      expect(bundle.linkedin_dm.body).toContain("CodeArena")
      expect(bundle.linkedin_dm.body.split(/\s+/).length).toBeLessThan(120)

      // 3. LinkedIn Connection Note Channel (Strict <= 300 characters)
      expect(bundle.linkedin_connect.charCount).toBeLessThanOrEqual(300)
      expect(bundle.linkedin_connect.body.length).toBeLessThanOrEqual(300)
      expect(bundle.linkedin_connect.body).toContain("nextjobz")
      expect(bundle.linkedin_connect.body).toContain("CodeArena")

      // 4. Follow-Up Channel
      expect(bundle.follow_up.subject).toContain("Following up: Full Stack Developer - Next.js application - AH Muzahid")
      expect(bundle.follow_up.body).toContain("Dear nextjobz Hiring Team,")
    })
  })

  describe("Engineering Rule & Zero-Tolerance Visual Audits", () => {
    it("prohibits Sparkles icon in all outreach components", () => {
      const files = [
        "src/lib/applications/outreach-engine.ts",
        "src/components/applications/OutreachAssistantCard.tsx",
        "src/app/api/applications/[id]/outreach/route.ts",
      ]
      for (const relPath of files) {
        const fullPath = path.resolve(process.cwd(), relPath)
        const content = fs.readFileSync(fullPath, "utf-8")
        expect(content).not.toMatch(/Sparkles/i)
      }
    })

    it("prohibits gradient colors in all outreach components", () => {
      const files = [
        "src/lib/applications/outreach-engine.ts",
        "src/components/applications/OutreachAssistantCard.tsx",
        "src/app/api/applications/[id]/outreach/route.ts",
      ]
      for (const relPath of files) {
        const fullPath = path.resolve(process.cwd(), relPath)
        const content = fs.readFileSync(fullPath, "utf-8")
        expect(content).not.toMatch(/bg-gradient/i)
        expect(content).not.toMatch(/from-[a-z]+-\d+\s+to-[a-z]+-\d+/i)
      }
    })

    it("ensures no hardcoded hr@company.com fallback exists in OutreachAssistantCard", () => {
      const cardPath = path.resolve(process.cwd(), "src/components/applications/OutreachAssistantCard.tsx")
      const cardContent = fs.readFileSync(cardPath, "utf-8")
      expect(cardContent).not.toContain('"hr@company.com"')
      expect(cardContent).not.toContain("'hr@company.com'")
    })
  })
})
