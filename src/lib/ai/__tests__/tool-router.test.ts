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
  it("LLM-first: exposes ALL tools regardless of mode", () => {
    const filtered = filterToolsByMode(mockTools, "tracker")
    expect(filtered.searchApplications).toBeDefined()
    expect(filtered.createApplication).toBeDefined()
    expect(filtered.deleteApplication).toBeDefined()
    expect(filtered.sendOutreachEmailViaResend).toBeDefined()
  })

  it("LLM-first: general mode also exposes all tools", () => {
    const filtered = filterToolsByMode(mockTools, "general")
    expect(filtered.searchApplications).toBeDefined()
    expect(filtered.createApplication).toBeDefined()
    expect(filtered.deleteApplication).toBeDefined()
    expect(filtered.sendOutreachEmailViaResend).toBeDefined()
  })

  it("LLM-first: interview mode exposes all tools", () => {
    const filtered = filterToolsByMode(mockTools, "interview")
    expect(filtered.searchApplications).toBeDefined()
    expect(filtered.addPrepQuestions).toBeDefined()
    expect(filtered.deleteApplication).toBeDefined()
    expect(filtered.sendOutreachEmailViaResend).toBeDefined()
  })
})
