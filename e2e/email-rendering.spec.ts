import { test, expect } from "@playwright/test"
import { formatDailyOpportunityDigestHtml } from "../src/lib/email"

for (const colorScheme of ["light", "dark"] as const) {
  for (const width of [375, 1280]) {
    test(`daily email reads correctly at ${width}px in ${colorScheme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.emulateMedia({ colorScheme })
      await page.setContent(formatDailyOpportunityDigestHtml({
        candidateName: "AH Muzahid", briefingText: "- Review your applications and follow up with recruiters.",
        activeApplicationsCount: 6, staleApplicationsCount: 5,
        opportunities: [{ id: "job-1", title: "Software Engineer", company: "Field Nation", location: "Dhaka, Bangladesh", matchScore: 99, salary: "Range", url: "https://example.com/careers" }],
      }))
      await expect(page.getByText("Today's Priorities")).toBeVisible()
      await expect(page.getByRole("link", { name: "Review Opportunity" })).toHaveAttribute("href", "https://example.com/careers")
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
      const textColor = await page.getByRole("heading", { name: "Software Engineer" }).evaluate((node) => getComputedStyle(node).color)
      expect(textColor).toBe(colorScheme === "dark" ? "rgb(249, 250, 251)" : "rgb(15, 23, 42)")
      await page.screenshot({ path: `artifacts/email/digest-${width}-${colorScheme}.png`, fullPage: true })
    })
  }
}
