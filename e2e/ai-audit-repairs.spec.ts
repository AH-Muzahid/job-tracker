import { test, expect } from "@playwright/test"
import { setupAuthMock, setupAgentStreamMock } from "./fixtures/mock-routes"

test.beforeEach(async ({ page }, testInfo) => {
  await page.addInitScript((theme) => localStorage.setItem("theme", theme), testInfo.project.name === "desktop-light" ? "light" : "dark")
})

test("copilot presents outcomes without raw execution logs", async ({ page }, testInfo) => {
  await setupAuthMock(page)
  await setupAgentStreamMock(page, {
    planSteps: [{ id: "step-1", task: "Internal tool operation", status: "completed", toolName: "getUserProfile" }],
    toolInvocations: [{ toolCallId: "profile", toolName: "getUserProfile", args: {}, result: { success: true } }],
    finalResponse: "Your candidate profile is ready to review. Open your profile to confirm the facts before preparing a resume.",
  })
  await page.goto("/ai-assistant")
  const input = page.getByRole("textbox", { name: "Ask Career Copilot, paste a job description, or instruct action" })
  await expect(input).toBeVisible()
  await input.fill("Show my profile")
  await page.getByRole("button", { name: "Send message", exact: true }).click()
  await expect(page.getByText("Your candidate profile is ready to review.", { exact: false })).toBeVisible()
  await expect(page.getByText("Agent Execution Plan", { exact: false })).toHaveCount(0)
  await expect(page.getByText("Internal tool operation", { exact: true })).toHaveCount(0)
  await expect(page.getByText("profile to confirm the facts", { exact: false })).toBeVisible()
  await expect(page.locator("html")).toHaveClass(testInfo.project.name === "desktop-light" ? /light/ : /dark/)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
  await page.screenshot({ path: `artifacts/ai-audit-2026-10-13/${testInfo.project.name}-copilot.png`, fullPage: true })
})

test("missing evidence is actionable and never presents invented resume score", async ({ page }) => {
  await setupAuthMock(page)
  await setupAgentStreamMock(page)
  await page.route("**/api/agent/run", (route) => route.fulfill({ status: 422, contentType: "application/json", body: JSON.stringify({ error: "Add your resume or verified profile facts before tailoring" }) }))
  await page.goto("/ai-assistant")
  const input = page.getByRole("textbox", { name: "Ask Career Copilot, paste a job description, or instruct action" })
  await expect(input).toBeVisible()
  await input.fill("Tailor my resume for this role")
  await page.getByRole("button", { name: "Send message", exact: true }).click()
  await expect(page.getByText("Add your resume or verified profile facts before tailoring", { exact: false })).toBeVisible()
  await expect(page.getByText("ATS Fit: 92%", { exact: true })).toHaveCount(0)
})
