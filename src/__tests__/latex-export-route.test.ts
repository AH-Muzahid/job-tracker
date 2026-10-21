import { describe, it, expect, vi, beforeEach } from "vitest"
import { POST } from "@/app/api/resumes/export/latex/route"
import { NextRequest } from "next/server"

vi.mock("@/lib/auth", () => ({
  getInternalUserId: vi.fn(),
}))

import { getInternalUserId } from "@/lib/auth"

describe("POST /api/resumes/export/latex", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 if user is unauthorized", async () => {
    vi.mocked(getInternalUserId).mockResolvedValue(null)

    const req = new NextRequest("http://localhost:3000/api/resumes/export/latex", {
      method: "POST",
      body: JSON.stringify({}),
    })

    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it("returns 400 if payload is invalid resume data", async () => {
    vi.mocked(getInternalUserId).mockResolvedValue("user-123")

    const req = new NextRequest("http://localhost:3000/api/resumes/export/latex", {
      method: "POST",
      body: JSON.stringify({ invalid: true }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("exports valid .tex file with correct attachment headers", async () => {
    vi.mocked(getInternalUserId).mockResolvedValue("user-123")

    const validResume = {
      header: {
        fullName: "Md. Ali Hasan Muzahid",
        title: "Full Stack Developer",
        email: "ahmuzahid40@gmail.com",
      },
      summary: "Full Stack Engineer",
      skillsByDomain: [
        {
          domain: "Languages",
          skills: ["TypeScript", "JavaScript"],
        },
      ],
      projects: [],
      experience: [],
      education: [],
    }

    const req = new NextRequest("http://localhost:3000/api/resumes/export/latex", {
      method: "POST",
      body: JSON.stringify(validResume),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toContain("text/x-tex")
    expect(res.headers.get("content-disposition")).toContain(".tex")

    const text = await res.text()
    expect(text).toContain("\\documentclass")
    expect(text).toContain("Md. Ali Hasan Muzahid")
  })
})
