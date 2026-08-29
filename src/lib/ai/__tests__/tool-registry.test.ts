import { describe, it, expect } from "vitest"
import { getToolRisk, requiresConfirmation, getToolsByRisk, getSafeTools, ToolRisk } from "../tool-registry"

describe("Tool Risk Registry", () => {
  it("classifies read-only tools correctly", () => {
    expect(getToolRisk("searchApplications")).toBe(ToolRisk.READ_ONLY)
    expect(getToolRisk("getPipelineStats")).toBe(ToolRisk.READ_ONLY)
    expect(getToolRisk("getResumeSummary")).toBe(ToolRisk.READ_ONLY)
  })

  it("classifies destructive tools correctly", () => {
    expect(getToolRisk("deleteApplication")).toBe(ToolRisk.DESTRUCTIVE)
    expect(getToolRisk("forgetUserMemory")).toBe(ToolRisk.DESTRUCTIVE)
  })

  it("classifies external tools correctly", () => {
    expect(getToolRisk("sendOutreachEmailViaResend")).toBe(ToolRisk.EXTERNAL)
    expect(getToolRisk("scrapeJobLink")).toBe(ToolRisk.EXTERNAL)
  })

  it("defaults to LOW_MUTATION for unknown tools", () => {
    expect(getToolRisk("unknownTool")).toBe(ToolRisk.LOW_MUTATION)
  })

  it("requires confirmation for destructive tools", () => {
    expect(requiresConfirmation("deleteApplication")).toBe(true)
    expect(requiresConfirmation("sendOutreachEmailViaResend")).toBe(true)
    expect(requiresConfirmation("batchImportApplications")).toBe(true)
  })

  it("does not require confirmation for read-only tools", () => {
    expect(requiresConfirmation("searchApplications")).toBe(false)
    expect(requiresConfirmation("getPipelineStats")).toBe(false)
  })

  it("getToolsByRisk returns correct tools", () => {
    const readOnlyTools = getToolsByRisk(ToolRisk.READ_ONLY)
    expect(readOnlyTools).toContain("searchApplications")
    expect(readOnlyTools).toContain("getPipelineStats")
    expect(readOnlyTools).not.toContain("deleteApplication")
  })

  it("getSafeTools excludes destructive and external", () => {
    const safeTools = getSafeTools()
    expect(safeTools).toContain("searchApplications")
    expect(safeTools).toContain("savePrepNote")
    expect(safeTools).not.toContain("createApplication")
    expect(safeTools).not.toContain("deleteApplication")
    expect(safeTools).not.toContain("sendOutreachEmailViaResend")
  })
})
