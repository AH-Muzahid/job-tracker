import { describe, it, expect, vi, beforeEach } from "vitest"
import { GET as getResumes, POST as postResume } from "@/app/api/resumes/route"
import { POST as extractFromResume } from "@/app/api/user/profile/extract-from-resume/route"
import { POST as parseJdFile } from "@/app/api/ai/parse-jd-file/route"
import { NextRequest } from "next/server"

vi.mock("@/lib/auth", () => ({
  getInternalUserId: vi.fn().mockResolvedValue("user-test-123"),
}))

vi.mock("@/lib/prisma", () => {
  const mockResumes = [
    {
      id: "res-1",
      userId: "user-test-123",
      title: "My Resume",
      fileName: "resume.pdf",
      fileUrl: "/storage/resumes/test.pdf",
      fileSize: 1024,
      isDefault: true,
      textContent: "Software Engineer with TypeScript and React experience.",
      createdAt: new Date(),
    },
  ]

  return {
    prisma: {
      resume: {
        findMany: vi.fn().mockImplementation(() => Promise.resolve(mockResumes)),
        findFirst: vi.fn().mockImplementation(() => Promise.resolve(mockResumes[0])),
        create: vi.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: "res-new", ...data })),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      userProfile: {
        findUnique: vi.fn().mockResolvedValue({ userId: "user-test-123", targetRoles: [] }),
      },
    },
    withDbRetry: vi.fn().mockImplementation((fn: any) => fn()),
  }
})

vi.mock("@/lib/redis", () => ({
  invalidateCache: vi.fn().mockResolvedValue(undefined),
  getCachedJson: vi.fn().mockResolvedValue(null),
  setCachedJson: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/ai/knowledge-graph", () => ({
  buildCareerGraphFromText: vi.fn().mockReturnValue({ nodes: [], edges: [] }),
  saveKnowledgeGraph: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/ai/resilience", () => ({
  resilientGenerateText: vi.fn().mockResolvedValue({
    text: JSON.stringify({
      phone: "+1234567890",
      location: "San Francisco, CA",
      linkedInUrl: "https://linkedin.com/in/test",
      githubUrl: "https://github.com/test",
      portfolioUrl: "https://test.dev",
      targetRoles: ["Software Engineer"],
      experienceLevel: "Senior",
      strengths: "TypeScript, React, Node.js",
      preferredIndustries: "SaaS",
      bestProjects: [{ name: "Project A", stack: "React", description: "Awesome app" }],
    }),
  }),
}))

vi.mock("@/lib/rate-limit", () => ({
  checkDistributedRateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}))

vi.mock("fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs/promises")>()
  return {
    ...actual,
    default: {
      ...actual,
      mkdir: vi.fn().mockResolvedValue(undefined),
      writeFile: vi.fn().mockResolvedValue(undefined),
      readFile: vi.fn().mockResolvedValue(Buffer.from("mock file content")),
    },
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockResolvedValue(Buffer.from("mock file content")),
  }
})

