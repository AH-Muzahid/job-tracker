import { describe, it, expect, vi } from "vitest"
import {
  evaluateDraft,
  runEvaluatorOptimizer,
  EvaluationRubric,
} from "../evaluator-optimizer"

describe("Evaluator-Optimizer (Reflexion) Engine", () => {
  describe("evaluateDraft", () => {
    it("detects square bracket placeholders like [Company Name] or [Your Name]", () => {
      const rubric: EvaluationRubric = {
        disallowPlaceholders: true,
      }
      const draftWithPlaceholders = "Dear [Hiring Manager], I love [Company Name]."
      const result = evaluateDraft(draftWithPlaceholders, rubric)

      expect(result.passed).toBe(false)
      expect(result.violations.length).toBeGreaterThan(0)
      expect(result.violations.some((v) => v.includes("placeholder"))).toBe(true)
    })

    it("passes clean text without placeholders", () => {
      const rubric: EvaluationRubric = {
        disallowPlaceholders: true,
      }
      const cleanDraft = "Dear Stripe Team, I am excited about the Staff Software Engineer role."
      const result = evaluateDraft(cleanDraft, rubric)

      expect(result.passed).toBe(true)
      expect(result.violations).toHaveLength(0)
    })

    it("enforces max character limits for platforms like LinkedIn", () => {
      const rubric: EvaluationRubric = {
        maxCharacters: 300,
      }
      const longDraft = "A".repeat(305)
      const result = evaluateDraft(longDraft, rubric)

      expect(result.passed).toBe(false)
      expect(result.violations.some((v) => v.includes("exceeds maximum allowed length"))).toBe(true)
    })

    it("checks for mandatory required keywords", () => {
      const rubric: EvaluationRubric = {
        requiredKeywords: ["Kubernetes", "Next.js"],
      }
      const missingKeywordsDraft = "I have built large apps with React and TypeScript."
      const result = evaluateDraft(missingKeywordsDraft, rubric)

      expect(result.passed).toBe(false)
      expect(result.violations.some((v) => v.includes("Kubernetes"))).toBe(true)
      expect(result.violations.some((v) => v.includes("Next.js"))).toBe(true)
    })

    it("runs custom semantic validator if provided", () => {
      const rubric: EvaluationRubric = {
        customValidator: (content) => {
          if (content.includes("guarantee 100% ROI")) {
            return { passed: false, feedback: "Unsubstantiated guarantee claim" }
          }
          return { passed: true }
        },
      }
      const result = evaluateDraft("We guarantee 100% ROI in 2 days", rubric)
      expect(result.passed).toBe(false)
      expect(result.violations).toContain("Unsubstantiated guarantee claim")
    })
  })

  describe("runEvaluatorOptimizer", () => {
    it("returns immediately on iteration 1 if initial draft passes rubric", async () => {
      const draftFn = vi.fn().mockResolvedValue("Hi Acme team, I am Alex and I build high-scale Next.js apps.")
      const rubric: EvaluationRubric = {
        disallowPlaceholders: true,
        maxCharacters: 300,
      }

      const result = await runEvaluatorOptimizer({
        generator: draftFn,
        rubric,
        maxIterations: 3,
      })

      expect(result.passed).toBe(true)
      expect(result.iterations).toBe(1)
      expect(result.selfCorrected).toBe(false)
      expect(draftFn).toHaveBeenCalledTimes(1)
      expect(result.content).toContain("Hi Acme team")
    })

    it("triggers self-correction loop when initial draft fails, succeeding on iteration 2", async () => {
      const draftFn = vi
        .fn()
        .mockResolvedValueOnce("Hi [Recruiter Name], I am applying for [Job Title] at [Company].") // Fails
        .mockResolvedValueOnce("Hi Sarah, I am applying for Senior Engineer at Stripe.") // Passes

      const rubric: EvaluationRubric = {
        disallowPlaceholders: true,
      }

      const result = await runEvaluatorOptimizer({
        generator: draftFn,
        rubric,
        maxIterations: 3,
      })

      expect(result.passed).toBe(true)
      expect(result.iterations).toBe(2)
      expect(result.selfCorrected).toBe(true)
      expect(draftFn).toHaveBeenCalledTimes(2)
      expect(result.content).toBe("Hi Sarah, I am applying for Senior Engineer at Stripe.")
      // Ensure the second call received the critique feedback
      const secondCallArgs = draftFn.mock.calls[1][0]
      expect(secondCallArgs?.critiqueFeedback).toBeDefined()
      expect(secondCallArgs?.critiqueFeedback?.length).toBeGreaterThan(0)
    })

    it("falls back gracefully with recorded violations if max iterations exceeded", async () => {
      const draftFn = vi.fn().mockResolvedValue("Still contains [Placeholder] every time.")
      const rubric: EvaluationRubric = {
        disallowPlaceholders: true,
      }

      const result = await runEvaluatorOptimizer({
        generator: draftFn,
        rubric,
        maxIterations: 2,
        fallbackSanitizer: (content) => content.replace(/\[Placeholder\]/g, "the team"),
      })

      expect(result.iterations).toBe(2)
      expect(result.content).toBe("Still contains the team every time.")
      expect(result.usedFallbackSanitizer).toBe(true)
    })
  })
})
