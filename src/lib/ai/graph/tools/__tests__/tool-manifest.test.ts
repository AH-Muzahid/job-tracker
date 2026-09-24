import { describe, it, expect, vi } from "vitest"
import {
  TOOL_MANIFEST,
  getToolCatalogForPlanner,
  isHITLRequired,
  isAllowedInHeadless,
  executeToolByName,
  getToolRisk,
  getSafeTools,
  ToolRisk,
} from "../tool-manifest"

describe("Unified Tool Manifest Contract Tests", () => {
  it("every manifest tool defines a valid schema, risk, and execute function", () => {
    const tools = Object.values(TOOL_MANIFEST)
    expect(tools.length).toBeGreaterThanOrEqual(20)

    for (const tool of tools) {
      expect(tool.name).toBeDefined()
      expect(typeof tool.name).toBe("string")
      expect(tool.description).toBeDefined()
      expect(typeof tool.description).toBe("string")
      expect(tool.schema).toBeDefined()
      expect(typeof tool.risk).toBe("string")
      expect(typeof tool.requiresConfirmation).toBe("boolean")
      expect(typeof tool.allowedInHeadless).toBe("boolean")
      expect(typeof tool.execute).toBe("function")
    }
  })

  it("planner catalog auto-generates cleanly without missing tools or split-brain", () => {
    const catalog = getToolCatalogForPlanner()
    expect(catalog).toContain("createApplication")
    expect(catalog).toContain("updateApplicationStatus")
    expect(catalog).toContain("searchApplications")
    expect(catalog).toContain("deleteApplication")
    expect(catalog).toContain("forgetUserMemory")
    expect(catalog).toContain("sendOutreachEmailViaResend")
    expect(catalog).toContain("[REQUIRES CONFIRMATION]")
  })

  it("correctly identifies HITL sensitive tools", () => {
    expect(isHITLRequired("deleteApplication")).toBe(true)
    expect(isHITLRequired("forgetUserMemory")).toBe(true)
    expect(isHITLRequired("sendOutreachEmailViaResend")).toBe(true)

    expect(isHITLRequired("searchApplications")).toBe(false)
    expect(isHITLRequired("getUserProfile")).toBe(false)
    expect(isHITLRequired("createApplication")).toBe(false)
  })

  it("blocks sensitive tools in headless background mode", async () => {
    const result = await executeToolByName(
      "deleteApplication",
      { companyOrTitle: "Acme Corp" },
      "test-user-id",
      { isHeadless: true }
    )

    expect(result.success).toBe(false)
    expect(result.retryable).toBe(false)
    expect(result.error).toContain("headless background mode")
  })

  it("enforces Zod input validation before tool execution and returns non-retryable error", async () => {
    // createApplication requires companyName and jobTitle
    const result = await executeToolByName(
      "createApplication",
      { companyName: "" } as any, // missing jobTitle and empty companyName
      "test-user-id"
    )

    expect(result.success).toBe(false)
    expect(result.retryable).toBe(false)
    expect(result.error).toContain("Invalid input for tool \"createApplication\"")
  })

  it("returns non-retryable error on unknown tool name", async () => {
    const result = await executeToolByName(
      "unknownPhantomTool",
      {},
      "test-user-id"
    )

    expect(result.success).toBe(false)
    expect(result.retryable).toBe(false)
    expect(result.error).toContain("not recognized")
  })

  it("returns unauthorized on missing userId", async () => {
    const result = await executeToolByName(
      "getUserProfile",
      {},
      ""
    )

    expect(result.success).toBe(false)
    expect(result.retryable).toBe(false)
    expect(result.error).toContain("Unauthorized")
  })

  it("getSafeTools returns safe tools excluding destructive and external", () => {
    const safeTools = getSafeTools()
    expect(safeTools).toContain("searchApplications")
    expect(safeTools).toContain("getUserProfile")
    expect(safeTools).not.toContain("deleteApplication")
    expect(safeTools).not.toContain("forgetUserMemory")
    expect(safeTools).not.toContain("sendOutreachEmailViaResend")
  })
})
