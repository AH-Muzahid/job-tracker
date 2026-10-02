import { describe, it, expect, vi, beforeEach } from "vitest"
import { POST as postSalaryUploadRoute } from "@/app/api/salary/upload/route"
import { prisma } from "@/lib/prisma"
import { getInternalUserId } from "@/lib/auth"

vi.mock("@/lib/auth", () => ({
  getInternalUserId: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    salaryBenchmark: {
      createMany: vi.fn(),
    },
  },
  withDbRetry: vi.fn((fn: any) => fn()),
}))

describe("POST /api/salary/upload API Route", () => {
  const mockUserId = "user-123"

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 when user is not authenticated", async () => {
    vi.mocked(getInternalUserId).mockResolvedValueOnce(null)
    const req = new Request("http://localhost:3000/api/salary/upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ records: [] }),
    })
    const res = await postSalaryUploadRoute(req)
    expect(res.status).toBe(401)
  })

  it("returns 400 when uploaded records list is empty", async () => {
    vi.mocked(getInternalUserId).mockResolvedValueOnce(mockUserId)
    const req = new Request("http://localhost:3000/api/salary/upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ records: [] }),
    })
    const res = await postSalaryUploadRoute(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain("No valid salary benchmark records found")
  })

  it("imports JSON records and calculates salaryMedian when omitted", async () => {
    vi.mocked(getInternalUserId).mockResolvedValueOnce(mockUserId)
    vi.mocked(prisma.salaryBenchmark.createMany).mockResolvedValueOnce({ count: 2 })

    const records = [
      {
        company: "Stripe",
        role: "Software Engineer",
        salaryMin: 140000,
        salaryMax: 180000,
        currency: "USD",
      },
      {
        company: "Linear",
        role: "Frontend Engineer",
        salaryMedian: 165000,
        currency: "USD",
      },
    ]

    const req = new Request("http://localhost:3000/api/salary/upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ records }),
    })

    const res = await postSalaryUploadRoute(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.count).toBe(2)

    expect(prisma.salaryBenchmark.createMany).toHaveBeenCalledWith({
      data: [
        {
          company: "Stripe",
          role: "Software Engineer",
          location: null,
          salaryMin: 140000,
          salaryMax: 180000,
          salaryMedian: 160000, // (140k + 180k) / 2
          currency: "USD",
          source: "User BYO Upload",
          confidence: 1.0,
        },
        {
          company: "Linear",
          role: "Frontend Engineer",
          location: null,
          salaryMin: null,
          salaryMax: null,
          salaryMedian: 165000,
          currency: "USD",
          source: "User BYO Upload",
          confidence: 1.0,
        },
      ],
    })
  })

  it("imports CSV file upload via multipart/form-data", async () => {
    vi.mocked(getInternalUserId).mockResolvedValueOnce(mockUserId)
    vi.mocked(prisma.salaryBenchmark.createMany).mockResolvedValueOnce({ count: 1 })

    const csvContent = "company,role,location,min,max,currency\nGoogle,Senior SWE,Remote,180000,240000,USD"
    const req = {
      headers: {
        get: (header: string) => (header === "content-type" ? "multipart/form-data" : null),
      },
      formData: async () => ({
        get: (key: string) =>
          key === "file"
            ? {
                name: "salaries.csv",
                size: csvContent.length,
                text: async () => csvContent,
                arrayBuffer: async () => Buffer.from(csvContent),
              }
            : null,
      }),
    } as unknown as Request

    const res = await postSalaryUploadRoute(req)
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.count).toBe(1)

    expect(prisma.salaryBenchmark.createMany).toHaveBeenCalledWith({
      data: [
        {
          company: "Google",
          role: "Senior SWE",
          location: "Remote",
          salaryMin: 180000,
          salaryMax: 240000,
          salaryMedian: 210000,
          currency: "USD",
          source: "User BYO Upload",
          confidence: 1.0,
        },
      ],
    })
  })
})
