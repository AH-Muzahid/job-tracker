import { describe, it, expect } from "vitest"
import { extractJsonObject } from "../json-extractor"

describe("extractJsonObject", () => {
  it("parses pure valid JSON object", () => {
    const raw = JSON.stringify({ goal: "Apply to Stripe", steps: [] })
    const result = extractJsonObject<{ goal: string; steps: unknown[] }>(raw)
    expect(result).not.toBeNull()
    expect(result?.goal).toBe("Apply to Stripe")
    expect(result?.steps).toEqual([])
  })

  it("parses JSON inside markdown code fence with language tag", () => {
    const raw = `Here is the plan:
\`\`\`json
{
  "goal": "Prepare interview",
  "steps": [{ "id": "1", "task": "Review behavioral" }]
}
\`\`\`
Let me know what you think!`

    const result = extractJsonObject<{ goal: string; steps: Array<{ id: string; task: string }> }>(raw)
    expect(result).not.toBeNull()
    expect(result?.goal).toBe("Prepare interview")
    expect(result?.steps).toHaveLength(1)
  })

  it("handles JSON followed immediately by text without code fence (exact error case)", () => {
    const raw = `{\n  "goal": "Review application",\n  "steps": []\n}\n\nNote: No tool actions required for this query.`
    const result = extractJsonObject<{ goal: string; steps: unknown[] }>(raw)
    expect(result).not.toBeNull()
    expect(result?.goal).toBe("Review application")
    expect(result?.steps).toEqual([])
  })

  it("handles braces and quotes inside string properties", () => {
    const raw = `Plan:
{
  "goal": "Send message with {placeholder} and \\"quoted\\" values",
  "steps": [
    { "task": "Check {status}" }
  ]
}
Done.`

    const result = extractJsonObject<{ goal: string; steps: Array<{ task: string }> }>(raw)
    expect(result).not.toBeNull()
    expect(result?.goal).toContain("{placeholder}")
    expect(result?.goal).toContain('"quoted"')
    expect(result?.steps[0].task).toBe("Check {status}")
  })

  it("handles trailing commas in JSON object", () => {
    const raw = `{
      "goal": "Tailor resume",
      "steps": [
        { "id": "1", "task": "Extract keywords", },
      ],
    }`

    const result = extractJsonObject<{ goal: string; steps: unknown[] }>(raw)
    expect(result).not.toBeNull()
    expect(result?.goal).toBe("Tailor resume")
  })

  it("returns null for non-JSON conversational text without throwing", () => {
    const raw = "Hello! I am your AI assistant. How can I help you today?"
    const result = extractJsonObject(raw)
    expect(result).toBeNull()
  })

  it("returns null for empty or invalid inputs", () => {
    expect(extractJsonObject("")).toBeNull()
    expect(extractJsonObject("   ")).toBeNull()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(extractJsonObject(null as any)).toBeNull()
  })
})
