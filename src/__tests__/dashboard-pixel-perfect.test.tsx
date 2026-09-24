import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
  })),
}));

import { CompanyBrandLogo } from "@/components/CompanyBrandLogo";
import { DashboardKpis } from "@/components/dashboard/DashboardKpis";
import { RecommendedOpportunities } from "@/components/dashboard/RecommendedOpportunities";
import { RecentApplicationsList } from "@/components/dashboard/RecentApplicationsList";
import { UpcomingInterviewsList } from "@/components/dashboard/UpcomingInterviewsList";
import { AICareerCopilotCard } from "@/components/dashboard/AICareerCopilotCard";
import { TodayTasksCard } from "@/components/dashboard/TodayTasksCard";
import { StayConsistentCard } from "@/components/dashboard/StayConsistentCard";

describe("Pixel-Perfect Dashboard Components & Strict Constraints", () => {
  it("renders authentic CompanyBrandLogo for all target brands without error", () => {
    const brands = ["Google", "Stripe", "Notion", "Anthropic", "Linear", "Figma", "UnknownCo"];
    for (const brand of brands) {
      const html = renderToString(<CompanyBrandLogo company={brand} />);
      expect(html).toBeTruthy();
    }
  });

  it("renders DashboardKpis with zeros when data is empty or defaults (no fabricated metrics)", () => {
    const html = renderToString(<DashboardKpis />);
    expect(html).toContain("Opportunities");
    expect(html).toContain("Applications");
    expect(html).toContain("Interviews");
    expect(html).toContain("Offers");
    expect(html).not.toContain("28");
    expect(html).not.toContain("1 Received");
    expect(html).toContain("Keep going!");
  });

  it("renders RecommendedOpportunities empty state without reference jobs", () => {
    const html = renderToString(<RecommendedOpportunities />);
    expect(html).not.toContain("Google");
    expect(html).not.toContain("Notion");
    expect(html).not.toContain("Stripe");
    expect(html).toContain("No opportunities yet");
  });

  it("renders RecommendedOpportunities with real opportunity data when provided", () => {
    const html = renderToString(
      <RecommendedOpportunities
        opportunities={[
          {
            id: "real-1",
            title: "Staff Engineer",
            company: "Acme Corp",
            location: "Remote",
            fitScore: 91,
          },
        ]}
      />
    );
    expect(html).toContain("Acme Corp");
    expect(html).toContain("Package &amp; Stage");
    expect(html).toContain("View Details");
    expect(html).not.toContain("Notion");
  });

  it("renders RecentApplicationsList empty state without reference applications", () => {
    const html = renderToString(<RecentApplicationsList />);
    expect(html).not.toContain("Stripe");
    expect(html).not.toContain("Linear");
    expect(html).not.toContain("Anthropic");
    expect(html).not.toContain("Figma");
    expect(html).toContain("No applications yet");
  });

  it("renders UpcomingInterviewsList with Anthropic, Google, and Stripe with prep buttons", () => {
    const html = renderToString(<UpcomingInterviewsList />);
    expect(html).toContain("Anthropic");
    expect(html).toContain("Google");
    expect(html).toContain("Stripe");
    expect(html).toContain("Prep");
  });

  it("renders AICareerCopilotCard without any sparkles", () => {
    const html = renderToString(<AICareerCopilotCard />);
    expect(html).toContain("Your AI Career Copilot");
    expect(html).toContain("Find Opportunities");
    expect(html).toContain("Analyze a job description");
    expect(html).toContain("Improve my resume");
    expect(html).toContain("Generate a cover letter");
    expect(html).toContain("Prepare for an interview");
    expect(html.toLowerCase()).not.toContain("sparkle");
  });

  it("renders TodayTasksCard with completed Stripe application", () => {
    const html = renderToString(<TodayTasksCard />);
    expect(html).toContain("Today&#x27;s Tasks");
    expect(html).toContain("Review 3 new opportunities");
    expect(html).toContain("Complete application for Stripe");
    expect(html).toContain("View all tasks");
  });

  it("renders StayConsistentCard with 7 weekdays", () => {
    const html = renderToString(<StayConsistentCard />);
    expect(html).toContain("Stay consistent");
    expect(html).toContain("Mon");
    expect(html).toContain("Tue");
    expect(html).toContain("Wed");
    expect(html).toContain("Thu");
    expect(html).toContain("Fri");
    expect(html).toContain("Sat");
    expect(html).toContain("Sun");
  });

  it("defines exact sidebar nav structure matching the reference screenshot", async () => {
    const { navGroups } = await import("@/components/app-shared");
    expect(navGroups).toHaveLength(2);
    
    // Group 1: Main navigation
    const mainItems = navGroups[0].items.map((i) => i.title);
    expect(mainItems).toEqual(["Dashboard", "Opportunities", "Applications", "Interviews"]);

    // Group 2: TOOLS
    expect(navGroups[1].label).toBe("TOOLS");
    const toolItems = navGroups[1].items.map((i) => i.title);
    expect(toolItems).toEqual(["Career Profile", "Settings"]);
  });
});
