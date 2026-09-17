import { describe, it, expect, vi } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/auth", () => ({
  getInternalUserId: vi.fn().mockResolvedValue("user-alice-123"),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    application: {
      findFirst: vi.fn(),
    },
    prepNote: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

import { prisma } from "@/lib/prisma"
import { POST } from "@/app/api/prep-notes/route"
import { PATCH } from "@/app/api/prep-notes/[id]/route"

describe("Prep Notes IDOR Security Defense", () => {
  it("rejects attaching an applicationId belonging to another user on POST", async () => {
    // Alice tries to attach an applicationId belonging to Bob
    vi.mocked(prisma.application.findFirst).mockResolvedValueOnce(null)

    const req = new Request("http://localhost:3000/api/prep-notes", {
      method: "POST",
      body: JSON.stringify({
        title: "Leaked Notes",
        content: "Trying to attach to Bob's job application",
        applicationId: "bobs-application-999",
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toContain("unauthorized")
    expect(prisma.prepNote.create).not.toHaveBeenCalled()
  })

  it("allows attaching an applicationId owned by the authenticated user on POST", async () => {
    vi.mocked(prisma.application.findFirst).mockResolvedValueOnce({ id: "alices-application-111" } as any)
    vi.mocked(prisma.prepNote.create).mockResolvedValueOnce({
      id: "note-1",
      userId: "user-alice-123",
      title: "Valid Note",
      content: "Legitimate study note",
      category: "General",
      applicationId: "alices-application-111",
    } as any)

    const req = new Request("http://localhost:3000/api/prep-notes", {
      method: "POST",
      body: JSON.stringify({
        title: "Valid Note",
        content: "Legitimate study note",
        applicationId: "alices-application-111",
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(201)
    expect(prisma.prepNote.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-alice-123",
          applicationId: "alices-application-111",
        }),
      })
    )
  })

  it("rejects PATCH updating applicationId to an unowned application", async () => {
    vi.mocked(prisma.prepNote.findUnique).mockResolvedValueOnce({
      id: "note-1",
      userId: "user-alice-123",
    } as any)
    vi.mocked(prisma.application.findFirst).mockResolvedValueOnce(null)

    const req = new Request("http://localhost:3000/api/prep-notes/note-1", {
      method: "PATCH",
      body: JSON.stringify({
        applicationId: "unowned-app-777",
      }),
    })

    const res = await PATCH(req, { params: Promise.resolve({ id: "note-1" }) })
    expect(res.status).toBe(403)
    expect(prisma.prepNote.update).not.toHaveBeenCalled()
  })
})
