import { describe, it, expect } from "vitest"
import { filterToolsByMode } from "../tool-router"

const mockTools = {
  searchApplications: { name: "searchApplications" },
  createApplication: { name: "createApplication" },
  deleteApplication: { name: "deleteApplication" },
  sendOutreachEmailViaResend: { name: "sendOutreachEmailViaResend" },
  addPrepQuestions: { name: "addPrepQuestions" },
  scrapeJobLink: { name: "scrapeJobLink" },
  setWeeklyGoals: { name: "setWeeklyGoals" },
}

describe("filterToolsByMode", () => {
  it("tracker mode includes application mutation tools", () => {
    const filtered = filterToolsByMode(mockTools, "tracker")
    expect(filtered.searchApplications).toBeDefined()
    expect(filtered.createApplication).toBeDefined()
    expect(filtered.deleteApplication).toBeDefined()
    expect(filtered.sendOutreachEmailViaResend).toBeUndefined()
  })

  it("interview mode excludes external and destructive tools", () => {
    const filtered = filterToolsByMode(mockTools, "interview")
    expect(filtered.searchApplications).toBeDefined()
    expect(filtered.addPrepQuestions).toBeDefined()
    expect(filtered.deleteApplication).toBeUndefined()
    expect(filtered.sendOutreachEmailViaResend).toBeUndefined()
  })

  it("general mode only exposes safe tools", () => {
    const filtered = filterToolsByMode(mockTools, "general")
    expect(filtered.searchApplications).toBeDefined()
    expect(filtered.createApplication).toBeUndefined()
    expect(filtered.deleteApplication).toBeUndefined()
  })
})
