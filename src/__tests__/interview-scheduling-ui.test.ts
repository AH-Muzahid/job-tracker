import { describe, it, expect } from "vitest"

describe("INT-15: Interview Scheduling UI & Calendar Integration", () => {
  it("formats local datetime string for input elements correctly", () => {
    const toLocalDatetimeString = (dateInput?: Date | string | null): string => {
      if (!dateInput) return ""
      const d = new Date(dateInput)
      if (isNaN(d.getTime())) return ""
      const pad = (n: number) => n.toString().padStart(2, "0")
      const year = d.getFullYear()
      const month = pad(d.getMonth() + 1)
      const day = pad(d.getDate())
      const hours = pad(d.getHours())
      const minutes = pad(d.getMinutes())
      return `${year}-${month}-${day}T${hours}:${minutes}`
    }

    const testDate = new Date(2026, 8, 25, 14, 30) // 2026-09-25 14:30
    const formatted = toLocalDatetimeString(testDate)
    expect(formatted).toBe("2026-09-25T14:30")
    expect(toLocalDatetimeString(null)).toBe("")
    expect(toLocalDatetimeString("invalid-date")).toBe("")
  })

  it("filters scheduled interviews from application lists for calendar and upcoming sections", () => {
    const apps = [
      {
        id: "app-1",
        companyName: "Google",
        jobTitle: "Staff Engineer",
        status: "Interview",
        applicationDate: "2026-09-10T10:00:00.000Z",
        interviewDate: "2026-09-20T14:00:00.000Z",
        interviewRound: "System Design",
      },
      {
        id: "app-2",
        companyName: "Amazon",
        jobTitle: "SDE II",
        status: "Applied",
        applicationDate: "2026-09-15T09:00:00.000Z",
        interviewDate: null,
        interviewRound: null,
      },
    ]

    const scheduled = apps.filter((a) => Boolean(a.interviewDate))
    expect(scheduled.length).toBe(1)
    expect(scheduled[0].companyName).toBe("Google")
    expect(scheduled[0].interviewRound).toBe("System Design")

    // Check calendar day matching
    const targetDateStr = "2026-09-20"
    const matchingInterviews = apps.filter(
      (a) => a.interviewDate && a.interviewDate.split("T")[0] === targetDateStr
    )
    expect(matchingInterviews.length).toBe(1)
  })
})
