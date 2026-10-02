import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import {
  UniversalJDEvaluator,
  EVALUATOR_STORAGE_KEY,
  loadEvaluatorCache,
  saveEvaluatorCache,
  clearEvaluatorCache,
  OpportunityDossier,
} from "@/components/discovery/UniversalJDEvaluator"
import { UniversalJDEvaluatorModal } from "@/components/discovery/UniversalJDEvaluatorModal"
import { useUI } from "@/lib/store"

// Mock router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}))

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(() => "mock-toast-id"),
  },
}))

const sampleDossier: OpportunityDossier = {
  success: true,
  sourceUrl: "https://stripe.com/jobs/staff-eng",
  scrapedTitle: "Staff Software Engineer",
  roleSnapshot: {
    company: "Stripe",
    role: "Staff Software Engineer",
    experienceAsked: "6+ years",
    keyStack: ["TypeScript", "React", "Go", "Distributed Systems"],
    workSetup: "Remote",
  },
  matchScore: 94,
  confidence: "High",
  verdict: "Strong architectural match with payment systems expertise.",
  whyThisScore: [
    "Core competencies in modern frontend and backend distributed architectures.",
    "Proven track record building resilient mission-critical APIs.",
  ],
  missingGaps: {
    missingKeywords: [],
    fixableGaps: [],
  },
  extractedSkills: ["TypeScript", "React", "Go", "PostgreSQL"],
  redFlags: null,
  scamEvaluation: {
    riskScore: 5,
    level: "clean",
    reasons: [],
    isFlagged: false,
  },
  finalRecommendation: "Prioritize tailored outreach with payment domain focus.",
  resumeAdvice: {
    emphasize: ["Distributed Systems", "Payment Infrastructure"],
  },
  applyStrategy: {
    bestPath: "Employee Referral",
  },
}

