import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("CAG-01: Career Operating System Dashboard & Metrics", () => {
  it("verifies legacy SaaS billing artifacts are completely eradicated", () => {
    const componentsDir = path.resolve(process.cwd(), "src/components");
    const legacyFiles = [
      "billing-health.tsx",
      "dashboard-invoices.tsx",
      "net-revenue-chart.tsx",
      "channel-sales-chart.tsx",
    ];

    for (const file of legacyFiles) {
      const fullPath = path.join(componentsDir, file);
      expect(fs.existsSync(fullPath)).toBe(false);
    }
  });

  it("verifies new Career Operating System dashboard components exist", () => {
    const dashboardDir = path.resolve(process.cwd(), "src/components/dashboard");
    const newComponents = [
      "DashboardHeader.tsx",
      "DashboardKpis.tsx",
      "RecommendedOpportunities.tsx",
      "RecentApplicationsList.tsx",
      "UpcomingInterviewsList.tsx",
      "AICareerCopilotCard.tsx",
      "TodayTasksCard.tsx",
      "StayConsistentCard.tsx",
    ];

    for (const comp of newComponents) {
      const fullPath = path.join(dashboardDir, comp);
      expect(fs.existsSync(fullPath)).toBe(true);
    }
  });

  it("verifies STRICT PROHIBITION on Sparkles icon across all new dashboard components", () => {
    const dashboardDir = path.resolve(process.cwd(), "src/components/dashboard");
    const files = fs.readdirSync(dashboardDir).filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"));

    for (const file of files) {
      const content = fs.readFileSync(path.join(dashboardDir, file), "utf-8");
      expect(content).not.toContain("Sparkles");
      expect(content).not.toContain("sparkles");
    }
  });

  it("verifies dashboard.tsx does not import any billing or invoice references", () => {
    const dashboardPath = path.resolve(process.cwd(), "src/components/dashboard.tsx");
    const content = fs.readFileSync(dashboardPath, "utf-8");

    expect(content).not.toContain("billing-health");
    expect(content).not.toContain("dashboard-invoices");
    expect(content).not.toContain("net-revenue-chart");
    expect(content).not.toContain("channel-sales-chart");
    expect(content).not.toContain("NetRevenueChart");
    expect(content).not.toContain("ChannelSalesChart");
    expect(content).not.toContain("BillingHealth");
    expect(content).not.toContain("DashboardInvoices");
  });

  it("verifies navigation groups align with 4 primary pillars (Dashboard, Opportunities, Applications, Interviews)", () => {
    const appSharedPath = path.resolve(process.cwd(), "src/components/app-shared.tsx");
    const content = fs.readFileSync(appSharedPath, "utf-8");

    expect(content).toContain('"Dashboard"');
    expect(content).toContain('"Opportunities"');
    expect(content).toContain('"Applications"');
    expect(content).toContain('"Interviews"');
    expect(content).toContain('"Career Profile"');
    expect(content).toContain('"Settings"');
  });

  it("verifies stats API route supports rich career metrics, KPIs, and recommendations", () => {
    const statsRoutePath = path.resolve(process.cwd(), "src/app/api/dashboard/stats/route.ts");
    const content = fs.readFileSync(statsRoutePath, "utf-8");

    expect(content).toContain("recommendedOpportunities");
    expect(content).toContain("upcomingInterviews");
    expect(content).toContain("todayTasks");
    expect(content).toContain("weeklyActivity");
    expect(content).toContain("weeklyVelocity");
    expect(content).toContain("kpi");
    expect(content).toContain("opportunities");
    expect(content).toContain("applications");
    expect(content).toContain("interviews");
    expect(content).toContain("offers");
  });
});
