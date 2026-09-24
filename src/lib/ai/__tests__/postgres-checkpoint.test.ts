/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { MemorySaver } from "@langchain/langgraph"

const mockSetupSpy = vi.fn().mockResolvedValue(undefined)

class MockPostgresSaver extends MemorySaver {
  async setup() {
    await mockSetupSpy()
  }
}

vi.mock("@langchain/langgraph-checkpoint-postgres", () => {
  return {
    PostgresSaver: MockPostgresSaver,
  }
})

const mockPoolInstance = {
  query: vi.fn(),
  connect: vi.fn(),
  end: vi.fn(),
  on: vi.fn(),
}

vi.mock("pg", () => {
  const MockPool = vi.fn().mockImplementation(function (this: any) {
    return mockPoolInstance
  })
  return {
    Pool: MockPool,
  }
})

describe("PostgreSQL Persistent Checkpointer", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset global singleton for test isolation
    const globalObj = globalThis as any
    globalObj.graphCheckpointer = undefined
    globalObj.graphPool = undefined
    globalObj.checkpointerSetupPromise = undefined
  })

  it("initializes PostgresSaver with Pool and runs setup()", async () => {
    const { getGraphCheckpointer } = await import("../graph/checkpointer")
    const checkpointer = await getGraphCheckpointer()

    expect(checkpointer).toBeDefined()
    expect(mockSetupSpy).toHaveBeenCalled()
    expect(mockPoolInstance.on).toHaveBeenCalledWith("error", expect.any(Function))
  })

  it("returns the singleton instance on subsequent calls", async () => {
    const { getGraphCheckpointer } = await import("../graph/checkpointer")
    const cp1 = await getGraphCheckpointer()
    const cp2 = await getGraphCheckpointer()

    expect(cp1).toBe(cp2)
  })

  it("compiles workflow with postgres checkpointer attached", async () => {
    const { buildCareerAgentGraph } = await import("../graph/workflow")
    const graph = await buildCareerAgentGraph({
      providerType: "openai",
      apiKey: "sk-test",
    })

    expect(graph).toBeDefined()
    expect(graph.checkpointer).toBeDefined()
  }, 120000)
})
