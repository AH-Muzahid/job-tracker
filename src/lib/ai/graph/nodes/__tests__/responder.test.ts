import { describe, it, expect, vi, beforeEach } from "vitest"
import { createResponderNode, getConversationalPrompt } from "../responder"
import { HumanMessage, AIMessage } from "@langchain/core/messages"

describe("Responder Node Unit Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("passes real multi-turn conversation messages into streaming model for conversational queries", async () => {
    const streamedChunks = ["Because the job ", "posting did not ", "disclose an HR email."]
    const mockStream = vi.fn().mockImplementation(async function* () {
      for (const chunk of streamedChunks) {
        yield { content: chunk }
      }
    })

    const mockModel = {
      stream: mockStream,
      invoke: vi.fn(),
    } as any

    const tokensEmitted: string[] = []
    const responderNode = createResponderNode(mockModel, (delta) => {
      tokensEmitted.push(delta)
    })

    const userMsg1 = new HumanMessage("Draft email for BEK & Co")
    const asstMsg1 = new AIMessage("Subject: Full Stack Role Application...")
    const userMsg2 = new HumanMessage("Recipient Email (To) eta kno identify korte parlena?")

    const state = {
      goal: "Recipient Email (To) eta kno identify korte parlena?",
      messages: [userMsg1, asstMsg1, userMsg2],
      plan: [],
      currentStepIndex: 0,
      reflection: { passed: true, retryCount: 0 },
      userId: "user-1",
      sessionId: "session-1",
      routeContext: null,
      isHeadlessMode: false,
      responseContent: "",
      interruptData: null,
    }

    const result = await responderNode(state)

    expect(mockStream).toHaveBeenCalledTimes(1)
    const passedMessages = mockStream.mock.calls[0][0]
    
    // First message should be system message with conversational prompt
    expect(passedMessages[0]._getType()).toBe("system")
    // Subsequent messages should be the actual conversation turns (userMsg1, asstMsg1, userMsg2)
    expect(passedMessages.slice(1)).toEqual([userMsg1, asstMsg1, userMsg2])

    // Verify token streaming worked token-by-token
    expect(tokensEmitted).toEqual(streamedChunks)
    expect(result.responseContent).toBe("Because the job posting did not disclose an HR email.")
  })

  it("enforces concise 1-3 sentences rule in conversational prompt", () => {
    const prompt = getConversationalPrompt("Previous session discussion on Google applications")
    expect(prompt).toContain("1-3 brief sentences")
    expect(prompt).toContain("NEVER re-generate full application templates")
    expect(prompt).toContain("why something was missing or not identified")
    expect(prompt).toContain("Previous session discussion on Google applications")
  })
})
