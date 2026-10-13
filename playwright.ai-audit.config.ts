import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e", testMatch: "ai-audit-repairs.spec.ts", workers: 1, retries: 0,
  timeout: 60000, reporter: [["list"]],
  use: { baseURL: "http://localhost:3110", screenshot: "only-on-failure", trace: "retain-on-failure" },
  projects: [
    { name: "desktop-light", use: { ...devices["Desktop Chrome"], colorScheme: "light" } },
    { name: "mobile-dark", use: { ...devices["Pixel 7"], defaultBrowserType: "chromium", colorScheme: "dark" } },
  ],
  webServer: { command: "npx next dev --port 3110", url: "http://localhost:3110", env: { PLAYWRIGHT_TEST: "true" }, reuseExistingServer: false, timeout: 120000 },
})
