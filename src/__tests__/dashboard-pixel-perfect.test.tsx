import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
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

  it("renders DashboardKpis with exact mockup numbers when data is empty or defaults", () => {
    const html = renderToString(<DashboardKpis />);
    expect(html).toContain("Opportunities Found");
    expect(html).toContain("28");
    expect(html).toContain("Applications");
    expect(html).toContain("12");
    expect(html).toContain("Interviews");
    expect(html).toContain("3");
    expect(html).toContain("Offers");
    expect(html).toContain("1");
  });

  it("renders RecommendedOpportunities with Google, Stripe, and Notion", () => {
    const html = renderToString(<RecommendedOpportunities />);
    expect(html).toContain("Google");
    expect(html).toContain("Product Manager");
    expect(html).toContain("Stripe");
    expect(html).toContain("Software Engineer");
    expect(html).toContain("Notion");
    expect(html).toContain("Product Designer");
    expect(html).toContain("Package &amp; Stage");
    expect(html).toContain("View Details");
  });

  it("renders RecentApplicationsList with 4 rows and correct status badges", () => {
    const html = renderToString(<RecentApplicationsList />);
    expect(html).toContain("Stripe");
    expect(html).toContain("Application Sent");
    expect(html).toContain("Linear");
    expect(html).toContain("In Review");
    expect(html).toContain("Anthropic");
    expect(html).toContain("Interviewing");
    expect(html).toContain("Figma");
    expect(html).toContain("Staged");
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
