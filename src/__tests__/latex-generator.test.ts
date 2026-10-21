import { describe, it, expect } from "vitest"
import { escapeLatex, generateLatexResume } from "@/lib/pdf/latex-generator"
import type { TailoredResumeData } from "@/types/tailored-resume"

describe("latex-generator", () => {
  describe("escapeLatex", () => {
    it("escapes special LaTeX characters like &, %, $, #, _, {, }", () => {
      const raw = "React & Next.js: 75% faster, saved $100 for #1 team with user_id {test}"
      const escaped = escapeLatex(raw)

      expect(escaped).toContain("\\&")
      expect(escaped).toContain("\\%")
      expect(escaped).toContain("\\$")
      expect(escaped).toContain("\\#")
      expect(escaped).toContain("\\_")
      expect(escaped).toContain("\\{")
      expect(escaped).toContain("\\}")
    })

    it("converts markdown bold **text** to \\textbf{text}", () => {
      const raw = "Architected a **LangGraph.js StateGraph** system across **5 specialized nodes**"
      const escaped = escapeLatex(raw)

      expect(escaped).toContain("\\textbf{LangGraph.js StateGraph}")
      expect(escaped).toContain("\\textbf{5 specialized nodes}")
      expect(escaped).not.toContain("**")
    })

    it("converts arrows -> or → into $\\rightarrow$", () => {
      const raw = "Planner -> Executor -> Reflector → Responder"
      const escaped = escapeLatex(raw)

      expect(escaped).toContain("Planner $\\rightarrow$ Executor $\\rightarrow$ Reflector $\\rightarrow$ Responder")
    })

    it("handles null and empty input gracefully", () => {
      expect(escapeLatex("")).toBe("")
      expect(escapeLatex(null as any)).toBe("")
      expect(escapeLatex(undefined as any)).toBe("")
    })
  })

  describe("generateLatexResume", () => {
    const mockResume: TailoredResumeData = {
      header: {
        fullName: "Md. Ali Hasan Muzahid",
        title: "Full Stack Developer",
        email: "ahmuzahid40@gmail.com",
        phone: "+880 1312009084",
        linkedinUrl: "https://linkedin.com/in/ali-hasan-muzahid",
        githubUrl: "https://github.com/AH-Muzahid",
        portfolioUrl: "https://ahmuzahid.me",
      },
      summary: "Experienced Full Stack Engineer passionate about autonomous agents.",
      skillsByDomain: [
        {
          domain: "Languages",
          skills: ["TypeScript", "JavaScript", "SQL", "HTML/CSS"],
        },
        {
          domain: "Frontend",
          skills: ["React 19", "Next.js 15 (App Router, RSC)", "Tailwind CSS v4"],
        },
      ],
      projects: [
        {
          name: "CareerTrack",
          stack: ["Next.js 15", "TypeScript", "PostgreSQL", "LangGraph.js"],
          bullets: [
            "Architected a stateful AI agent via **LangGraph.js StateGraph** across **5 specialized nodes**.",
            "Engineered headless background pipelines via **Inngest** with bounded concurrency.",
          ],
          link: "https://career-track-nine.vercel.app/",
        },
      ],
      experience: [
        {
          role: "Full Stack Developer",
          company: "Tech Corp",
          location: "Remote",
          duration: "2024 -- Present",
          bullets: ["Built real-time features using WebSockets and Redis."],
        },
      ],
      education: [
        {
          degree: "Bachelor of Urban and Regional Planning (BURP)",
          institution: "Rajshahi University of Engineering & Technology (RUET)",
          year: "2023 -- Present",
        },
      ],
    }

    it("generates a complete, compilable LaTeX document with all sections", () => {
      const tex = generateLatexResume(mockResume)

      // Document structure
      expect(tex).toContain("\\documentclass[letterpaper,10pt]{article}")
      expect(tex).toContain("\\begin{document}")
      expect(tex).toContain("\\end{document}")

      // Header
      expect(tex).toContain("Md. Ali Hasan Muzahid")
      expect(tex).toContain("Full Stack Developer")
      expect(tex).toContain("ahmuzahid40@gmail.com")
      expect(tex).toContain("linkedin.com/in/ali-hasan-muzahid")
      expect(tex).toContain("github.com/AH-Muzahid")
      expect(tex).toContain("ahmuzahid.me")

      // Skills
      expect(tex).toContain("\\section{Technical Skills}")
      expect(tex).toContain("\\textbf{Languages:}")
      expect(tex).toContain("TypeScript, JavaScript, SQL, HTML/CSS")

      // Projects
      expect(tex).toContain("\\section{Projects}")
      expect(tex).toContain("https://career-track-nine.vercel.app/")
      expect(tex).toContain("\\textbf{CareerTrack}")
      expect(tex).toContain("\\textbf{5 specialized nodes}")

      // Experience & Education
      expect(tex).toContain("\\section{Experience}")
      expect(tex).toContain("Tech Corp")
      expect(tex).toContain("\\section{Education}")
      expect(tex).toContain("Rajshahi University of Engineering \\& Technology (RUET)")
    })

    it("omits empty sections cleanly", () => {
      const minimalResume: TailoredResumeData = {
        header: {
          fullName: "Minimal Candidate",
          title: "Engineer",
          email: "test@example.com",
        },
        summary: "",
        skillsByDomain: [],
        projects: [],
        experience: [],
        education: [],
      }

      const tex = generateLatexResume(minimalResume)
      expect(tex).not.toContain("\\section{Technical Skills}")
      expect(tex).not.toContain("\\section{Projects}")
      expect(tex).not.toContain("\\section{Experience}")
      expect(tex).not.toContain("\\section{Education}")
      expect(tex).toContain("Minimal Candidate")
    })
  })
})
