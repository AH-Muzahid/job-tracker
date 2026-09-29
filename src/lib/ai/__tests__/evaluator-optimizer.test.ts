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

    it("detects robotic 'As a [role] skilled in...' openings", () => {
      const rubric: EvaluationRubric = {
        disallowRoboticOpenings: true,
      }
      const roboticDraft =
        "As a frontend-focused developer skilled in React, Next.js, and TypeScript, I built CodeArena."
      const result = evaluateDraft(roboticDraft, rubric)

      expect(result.passed).toBe(false)
      expect(result.violations.some((v) => v.includes("robotic opening"))).toBe(true)
    })

    it("detects arrogant AI-isms like 'proving I can' and corporate fluff 'under tight deadlines'", () => {
      const rubric: EvaluationRubric = {
        disallowArrogantPhrases: true,
      }
      const arrogantDraft =
        "I cut submission latency by 40% using streams—proving I can ship high-performance UIs under tight deadlines."
      const result = evaluateDraft(arrogantDraft, rubric)

      expect(result.passed).toBe(false)
      expect(result.violations.some((v) => v.includes("self-aggrandizing"))).toBe(true)
    })

    it("flags domain contradiction when backend Docker infra is cited for a frontend role", () => {
      const rubric: EvaluationRubric = {
        targetRoleDomain: "frontend",
      }
      const contradictoryDraft =
        "I built CodeArena with Docker-based code execution to build high-performance web interfaces."
      const result = evaluateDraft(contradictoryDraft, rubric)

      expect(result.passed).toBe(false)
      expect(result.violations.some((v) => v.includes("Domain contradiction"))).toBe(true)
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

    it("detects and rejects raw social media hashtags when disallowHashtags is true", () => {
      const rubric: EvaluationRubric = {
        disallowHashtags: true,
      }
      const draftWithHashtags =
        "Application for #hiring #wearehiring #juniordeveloper #fullstackdeveloper. I noticed Recruit 360 is looking for #mernstack."
      const result = evaluateDraft(draftWithHashtags, rubric)

      expect(result.passed).toBe(false)
      expect(result.violations.some((v) => v.includes("raw social media hashtags"))).toBe(true)
      expect(result.violations.some((v) => v.includes("#hiring"))).toBe(true)

      const cleanDraft = "Application for Junior Full Stack Developer. I noticed Recruit 360 is looking for a developer."
      const cleanResult = evaluateDraft(cleanDraft, rubric)
      expect(cleanResult.passed).toBe(true)
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

    it("evaluates draft through semanticJudge and passes immediately if conversion score >= 80", async () => {
      const draftFn = vi.fn().mockResolvedValue("Hi Stripe team, I built a fast Next.js app.")
      const judgeFn = vi.fn().mockResolvedValue({
        score: 92,
        verdict: "approved",
        critique: [],
        strengths: ["Strong engineering proof", "Direct authentic tone"],
      })

      const result = await runEvaluatorOptimizer({
        generator: draftFn,
        rubric: { disallowPlaceholders: true },
        semanticJudge: judgeFn,
        maxIterations: 2,
      })

      expect(result.passed).toBe(true)
      expect(result.conversionScore).toBe(92)
      expect(result.conversionJudge?.verdict).toBe("approved")
      expect(judgeFn).toHaveBeenCalledTimes(1)
      expect(draftFn).toHaveBeenCalledTimes(1)
    })

    it("triggers self-correction when semanticJudge rejects draft (score < 80) and passes on next iteration", async () => {
      const draftFn = vi
        .fn()
        .mockResolvedValueOnce("Hi Stripe, I am skilled in many technologies.")
        .mockResolvedValueOnce("Hi Stripe, I built CodeArena optimizing UI rendering by 40%.")

      const judgeFn = vi
        .fn()
        .mockResolvedValueOnce({
          score: 65,
          verdict: "rejected",
          critique: ["Vague claims without specific metric or project proof."],
          strengths: [],
        })
        .mockResolvedValueOnce({
          score: 88,
          verdict: "approved",
          critique: [],
          strengths: ["Clear metric", "Relevant project"],
        })

      const result = await runEvaluatorOptimizer({
        generator: draftFn,
        rubric: { disallowPlaceholders: true },
        semanticJudge: judgeFn,
        maxIterations: 3,
      })

      expect(result.passed).toBe(true)
      expect(result.iterations).toBe(2)
      expect(result.selfCorrected).toBe(true)
      expect(result.conversionScore).toBe(88)
      expect(judgeFn).toHaveBeenCalledTimes(2)
      expect(draftFn.mock.calls[1][0].critiqueFeedback?.[0]).toContain("Hiring Leader Conversion Review (65/100 - Rejected)")
    })
  })
})