describe("Resume Upload & Parsing Architecture", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("GET /api/resumes returns user resumes with JSON content-type", async () => {
    const res = await getResumes()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(Array.isArray(json)).toBe(true)
    expect(json[0].title).toBe("My Resume")
  })

  it("returns 401 Unauthorized for unauthenticated requests across all resume endpoints", async () => {
    const { getInternalUserId } = await import("@/lib/auth")
    vi.mocked(getInternalUserId).mockResolvedValueOnce(null)
    const getRes = await getResumes()
    expect(getRes.status).toBe(401)
    expect(await getRes.json()).toEqual({ error: "Unauthorized" })

    vi.mocked(getInternalUserId).mockResolvedValueOnce(null)
    const postRes = await postResume(new Request("http://localhost/api/resumes", { method: "POST" }))
    expect(postRes.status).toBe(401)
    expect(await postRes.json()).toEqual({ error: "Unauthorized" })

    vi.mocked(getInternalUserId).mockResolvedValueOnce(null)
    const extractRes = await extractFromResume(new NextRequest("http://localhost/api/user/profile/extract-from-resume", { method: "POST" }))
    expect(extractRes.status).toBe(401)
    expect(await extractRes.json()).toEqual({ error: "Unauthorized" })

    vi.mocked(getInternalUserId).mockResolvedValueOnce(null)
    const jdRes = await parseJdFile(new Request("http://localhost/api/ai/parse-jd-file", { method: "POST" }))
    expect(jdRes.status).toBe(401)
    expect(await jdRes.json()).toEqual({ error: "Unauthorized" })
  })

  it("POST /api/resumes rejects requests missing title or file", async () => {
    const mockFormData = new Map<string, any>([["title", "Only Title"]])

    const req = {
      headers: {
        get: (h: string) => (h === "content-type" ? "multipart/form-data" : null),
      },
      formData: () => Promise.resolve({
        get: (key: string) => mockFormData.get(key) || null,
      }),
    } as unknown as Request

    const res = await postResume(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe("Title and file are required")
  })

  it("POST /api/resumes processes text/markdown files reliably", async () => {
    const mockFile = {
      name: "resume.md",
      size: 50,
      type: "text/markdown",
      arrayBuffer: () => Promise.resolve(Buffer.from("# Experience\nSenior Full Stack Developer at Acme")),
    }
    const mockFormData = new Map<string, any>([
      ["file", mockFile],
      ["title", "Markdown Resume"],
      ["isDefault", "true"],
    ])

    const req = {
      headers: {
        get: (h: string) => (h === "content-type" ? "multipart/form-data" : null),
      },
      formData: () => Promise.resolve({
        get: (key: string) => mockFormData.get(key) || null,
      }),
    } as unknown as Request

    const res = await postResume(req)
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.title).toBe("Markdown Resume")
    expect(json.textContent).toContain("Senior Full Stack Developer")
  })

  it("POST /api/user/profile/extract-from-resume extracts profile data from text file", async () => {
    const mockFile = {
      name: "resume.txt",
      size: 100,
      type: "text/plain",
      arrayBuffer: () =>
        Promise.resolve(
          Buffer.from(
            "Name: Jane Doe\nPhone: +1234567890\nLinkedIn: https://linkedin.com/in/test\nSkills: React, TypeScript"
          )
        ),
    }
    const mockFormData = new Map<string, any>([["file", mockFile]])

    const req = {
      headers: {
        get: (h: string) => (h === "content-type" ? "multipart/form-data" : null),
      },
      formData: () => Promise.resolve({
        get: (key: string) => mockFormData.get(key) || null,
      }),
    } as unknown as NextRequest

    const res = await extractFromResume(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.extracted.phone).toBe("+1234567890")
    expect(json.extracted.targetRoles).toContain("Software Engineer")
  })

  it("POST /api/ai/parse-jd-file extracts text from uploaded file", async () => {
    const mockFile = {
      name: "jd.txt",
      size: 60,
      type: "text/plain",
      arrayBuffer: () =>
        Promise.resolve(Buffer.from("Job Description: Senior Backend Engineer with Go and PostgreSQL")),
    }
    const mockFormData = new Map<string, any>([["file", mockFile]])

    const req = {
      headers: {
        get: (h: string) => (h === "content-type" ? "multipart/form-data" : null),
      },
      formData: () => Promise.resolve({
        get: (key: string) => mockFormData.get(key) || null,
      }),
    } as unknown as Request

    const res = await parseJdFile(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.text).toContain("Senior Backend Engineer")
    expect(json.fileName).toBe("jd.txt")
  })

  it("POST /api/resumes parses real PDF buffer and extracts text into textContent", async () => {
    const fs = await import("fs")
    const pdfBuf = fs.readFileSync("public/uploads/resumes/7ac5eb58-6f56-44aa-8424-038d92acf075.pdf")
    const mockFile = {
      name: "Muzahid_Resume.pdf",
      size: pdfBuf.length,
      type: "application/pdf",
      arrayBuffer: () => Promise.resolve(pdfBuf),
    }
    const mockFormData = new Map<string, any>([
      ["file", mockFile],
      ["title", "Muzahid Resume"],
      ["isDefault", "true"],
    ])

    const req = {
      headers: {
        get: (h: string) => (h === "content-type" ? "multipart/form-data" : null),
      },
      formData: () => Promise.resolve({
        get: (key: string) => mockFormData.get(key) || null,
      }),
    } as unknown as Request

    const res = await postResume(req)
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.title).toBe("Muzahid Resume")
    expect(json.textContent).toBeTruthy()
    expect(json.textContent.length).toBeGreaterThan(50)
  })

  it("POST /api/user/profile/extract-from-resume parses real PDF buffer and extracts fields", async () => {
    const fs = await import("fs")
    const pdfBuf = fs.readFileSync("public/uploads/resumes/7ac5eb58-6f56-44aa-8424-038d92acf075.pdf")
    const mockFile = {
      name: "Muzahid_Resume.pdf",
      size: pdfBuf.length,
      type: "application/pdf",
      arrayBuffer: () => Promise.resolve(pdfBuf),
    }
    const mockFormData = new Map<string, any>([["file", mockFile]])

    const req = {
      headers: {
        get: (h: string) => (h === "content-type" ? "multipart/form-data" : null),
      },
      formData: () => Promise.resolve({
        get: (key: string) => mockFormData.get(key) || null,
      }),
    } as unknown as NextRequest

    const res = await extractFromResume(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.extracted).toBeDefined()
    expect(json.extracted.targetRoles).toContain("Software Engineer")
  })
})
