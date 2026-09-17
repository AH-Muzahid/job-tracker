import { describe, it, expect, vi } from "vitest"
import type { ConversationalVoiceInterviewModalProps } from "@/components/interview/conversational/types"

describe("Mock Interview Launchpad Preset Sync (INT-11)", () => {
  it("preserves tone and turns in preset configuration interface", () => {
    const preset = {
      title: "Distributed Backend Architect",
      role: "Distributed Backend Architect",
      company: "Enterprise Scale",
      type: "System Design",
      tone: "strict" as const,
      turns: 7,
      description: "Distributed caching, rate limiting, and fault tolerance.",
      tag: "Staff Level",
    }

    const modalProps: ConversationalVoiceInterviewModalProps = {
      isOpen: true,
      onClose: vi.fn(),
      initialRole: preset.role,
      initialCompany: preset.company,
      initialType: preset.type,
      initialTone: preset.tone,
      initialTurns: preset.turns,
    }

    expect(modalProps.initialRole).toBe("Distributed Backend Architect")
    expect(modalProps.initialType).toBe("System Design")
    expect(modalProps.initialTone).toBe("strict")
    expect(modalProps.initialTurns).toBe(7)
  })

  it("supports behavioral STAR preset with startup-cto tone", () => {
    const preset = {
      role: "Engineering Manager / Lead",
      company: "Global Tech",
      type: "Behavioral",
      tone: "startup-cto" as const,
      turns: 5,
    }

    const modalProps: ConversationalVoiceInterviewModalProps = {
      isOpen: true,
      onClose: vi.fn(),
      initialRole: preset.role,
      initialCompany: preset.company,
      initialType: preset.type,
      initialTone: preset.tone,
      initialTurns: preset.turns,
    }

    expect(modalProps.initialTone).toBe("startup-cto")
    expect(modalProps.initialType).toBe("Behavioral")
    expect(modalProps.initialTurns).toBe(5)
  })
})
