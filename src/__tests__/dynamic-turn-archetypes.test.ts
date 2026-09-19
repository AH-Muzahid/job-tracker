import { describe, it, expect } from "vitest"
import { getTurnArchetypePhase } from "@/app/api/ai/mock-interview/converse/archetypes"
import { getEmergencyInterviewTurn } from "@/lib/ai/resilience"

describe("Dynamic Turn Archetypes (INT-10)", () => {
  describe("Behavioral (STAR Progression)", () => {
    it("progresses through STAR stages correctly across 5 turns", () => {
      const common = {
        interviewType: "Behavioral" as const,
        targetTurnCount: 5,
        interviewerName: "Sarah",
        targetRole: "Product Engineer",
        targetCompany: "Stripe",
      }

      const turn0 = getTurnArchetypePhase({ ...common, currentCandidateTurn: 0 })
      expect(turn0.phaseTitle).toBe("Background & Role Motivation")
      expect(turn0.instruction).toContain("BEHAVIORAL - INTRODUCTION")

      const turn1 = getTurnArchetypePhase({ ...common, currentCandidateTurn: 1 })
      expect(turn1.phaseTitle).toBe("STAR: Situation & High Stakes Challenge")
      expect(turn1.instruction).toContain("SITUATION & TASK UNDER PRESSURE")

      const turn2 = getTurnArchetypePhase({ ...common, currentCandidateTurn: 2 })
      expect(turn2.phaseTitle).toBe("STAR: Action & Conflict Resolution")
      expect(turn2.instruction).toContain("PERSONAL ACTION & DISAGREEMENT")

      const turn3 = getTurnArchetypePhase({ ...common, currentCandidateTurn: 3 })
      expect(turn3.phaseTitle).toBe("STAR: Result, Impact & Reflection")
      expect(turn3.instruction).toContain("QUANTIFIED IMPACT & RETROSPECTIVE")

      const turn4 = getTurnArchetypePhase({ ...common, currentCandidateTurn: 4 })
      expect(turn4.phaseTitle).toBe("STAR: Result, Impact & Reflection")

      const turn5 = getTurnArchetypePhase({ ...common, currentCandidateTurn: 5 })
      expect(turn5.phaseTitle).toBe("Wrap-Up & Closing Sign-Off")
      expect(turn5.instruction).toContain("DO NOT ASK ANY MORE QUESTIONS")
    })
  })

  describe("System Design Progression", () => {
    it("progresses through architecture and resiliency stages", () => {
      const common = {
        interviewType: "System Design" as const,
        targetTurnCount: 4,
        interviewerName: "David",
        targetRole: "Staff Backend Engineer",
        targetCompany: "Netflix",
      }

      const turn0 = getTurnArchetypePhase({ ...common, currentCandidateTurn: 0 })
      expect(turn0.phaseTitle).toBe("Requirements & Scope Formulation")
      expect(turn0.instruction).toContain("REQUIREMENTS & CAPACITY ESTIMATION")

      const turn1 = getTurnArchetypePhase({ ...common, currentCandidateTurn: 1 })
      expect(turn1.phaseTitle).toBe("High-Level Architecture & Core Data Entities")

      const turn2 = getTurnArchetypePhase({ ...common, currentCandidateTurn: 2 })
      expect(turn2.phaseTitle).toBe("Data Partitioning & Bottleneck Mitigation")

      const turn3 = getTurnArchetypePhase({ ...common, currentCandidateTurn: 3 })
      expect(turn3.phaseTitle).toBe("Failure Modes, Resiliency & Observability")

      const turn4 = getTurnArchetypePhase({ ...common, currentCandidateTurn: 4 })
      expect(turn4.phaseTitle).toBe("Wrap-Up & Closing Sign-Off")
    })
  })

  describe("Technical / Coding Progression", () => {
    it("progresses through fundamentals, algorithms, edge cases, and debugging", () => {
      const common = {
        interviewType: "Technical" as const,
        targetTurnCount: 5,
        interviewerName: "David",
        targetRole: "Senior Frontend Engineer",
        targetCompany: "Vercel",
      }

      const turn0 = getTurnArchetypePhase({ ...common, currentCandidateTurn: 0 })
      expect(turn0.phaseTitle).toBe("Core Fundamentals & Stack Warm-up")

      const turn1 = getTurnArchetypePhase({ ...common, currentCandidateTurn: 1 })
      expect(turn1.phaseTitle).toBe("Algorithmic & Component Architecture")

      const turn2 = getTurnArchetypePhase({ ...common, currentCandidateTurn: 2 })
      expect(turn2.phaseTitle).toBe("Edge Cases, Race Conditions & Complexity")

      const turn3 = getTurnArchetypePhase({ ...common, currentCandidateTurn: 3 })
      expect(turn3.phaseTitle).toBe("Live Incident Debugging & Performance Triage")
    })
  })

  describe("Resilient Emergency Generator Archetype Awareness", () => {
    it("produces behavioral fallback question when phase is STAR", () => {
      const fallback = getEmergencyInterviewTurn(
        "Software Engineer",
        "Google",
        "STAR: Situation & High Stakes Challenge",
        2
      )
      expect(fallback).toContain("challenging project or high-pressure situation")
    })

    it("produces system design fallback question when phase is System Design", () => {
      const fallback = getEmergencyInterviewTurn(
        "Backend Engineer",
        "Meta",
        "High-Level Architecture & Core Data Entities",
        2
      )
      expect(fallback).toContain("high-level architecture and core data entities")
    })

    it("produces final wrap-up statement when phase is Wrap-Up", () => {
      const fallback = getEmergencyInterviewTurn(
        "Fullstack Engineer",
        "Amazon",
        "Wrap-Up & Closing Sign-Off",
        5
      )
      expect(fallback).toContain("That concludes our interview session today")
    })
  })
})
