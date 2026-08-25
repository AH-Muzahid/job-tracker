import { describe, it, expect } from "vitest"
import { createDataStreamParser } from "@/lib/ai/stream-parser"

describe("AI Data Stream Parser", () => {
  it("parses text deltas split across chunks", () => {
    const parser = createDataStreamParser()
    const state1 = parser.feed('0:"Hello, "\n0:"world')
    expect(state1.text).toBe("Hello, ")

    const state2 = parser.feed('!"\n')
    expect(state2.text).toBe("Hello, world!")
  })

  it("parses live tool calls (state: call) and subsequent tool results (state: result)", () => {
    const parser = createDataStreamParser()
    
    // 1. Tool Call invocation (part type 9)
    const state1 = parser.feed('9:{"toolCallId":"call-1","toolName":"createApplication","args":{"companyName":"Stripe","jobTitle":"Senior Backend Engineer"}}\n')
    expect(state1.toolInvocations).toHaveLength(1)
    expect(state1.toolInvocations[0].toolName).toBe("createApplication")
    expect(state1.toolInvocations[0].state).toBe("call")
    expect(state1.toolInvocations[0].args).toEqual({ companyName: "Stripe", jobTitle: "Senior Backend Engineer" })

    // 2. Tool Result arrival (part type a)
    const state2 = parser.feed('a:{"toolCallId":"call-1","toolName":"createApplication","result":{"success":true,"message":"Created application for Stripe"}}\n')
    expect(state2.toolInvocations).toHaveLength(1)
    expect(state2.toolInvocations[0].state).toBe("result")
    expect(state2.toolInvocations[0].result).toEqual({ success: true, message: "Created application for Stripe" })

    // 3. Final text synthesis arrival (part type 0)
    const state3 = parser.feed('0:"Successfully added Stripe to your tracker!"\n')
    expect(state3.text).toBe("Successfully added Stripe to your tracker!")
  })

  it("handles plain text stream as backwards-compatible fallback", () => {
    const parser = createDataStreamParser()
    parser.feed("This is a direct plain text response without data stream prefixes.")
    const state = parser.finalize()
    expect(state.text).toContain("This is a direct plain text response")
  })
})