describe("Universal JD Evaluator Persistence & Modal Guardrails", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    useUI.setState({
      evaluatorModal: { open: false, initialText: undefined, initialUrl: undefined },
    })
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe("Cache Utilities", () => {
    it("persists evaluator state to localStorage under the correct key", () => {
      saveEvaluatorCache({
        jdInput: "Senior Frontend Engineer at Vercel",
        companyName: "Vercel",
        jobTitle: "Senior Frontend Engineer",
        jobUrl: "https://vercel.com/careers/1",
        source: "LinkedIn",
        dossier: sampleDossier,
      })

      const raw = localStorage.getItem(EVALUATOR_STORAGE_KEY)
      expect(raw).toBeTruthy()

      const cached = loadEvaluatorCache()
      expect(cached).not.toBeNull()
      expect(cached?.companyName).toBe("Vercel")
      expect(cached?.jobTitle).toBe("Senior Frontend Engineer")
      expect(cached?.dossier?.matchScore).toBe(94)
      expect(cached?.updatedAt).toBeGreaterThan(0)
    })

    it("expires cache entries older than 48 hours", () => {
      const expiredPayload = {
        jdInput: "Old JD",
        companyName: "Old Corp",
        jobTitle: "Dev",
        jobUrl: "",
        source: "LinkedIn",
        dossier: sampleDossier,
        updatedAt: Date.now() - 49 * 60 * 60 * 1000, // 49 hours ago
      }
      localStorage.setItem(EVALUATOR_STORAGE_KEY, JSON.stringify(expiredPayload))

      const cached = loadEvaluatorCache()
      expect(cached).toBeNull()
      expect(localStorage.getItem(EVALUATOR_STORAGE_KEY)).toBeNull()
    })

    it("clears cache completely when clearEvaluatorCache is called", () => {
      saveEvaluatorCache({
        jdInput: "Engineering Lead",
        companyName: "Linear",
        jobTitle: "Lead",
        jobUrl: "",
        source: "LinkedIn",
        dossier: null,
      })
      expect(localStorage.getItem(EVALUATOR_STORAGE_KEY)).toBeTruthy()

      clearEvaluatorCache()
      expect(localStorage.getItem(EVALUATOR_STORAGE_KEY)).toBeNull()
    })

    it("removes storage entry if all fields are empty", () => {
      saveEvaluatorCache({
        jdInput: "",
        companyName: "",
        jobTitle: "",
        jobUrl: "",
        source: "LinkedIn",
        dossier: null,
      })
      expect(localStorage.getItem(EVALUATOR_STORAGE_KEY)).toBeNull()
    })
  })

  describe("UniversalJDEvaluator Component Restoration", () => {
    it("restores cached evaluation dossier and displays restored banner", () => {
      saveEvaluatorCache({
        jdInput: "Job post content",
        companyName: "Stripe",
        jobTitle: "Staff Software Engineer",
        jobUrl: "https://stripe.com/jobs/staff-eng",
        source: "LinkedIn",
        dossier: sampleDossier,
      })

      render(<UniversalJDEvaluator />)

      // The evaluated dossier should be rendered immediately without resubmitting
      expect(screen.getByText("Staff Software Engineer")).toBeDefined()
      expect(screen.getByText("Restored previously evaluated draft")).toBeDefined()
      expect(screen.getByText("Start New Scan")).toBeDefined()
    })

    it("clears restored dossier and cache when 'Start New Scan' is clicked", () => {
      saveEvaluatorCache({
        jdInput: "Job post content",
        companyName: "Stripe",
        jobTitle: "Staff Software Engineer",
        jobUrl: "https://stripe.com/jobs/staff-eng",
        source: "LinkedIn",
        dossier: sampleDossier,
      })

      render(<UniversalJDEvaluator />)

      const startNewScanBtn = screen.getByText("Start New Scan")
      fireEvent.click(startNewScanBtn)

      // Should return to the blank form
      expect(screen.getByLabelText(/Job Posting URL, Description, or Feed Post/i)).toBeDefined()
      expect(localStorage.getItem(EVALUATOR_STORAGE_KEY)).toBeNull()
    })

    it("prioritizes explicit initialText / initialUrl over cached draft", () => {
      saveEvaluatorCache({
        jdInput: "Old cached job description",
        companyName: "Old Company",
        jobTitle: "Old Role",
        jobUrl: "https://old.com",
        source: "LinkedIn",
        dossier: sampleDossier,
      })

      // When mounted with new explicit URL (e.g. from a specific card or share target)
      render(<UniversalJDEvaluator initialUrl="https://newcompany.com/job/123" />)

      // Should display the new input in the input form rather than showing the old cached dossier
      const textarea = screen.getByLabelText(/Job Posting URL, Description, or Feed Post/i) as HTMLTextAreaElement
      expect(textarea.value).toBe("https://newcompany.com/job/123")
      expect(screen.queryByText("Restored previously evaluated draft")).toBeNull()
    })

    it("restores draft input text when no dossier was generated yet", () => {
      saveEvaluatorCache({
        jdInput: "Drafting a job description to review later",
        companyName: "",
        jobTitle: "",
        jobUrl: "",
        source: "LinkedIn",
        dossier: null,
      })

      render(<UniversalJDEvaluator />)

      const textarea = screen.getByLabelText(/Job Posting URL, Description, or Feed Post/i) as HTMLTextAreaElement
      expect(textarea.value).toBe("Drafting a job description to review later")
      expect(screen.getByText("Restored draft inputs from your previous session")).toBeDefined()

      const clearDraftBtn = screen.getByText("Clear Draft")
      fireEvent.click(clearDraftBtn)
      expect(textarea.value).toBe("")
      expect(localStorage.getItem(EVALUATOR_STORAGE_KEY)).toBeNull()
    })
  })

  describe("UniversalJDEvaluatorModal Outside-Click Protection", () => {
    it("renders modal open and renders evaluator content", () => {
      useUI.setState({
        evaluatorModal: { open: true },
      })

      render(<UniversalJDEvaluatorModal />)

      const titles = screen.getAllByText("Universal Opportunity Evaluator")
      expect(titles.length).toBeGreaterThanOrEqual(1)
      expect(screen.getByLabelText(/Job Posting URL, Description, or Feed Post/i)).toBeDefined()
    })
  })
})
