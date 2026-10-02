import { describe, it, expect, vi } from "vitest"
import {
  INNGEST_PIPELINE_CATALOG,
  getInngestPipelineById,
  triggerInngestPipeline,
} from "@/lib/ops/inngest-catalog"

vi.mock("@/inngest/client", () => ({
  inngest: {
    send: vi.fn(async ({ name, data }) => ({ ids: [`event_${name}_123`] })),
  },
}))

describe("Inngest Pipeline Catalog & Dispatcher", () => {
  it("contains all 14 registered background pipelines with complete metadata", () => {
    expect(INNGEST_PIPELINE_CATALOG.length).toBe(14)
    const functionIds = INNGEST_PIPELINE_CATALOG.map((f) => f.id)
    expect(functionIds).toContain("daily-job-hunt-scheduler")
    expect(functionIds).toContain("batch-job-release-scheduler")
    expect(functionIds).toContain("agent-proactive-daemon")
    expect(functionIds).toContain("career-orchestrator-pipeline")
    expect(functionIds).toContain("linkedin-harvest-scheduler")
  })

  it("retrieves a pipeline by ID correctly", () => {
    const pipeline = getInngestPipelineById("agent-proactive-daemon")
    expect(pipeline).toBeDefined()
    expect(pipeline?.category).toBe("Autonomous Agent")
    expect(pipeline?.triggerEvent).toBe("agent/proactive.scan")
  })

  it("successfully dispatches an on-demand trigger event for a valid pipeline", async () => {
    const result = await triggerInngestPipeline("batch-job-release-scheduler", {
      triggeredBy: "admin",
    })
    expect(result.success).toBe(true)
    expect(result.eventId).toBeDefined()
  })

  it("rejects dispatch for an unknown pipeline ID", async () => {
    const result = await triggerInngestPipeline("non-existent-pipeline", {})
    expect(result.success).toBe(false)
    expect(result.error).toContain("Unknown pipeline")
  })
})
