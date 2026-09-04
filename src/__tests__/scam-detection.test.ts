import { describe, it, expect } from "vitest"
import { evaluateJobScamRisk } from "@/lib/discovery/matching"

describe("Job Discovery Scam & Fraud Detection Engine", () => {
  it("passes authentic tech company job listings with minimal risk score", () => {
    const legitimateJob = {
      title: "Senior Full Stack Engineer",
      company: "Vercel",
      url: "https://vercel.com/careers/senior-fullstack",
      description: "Join our core team building Next.js and frontend infrastructure. Experience with React, Node.js, and TypeScript required.",
      salaryMin: 140000,
      salaryMax: 190000,
      location: "Remote",
    }

    const result = evaluateJobScamRisk(legitimateJob)
    expect(result.scamScore).toBeLessThan(0.25)
    expect(result.isSuspicious).toBe(false)
    expect(result.flags).toHaveLength(0)
  })

  it("detects upfront financial fee and wire transfer scams", () => {
    const scamJob = {
      title: "Data Entry Clerk",
      company: "Global Logistics Ltd",
      url: "https://globallogistics.example.com/apply",
      description: "Immediate start! Applicants must pay a $50 application fee for background screening and wire transfer $200 for equipment deposit.",
      location: "Remote",
    }

    const result = evaluateJobScamRisk(scamJob)
    expect(result.scamScore).toBeGreaterThanOrEqual(0.6)
    expect(result.isSuspicious).toBe(true)
    expect(result.flags).toContain("demands_upfront_payment_or_fee")
  })

  it("flags anonymous Telegram and WhatsApp-only hiring channels", () => {
    const telegramJob = {
      title: "Remote Web Assistant",
      company: "QuickHire Tech",
      url: "https://quickhire.example.com",
      description: "Urgent hiring! Do not apply via email. Contact on Telegram: @quickhire_agent or DM on Telegram for interview.",
      location: "Remote",
    }

    const result = evaluateJobScamRisk(telegramJob)
    expect(result.flags).toContain("off_platform_anonymous_contact")
    expect(result.scamScore).toBeGreaterThanOrEqual(0.4)
  })

  it("flags shortened phishing URLs (bit.ly, tinyurl)", () => {
    const phishingJob = {
      title: "Software Developer",
      company: "Apex Innovations",
      url: "https://bit.ly/3xY7z99",
      description: "Click the link to fill your information and submit your CV.",
      location: "Remote",
    }

    const result = evaluateJobScamRisk(phishingJob)
    expect(result.flags).toContain("shortened_phishing_url")
    expect(result.scamScore).toBeGreaterThanOrEqual(0.3)
  })

  it("flags absurd salary outliers for early-career / junior roles", () => {
    const outlierJob = {
      title: "Junior Frontend Developer",
      company: "CloudStartup",
      url: "https://cloudstartup.example.com/jobs/1",
      description: "Entry-level role for fresh graduates. No experience necessary.",
      salaryMin: 320000,
      salaryMax: 450000,
      location: "Remote",
    }

    const result = evaluateJobScamRisk(outlierJob)
    expect(result.flags).toContain("absurd_salary_outlier_junior")
    expect(result.scamScore).toBeGreaterThanOrEqual(0.4)
  })

  it("flags missing or generic unverified company names", () => {
    const noCompanyJob = {
      title: "React Developer",
      company: "Confidential",
      url: "https://jobs.example.com/apply",
      description: "Developer needed for proprietary system.",
      location: "Remote",
    }

    const result = evaluateJobScamRisk(noCompanyJob)
    expect(result.flags).toContain("generic_unverified_company")
  })
})
