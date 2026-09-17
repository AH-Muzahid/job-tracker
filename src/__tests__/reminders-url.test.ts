import { describe, it, expect, vi } from "vitest"

// Mock dependencies for notifications/reminders route
vi.mock("@/lib/auth", () => ({
  getInternalUserId: vi.fn().mockResolvedValue("user-test-123"),
}))

vi.mock("@/lib/prisma", () => ({
  withDbRetry: vi.fn((fn: () => Promise<any>) => fn()),
  prisma: {
    application: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: "app-interview-1",
          companyName: "Google",
          jobTitle: "Senior Staff Engineer",
          status: "Interviewing",
          applicationDate: new Date(),
        },
      ]),
    },
    weeklyGoal: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
  },
}))

import { GET } from "@/app/api/notifications/reminders/route"

describe("Notifications Reminders Action URL Integrity", () => {
  it("generates correct /interview-prep actionUrl with appId, company, and role params", async () => {
    const res = await GET()
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.success).toBe(true)

    const interviewReminder = json.data.reminders.find((r: any) => r.type === "interview")
    expect(interviewReminder).toBeDefined()
    expect(interviewReminder.actionUrl).toBe(
      "/interview-prep?appId=app-interview-1&company=Google&role=Senior%20Staff%20Engineer"
    )
    expect(interviewReminder.actionUrl).not.toContain("/prep?")
  })
})
