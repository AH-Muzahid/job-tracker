import { describe, it, expect } from "vitest"
import {
  extractContactEmail,
  sanitizeOutreachPlaceholders,
  generateDeterministicOutreachBundle,
  detectApplicationStrategy,
  generateDeterministicScreenerAnswers,
  pruneRelevantStack,
  cleanJobTitle,
  synthesizeTitleFromHashtags,
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
      expect(bundle.email!.subject).toContain("Full Stack Developer - Next.js - AH Muzahid")
      expect(bundle.email!.body).toContain("Dear nextjobz Hiring Team,")
      expect(bundle.email!.body).toContain("CodeArena")
      expect(bundle.email!.body).toContain("AH Muzahid")
      expect(bundle.email!.body).not.toContain("[")
      expect(bundle.email!.body).not.toContain("]")

      // 2. LinkedIn InMail / DM Channel
      expect(bundle.linkedin_dm!.subject).toContain("Full Stack Developer - Next.js role inquiry - AH Muzahid")
      expect(bundle.linkedin_dm!.body).toContain("Hi nextjobz Team,")
      expect(bundle.linkedin_dm!.body).toContain("CodeArena")
      expect(bundle.linkedin_dm!.body.split(/\s+/).length).toBeLessThan(120)

      // 3. LinkedIn Connection Note Channel (Strict <= 300 characters)
      expect(bundle.linkedin_connect!.charCount).toBeLessThanOrEqual(300)
      expect(bundle.linkedin_connect!.body.length).toBeLessThanOrEqual(300)
      expect(bundle.linkedin_connect!.body).toContain("nextjobz")
      expect(bundle.linkedin_connect!.body).toContain("CodeArena")

      // 4. Follow-Up Channel
      expect(bundle.follow_up!.subject).toContain("Following up: Full Stack Developer - Next.js application - AH Muzahid")
      expect(bundle.follow_up!.body).toContain("Dear nextjobz Hiring Team,")
    })

    it("enforces strict under-120-word limit and anti-boilerplate opening in email", () => {
      const bundle = generateDeterministicOutreachBundle(mockContext)
      const wordCount = bundle.email!.body.split(/\s+/).length
      expect(wordCount).toBeLessThan(120)
      // Must not contain cliché corporate openings
      expect(bundle.email!.body).not.toContain("I am writing to express my strong interest")
      expect(bundle.email!.body).not.toContain("I hope this email finds you well")
      // Must contain high-converting elements
      expect(bundle.email!.body).toContain("10-minute intro chat")
      expect(bundle.email!.body).toContain("latency")
    })
  })

  describe("detectApplicationStrategy", () => {
    it("detects email strategy when direct email instructions exist", () => {
      const jd = "Send your resume and portfolio directly to engineering-lead@startup.com for fast-track interview."
      const result = detectApplicationStrategy(jd, "Career Site", "https://startup.com/jobs/1")
      expect(result.strategy).toBe("email")
      expect(result.detectedEmail).toBe("engineering-lead@startup.com")
    })

    it("detects form_portal strategy when ATS link like greenhouse or lever is used", () => {
      const jd = "Please submit your application online through our jobs portal."
      const result = detectApplicationStrategy(jd, "Indeed", "https://boards.greenhouse.io/acmecorp/jobs/56789")
      expect(result.strategy).toBe("form_portal")
      expect(result.reason).toContain("ATS application portal detected")
    })

    it("detects linkedin_dm strategy when LinkedIn DM or recruiter reach-out is prompted", () => {
      const jd = "We are hiring! Reach out directly on LinkedIn or message me with your portfolio."
      const result = detectApplicationStrategy(jd, "LinkedIn", null)
      expect(result.strategy).toBe("linkedin_dm")
    })
  })

  describe("generateDeterministicScreenerAnswers & form_portal bundle", () => {
    it("generates targeted screener answers and form_portal in outreach bundle", () => {
      const bundle = generateDeterministicOutreachBundle(mockContext)
      expect(bundle.form_portal).toBeDefined()
      expect(bundle.form_portal?.portalNote).toContain("nextjobz")
      expect(bundle.form_portal?.portalNote).toContain("CodeArena")
      expect(bundle.form_portal?.screenerAnswers.length).toBeGreaterThanOrEqual(3)

      const screenerQAs = generateDeterministicScreenerAnswers(mockContext, "frontend")
      expect(screenerQAs.length).toBe(3)
      expect(screenerQAs[0].question).toContain("nextjobz")
      expect(screenerQAs[1].answer).toContain("CodeArena")
      expect(screenerQAs[0].answer).not.toContain("[")
      expect(screenerQAs[0].answer).not.toContain("]")
    })
  })

  describe("pruneRelevantStack Anti-Buzzword Engine", () => {
    it("prunes a 14-tool buzzword list down to at most 3-4 top relevant tools", () => {
      const bloatedStack =
        "React, Next.js, TypeScript, JavaScript, Node.js, MongoDB, TailwindCSS, Docker, Firebase, Zustand, Express.js, CI/CD, WebSocket, AI"
      const pruned = pruneRelevantStack(bloatedStack, "Full Stack Developer - Next.js", 3)
      
      // Should not contain JavaScript when TypeScript is present
      expect(pruned).not.toContain("JavaScript")
      // Should prioritize Next.js for a Next.js role
      expect(pruned).toContain("Next.js")
      // Should not chain 5+ tools
      const toolCount = pruned.split(/,| and /).filter(Boolean).length
      expect(toolCount).toBeLessThanOrEqual(3)
    })

    it("falls back to modern clean stack when input stack is empty", () => {
      const fallback = pruneRelevantStack("", "Frontend Developer")
      expect(fallback).toContain("TypeScript")
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

  describe("cleanJobTitle & Social Hashtag Eradication Engine", () => {
    it("converts raw social media hashtag soup cleanly into 'Junior Full Stack Developer'", () => {
      const rawHashtags =
        "#hiring #wearehiring #juniordeveloper #fullstackdeveloper #mernstack #nextjs #supabase #reactjs #webdevelopment #remotejob #remotedeveloper #softwaredeveloper #codebasesolutions #techjobs…"
      const cleaned = cleanJobTitle(rawHashtags)
      expect(cleaned).toBe("Junior Full Stack Developer")
    })

    it("strips emojis, recruiter prefixes, and parenthetical noise from dirty job titles", () => {
      const dirty = "🚨 We are hiring: Full Stack Developer (React / Node.js) [Immediate Joiner] 🚀"
      const cleaned = cleanJobTitle(dirty)
      expect(cleaned).toBe("Full Stack Developer (React / Node.js)")
    })

    it("preserves legitimate titles when trailing hashtags exist", () => {
      const mixed = "Junior React Developer #hiring #remote"
      const cleaned = cleanJobTitle(mixed)
      expect(cleaned).toBe("Junior React Developer")
    })

    it("strips trailing location/work-mode delimiter noise", () => {
      const trailing = "Frontend Engineer - Remote (US/EU)"
      const cleaned = cleanJobTitle(trailing)
      expect(cleaned).toBe("Frontend Engineer")
    })

    it("converts all-caps title into standardized title casing", () => {
      const allCaps = "JUNIOR FULL STACK DEVELOPER"
      const cleaned = cleanJobTitle(allCaps)
      expect(cleaned).toBe("Junior Full Stack Developer")
    })

    it("falls back to Software Engineer on empty input", () => {
      expect(cleanJobTitle("")).toBe("Software Engineer")
    })

    it("synthesizes clean titles from frontend and intern hashtags", () => {
      expect(synthesizeTitleFromHashtags("#hiring #internship #pythondeveloper")).toBe("Intern Backend Developer")
      expect(synthesizeTitleFromHashtags("#hiring #frontenddeveloper #reactjs")).toBe("Frontend Developer")
    })

    it("guarantees zero hashtags leak into deterministic outreach bundle when jobTitle is hashtag soup", () => {
      const hashtagContext: OutreachContext = {
        ...mockContext,
        companyName: "Recruit 360",
        jobTitle:
          "#hiring #wearehiring #juniordeveloper #fullstackdeveloper #mernstack #nextjs #supabase #reactjs #webdevelopment #remotejob #remotedeveloper #softwaredeveloper #codebasesolutions #techjobs…",
      }

      const bundle = generateDeterministicOutreachBundle(hashtagContext)

      // Email subject must contain clean title, not hashtags
      expect(bundle.email!.subject).toBe("Application for Junior Full Stack Developer - AH Muzahid")
      expect(bundle.email!.body).toContain("looking for a Junior Full Stack Developer")
      expect(bundle.email!.body).not.toMatch(/#\w+/)

      // LinkedIn InMail
      expect(bundle.linkedin_dm!.subject).toBe("Junior Full Stack Developer role inquiry - AH Muzahid")
      expect(bundle.linkedin_dm!.body).not.toMatch(/#\w+/)

      // LinkedIn Connect
      expect(bundle.linkedin_connect!.body).toContain("Junior Full Stack Developer")
      expect(bundle.linkedin_connect!.body).not.toMatch(/#\w+/)

      // Follow-up
      expect(bundle.follow_up!.subject).toBe("Following up: Junior Full Stack Developer application - AH Muzahid")
      expect(bundle.follow_up!.body).not.toMatch(/#\w+/)

      // Form Portal
      expect(bundle.form_portal?.portalNote).toContain("Junior Full Stack Developer")
      expect(bundle.form_portal?.portalNote).not.toMatch(/#\w+/)
      expect(bundle.form_portal?.screenerAnswers[0].question).toBe(
        "Why are you interested in joining Recruit 360 as a Junior Full Stack Developer?"
      )
    })
  })

  describe("Selective Single-Channel Staging (Zero-Token Waste)", () => {
    it("generates ONLY form_portal when targetChannel is form_portal", () => {
      const bundle = generateDeterministicOutreachBundle(mockContext, "form_portal")

      expect(bundle.form_portal).toBeDefined()
      expect(bundle.form_portal?.portalNote).toContain("nextjobz")
      expect(bundle.form_portal?.portalNote).toContain("CodeArena")

      // Crucial: other channels must NOT be generated to prevent token waste
      expect(bundle.email).toBeUndefined()
      expect(bundle.linkedin_dm).toBeUndefined()
      expect(bundle.linkedin_connect).toBeUndefined()
      expect(bundle.follow_up).toBeUndefined()
    })

    it("generates ONLY direct email when targetChannel is email", () => {
      const bundle = generateDeterministicOutreachBundle(mockContext, "email")

      expect(bundle.email).toBeDefined()
      expect(bundle.email?.subject).toContain("Full Stack Developer - Next.js - AH Muzahid")
      expect(bundle.email?.body).toContain("Dear nextjobz Hiring Team")

      // Other channels remain ungenerated
      expect(bundle.linkedin_dm).toBeUndefined()
      expect(bundle.linkedin_connect).toBeUndefined()
      expect(bundle.follow_up).toBeUndefined()
      expect(bundle.form_portal).toBeUndefined()
    })

    it("generates ONLY linkedin_dm when targetChannel is linkedin_dm", () => {
      const bundle = generateDeterministicOutreachBundle(mockContext, "linkedin_dm")

      expect(bundle.linkedin_dm).toBeDefined()
      expect(bundle.linkedin_dm?.subject).toContain("Full Stack Developer - Next.js role inquiry - AH Muzahid")
      expect(bundle.linkedin_dm?.body).toContain("Hi nextjobz Team")

      expect(bundle.email).toBeUndefined()
      expect(bundle.linkedin_connect).toBeUndefined()
      expect(bundle.follow_up).toBeUndefined()
      expect(bundle.form_portal).toBeUndefined()
    })

    it("generates ONLY linkedin_connect when targetChannel is linkedin_connect", () => {
      const bundle = generateDeterministicOutreachBundle(mockContext, "linkedin_connect")

      expect(bundle.linkedin_connect).toBeDefined()
      expect(bundle.linkedin_connect?.charCount).toBeLessThanOrEqual(300)
      expect(bundle.linkedin_connect?.body).toContain("nextjobz")

      expect(bundle.email).toBeUndefined()
      expect(bundle.linkedin_dm).toBeUndefined()
      expect(bundle.follow_up).toBeUndefined()
      expect(bundle.form_portal).toBeUndefined()
    })

    it("generates ONLY follow_up when targetChannel is follow_up", () => {
      const bundle = generateDeterministicOutreachBundle(mockContext, "follow_up")

      expect(bundle.follow_up).toBeDefined()
      expect(bundle.follow_up?.subject).toContain("Following up: Full Stack Developer - Next.js application - AH Muzahid")

      expect(bundle.email).toBeUndefined()
      expect(bundle.linkedin_dm).toBeUndefined()
      expect(bundle.linkedin_connect).toBeUndefined()
      expect(bundle.form_portal).toBeUndefined()
    })
  })

  describe("On-Demand Custom Application Form Q&A Engine", () => {
    it("generates tailored answers for custom user-pasted form questions", () => {
      const customQuestions = [
        "What is your experience building real-time applications with WebSockets?",
        "How do you handle state consistency across client and server in Next.js?",
        "Are you authorized to work in the US or available for remote PST overlap?",
      ]

      const qas = generateDeterministicScreenerAnswers(mockContext, customQuestions)

      expect(qas.length).toBe(3)
      expect(qas[0].question).toBe(customQuestions[0])
      expect(qas[0].answer).toContain("CodeArena")
      expect(qas[0].answer).toContain("WebSockets")
      expect(qas[0].answer).not.toContain("[")
      expect(qas[0].answer).not.toContain("]")

      expect(qas[1].question).toBe(customQuestions[1])
      expect(qas[1].answer).toContain("Next.js")
      expect(qas[1].answer).not.toContain("[")

      expect(qas[2].question).toBe(customQuestions[2])
      expect(qas[2].answer.length).toBeGreaterThan(20)
    })

    it("embeds custom screening answers inside form_portal when provided to bundle", () => {
      const customQuestions = [
        "Why do you want to join nextjobz?",
        "Tell us about a technical architecture decision you made in CodeArena.",
      ]

      const bundle = generateDeterministicOutreachBundle(
        mockContext,
        "form_portal",
        customQuestions
      )

      expect(bundle.form_portal).toBeDefined()
      expect(bundle.form_portal?.screenerAnswers.length).toBe(2)
      expect(bundle.form_portal?.screenerAnswers[0].question).toBe(customQuestions[0])
      expect(bundle.form_portal?.screenerAnswers[1].question).toBe(customQuestions[1])
      expect(bundle.form_portal?.screenerAnswers[1].answer).toContain("CodeArena")
    })
  })
})

