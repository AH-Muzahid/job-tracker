import { mergeApplicationAssets } from "@/lib/ai/application-assets"
vi.mock("@/lib/ai/application-assets", () => ({ mergeApplicationAssets: vi.fn().mockResolvedValue(undefined) }))
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { buildResumePdfBuffer } from "@/lib/pdf/generator"
import { executeTailorResumeForJob } from "@/lib/ai/graph/tools/resume-tools"
import { prisma } from "@/lib/prisma"
import type { TailoredResumeData } from "@/types/tailored-resume"

describe("Tailored Resume PDF Generation Engine", () => {
  const testUserId = "user-pdf-test-123"

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders a valid ATS vector PDF Buffer from structured resume data", async () => {
    const sampleData: TailoredResumeData = {
      header: {
        fullName: "Alex Doe",
        title: "Senior Full Stack Engineer",
        email: "alex.doe@example.com",
        location: "San Francisco, CA",
        linkedinUrl: "https://linkedin.com/in/alexdoe",
        githubUrl: "https://github.com/alexdoe",
      },
      summary: "Experienced software engineer with strong background in distributed systems and modern web technologies.",
      skillsByDomain: [
        {
          domain: "Languages & Frameworks",
          skills: ["TypeScript", "Go", "React", "Next.js", "Node.js"],
        },
        {
          domain: "Databases & Cloud",
          skills: ["PostgreSQL", "Redis", "Docker", "AWS", "Kubernetes"],
        },
      ],
      experience: [
        {
          role: "Senior Software Engineer",
          company: "Acme Corp",
          duration: "2021 - Present",
          location: "Remote",
          bullets: [
            "Architected high-throughput message processing pipeline handling 50k events/second.",
            "Optimized core database queries reducing p99 latency from 450ms to 110ms.",
          ],
        },
      ],
      projects: [
        {
          name: "CareerTrack AI",
          stack: ["Next.js", "TypeScript", "LangGraph", "PostgreSQL"],
          bullets: [
            "Engineered autonomous multi-agent job application orchestrator with sub-second response times.",
          ],
        },
      ],
      education: [
        {
          degree: "B.S. in Computer Science",
          institution: "University of California, Berkeley",
          year: "2020",
        },
      ],
    }

    const pdfBuffer = await buildResumePdfBuffer(sampleData)
    expect(pdfBuffer).toBeInstanceOf(Buffer)
    expect(pdfBuffer.length).toBeGreaterThan(500)

    // PDF headers start with %PDF
    const pdfHeader = pdfBuffer.toString("utf8", 0, 4)
    expect(pdfHeader).toBe("%PDF")
  })

  it("saves candidate-provided resume facts to an owned Application package", async () => {
    vi.spyOn((prisma as any).resume, "findFirst").mockResolvedValueOnce({
      id: "res-base-1",
      userId: testUserId,
      title: "Base Engineering Resume",
      textContent: "Senior Engineer proficient in Go, React, PostgreSQL, Docker.",
      isDefault: true,
    })

    vi.spyOn((prisma as any).userProfile, "findUnique").mockResolvedValueOnce({
      userId: testUserId,
      strengths: "Go, React, PostgreSQL",
      targetRoles: ["Senior Backend Engineer"],
      location: "Remote",
    })

    vi.spyOn((prisma as any).user, "findUnique").mockResolvedValueOnce({
      name: "Jane Smith",
      email: "jane@example.com",
    })

    vi.spyOn((prisma as any).application, "findFirst").mockResolvedValueOnce({ id: "app-stripe", userId: testUserId, companyName: "Stripe", jobTitle: "Senior Backend Engineer" })
    vi.spyOn((prisma as any).applicationAnalysis, "findUnique").mockResolvedValueOnce(null)
    vi.spyOn((prisma as any).applicationAnalysis, "upsert").mockResolvedValueOnce({
      applicationId: "app-stripe",
      id: "res-tailored-99",
      userId: testUserId,
      title: "Tailored - Senior Backend Engineer at Stripe",
      fileName: "stripe-tailored-resume.pdf",
      textContent: "{}",
    })

    const result = await executeTailorResumeForJob(testUserId, {
      applicationId: "app-stripe",
      companyName: "Stripe",
      jobTitle: "Senior Backend Engineer",
      jobDescription: "We are looking for a Senior Backend Engineer proficient in Go, Redis, and PostgreSQL to scale distributed payments.",
    })

    expect(result.success).toBe(true)
    if (!result.success || !("data" in result)) throw new Error("Expected owned resume package")
    expect(result.downloadUrl).toBe("/applications/app-stripe")
    expect(result.data.experience).toEqual([])
    expect(result.data.education).toEqual([])
    expect(result.data.skillsByDomain.flatMap((d) => d.skills)).not.toContain("redis")
    expect(mergeApplicationAssets).toHaveBeenCalledWith(testUserId, "app-stripe", expect.objectContaining({ resumeData: expect.any(Object) }))

  })
})
