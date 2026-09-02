import { test, expect } from "@playwright/test"
import {
  setupAuthMock,
  setupAgentStreamMock,
  setupDiscoveryMock,
  setupResumeTailoringMock,
} from "./fixtures/mock-routes"

test.describe("Phase 5.2: Agentic E2E Missions Suite", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthMock(page)
  })

  test("Mission 1.1: Multi-Step Interactive Agent Chat with Live Planner & Tool Invocations", async ({ page }) => {
    await setupAgentStreamMock(page, {
      planSteps: [
        { id: "step-1", task: "Analyze market vacancies for Go & PostgreSQL", status: "completed", toolName: "searchExternalJobs" },
        { id: "step-2", task: "Query pgvector candidate memories & skill graph", status: "completed", toolName: "searchUserMemories" },
        { id: "step-3", task: "Draft high-conversion recruiter outreach email", status: "completed", toolName: "draftOutreachEmail" },
      ],
      finalResponse: "I have mapped out 3 high-probability Go opportunities and drafted a tailored cold outreach email.",
    })

    await page.goto("/ai-assistant", { waitUntil: "domcontentloaded" })

    // Find textarea input and submit prompt
    const textarea = page.locator("textarea").first()
    await textarea.waitFor({ state: "visible", timeout: 20000 })
    await textarea.click()
    await textarea.fill("Find Senior Go roles and draft an outreach email for Stripe")

    const sendBtn = page.locator("button:has(svg.lucide-send)").first()
    await sendBtn.waitFor({ state: "visible" })
    await sendBtn.click()

    // 1. Verify User Prompt appears in conversation
    await expect(
      page.locator("text=Find Senior Go roles and draft an outreach email for Stripe")
    ).toBeVisible({ timeout: 10000 })

    // 2. Verify Multi-Step Agent Execution Plan rendered
    await expect(page.locator("text=Agent Execution Plan")).toBeVisible({ timeout: 10000 })
    await expect(page.locator("text=Analyze market vacancies for Go & PostgreSQL")).toBeVisible()

    // 3. Verify Final AI Assistant response message rendered
    await expect(
      page.locator("text=I have mapped out 3 high-probability Go opportunities")
    ).toBeVisible({ timeout: 10000 })
  })

  test("Mission 1.2: Human-in-the-Loop (HITL) Action Interruption and Confirmation Flow", async ({ page }) => {
    await setupAgentStreamMock(page, {
      includeInterrupt: true,
    })

    await page.goto("/ai-assistant", { waitUntil: "domcontentloaded" })

    const textarea = page.locator("textarea").first()
    await textarea.waitFor({ state: "visible", timeout: 20000 })
    await textarea.click()
    await textarea.fill("Send outreach email to recruiter at Stripe")

    const sendBtn = page.locator("button:has(svg.lucide-send)").first()
    await sendBtn.waitFor({ state: "visible" })
    await sendBtn.click()

    // 1. Verify HITL Form rendered due to sensitive action interrupt
    await expect(
      page.locator("text=Action Confirmation Required").or(page.locator("text=Please confirm sending the outreach email"))
    ).toBeVisible({ timeout: 10000 })

    // 2. Click "Confirm Action" button to resume LangGraph thread
    const confirmBtn = page.locator("button:has-text('Confirm Action')")
    await expect(confirmBtn).toBeVisible()
    await confirmBtn.click()

    // 3. Verify resumed response appears
    await expect(
      page.locator("text=The outreach email has been safely dispatched via Resend")
    ).toBeVisible({ timeout: 10000 })
  })

  test("Mission 2: Multi-Board Job Discovery Search & 1-Click Pipeline Ingestion", async ({ page }) => {
    await setupDiscoveryMock(page)

    await page.goto("/discovery", { waitUntil: "domcontentloaded" })

    // 1. Verify Autonomous Job Discovery Hub header
    await expect(page.locator("text=Autonomous Job Discovery Hub")).toBeVisible({ timeout: 20000 })

    // 2. Verify multi-board cards from RemoteOK and Arbeitnow appear
    await expect(page.locator("text=Senior Full Stack Engineer (TypeScript / Next.js)")).toBeVisible({ timeout: 10000 })
    await expect(page.locator("text=Backend Go Developer (Distributed Systems)")).toBeVisible()
    await expect(page.locator("text=94% Match").first()).toBeVisible()

    // 3. Click "Save to Tracker" on the first opportunity
    const saveButton = page.locator("button:has-text('Save to Tracker')").first()
    await expect(saveButton).toBeVisible()
    await saveButton.click()

    // 4. Verify button toggles to Saved state
    await expect(page.locator("button:has-text('Saved')").first()).toBeVisible({ timeout: 5000 })
  })

  test("Mission 3: ATS Resume Tailoring & Vector PDF Download Generation", async ({ page }) => {
    await setupResumeTailoringMock(page)

    await page.goto("/resumes", { waitUntil: "domcontentloaded" })

    // 1. Click "Tailor for a Job" button to open modal
    const tailorLaunchBtn = page.locator("button:has-text('Tailor for a Job')").first()
    await expect(tailorLaunchBtn).toBeVisible({ timeout: 20000 })
    await tailorLaunchBtn.click()

    // 2. Fill in target job details and job description
    await expect(page.locator("text=1-Click ATS Tailored Resume Builder")).toBeVisible({ timeout: 10000 })

    const companyInput = page.locator("input[placeholder*='Stripe']").first()
    await companyInput.waitFor({ state: "visible" })
    await companyInput.fill("Stripe")

    const jdTextarea = page.locator("textarea[placeholder*='Paste the full job description']").first()
    await jdTextarea.waitFor({ state: "visible" })
    await jdTextarea.fill("We are seeking a Senior Backend Go Engineer with PostgreSQL and distributed systems expertise to scale payment processing.")

    // 3. Click generate tailor button
    const generateBtn = page.locator("button:has-text('Generate Tailored Resume')").first()
    await expect(generateBtn).toBeEnabled()
    await generateBtn.click()

    // 4. Verify ATS Preview renders with Match Score and STAR bullet points
    await expect(page.locator("text=94% ATS Match").first()).toBeVisible({ timeout: 10000 })
    await expect(page.locator("text=Architected real-time transaction pipeline in Go")).toBeVisible()

    // 5. Intercept PDF Download response
    const downloadPromise = page.waitForResponse((response) =>
      response.url().includes("/api/resumes/download/preview") && response.status() === 200
    )

    const downloadPdfBtn = page.locator("button:has-text('Download PDF')")
    await expect(downloadPdfBtn).toBeVisible()
    await downloadPdfBtn.click()

    const downloadResponse = await downloadPromise
    expect(downloadResponse.status()).toBe(200)
    expect(downloadResponse.headers()["content-type"]).toContain("application/pdf")
  })
})
