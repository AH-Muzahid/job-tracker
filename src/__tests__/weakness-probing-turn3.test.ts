import { describe, it, expect, vi } from "vitest"
import { buildWeaknessProbingInstruction } from "@/lib/ai/memory"

describe("INT-14: Active Weakness Probing in Follow-up Mock Interviews", () => {
  it("builds a targeted weakness probing directive for turn 3", () => {
    const weakness = "[Weakness: Raft Consensus] [Distributed Systems] at Stripe: Candidate struggled to explain quorum and leader failover."
    const instruction = buildWeaknessProbingInstruction(weakness)

    expect(instruction).toContain("TARGETED WEAKNESS PROBING (STAGE 3 PERSONALIZATION)")
    expect(instruction).toContain(weakness)
    expect(instruction).toContain("Actively probe or challenge the candidate around this known weakness area")
    expect(instruction).toContain("In your last session, you touched on this topic")
  })

  it("handles empty or whitespace-only weakness strings gracefully", () => {
    expect(buildWeaknessProbingInstruction("")).toBe("")
    expect(buildWeaknessProbingInstruction("   ")).toBe("")
  })

  it("evaluates turn condition: triggers probing on Question 3 of a standard 4-turn interview", () => {
    const shouldProbe = (currentQuestionNumber: number, targetTurnCount: number) => {
      return currentQuestionNumber === 3 || (targetTurnCount <= 3 && currentQuestionNumber === 2)
    }

    // Standard 4 or 5 turn interview
    expect(shouldProbe(1, 4)).toBe(false)
    expect(shouldProbe(2, 4)).toBe(false)
    expect(shouldProbe(3, 4)).toBe(true)
    expect(shouldProbe(4, 4)).toBe(false)

    // Short 3-turn interview
    expect(shouldProbe(1, 3)).toBe(false)
    expect(shouldProbe(2, 3)).toBe(true)
    expect(shouldProbe(3, 3)).toBe(true)
  })
})
