import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import fs from "node:fs";
import path from "node:path";
import { DashboardKpis } from "@/components/dashboard/DashboardKpis";
import { RecommendedOpportunities } from "@/components/dashboard/RecommendedOpportunities";
import { RecentApplicationsList } from "@/components/dashboard/RecentApplicationsList";
import { DailyBriefingCard } from "@/components/dashboard/DailyBriefingCard";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
  })),
}));

vi.mock("@/lib/api", () => ({
  useDailyBriefing: vi.fn(),
}));

describe("Dashboard review fixes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("DashboardKpis real metrics only", () => {
    it("shows zeros when no data prop is provided (no fabricated 28/12/3)", () => {
      const html = renderToString(<DashboardKpis />);
      expect(html).not.toContain("28");
      expect(html).not.toContain("1 Received");
      expect(html).toContain("Opportunities");
      expect(html).toContain("Applications");
      expect(html).toContain("Interviews");
      expect(html).toContain("Offers");
      expect(html).toContain("Keep going!");
    });

    it("shows real zeros when data is provided with zero counts", () => {
      const html = renderToString(
        <DashboardKpis
          data={{
            opportunities: { count: 0, delta: null, newThisWeek: 0 },
            applications: { count: 0, delta: null, inProgress: 0 },
            interviews: { count: 0, delta: null, thisWeek: 0 },
            offers: { count: 0, delta: null },
          }}
        />
      );
      expect(html).toContain("Keep going!");
      expect(html).not.toContain("1 Received");
    });
  });

  describe("RecommendedOpportunities no fabricated padding", () => {
    it("renders empty state instead of Google/Stripe/Notion reference jobs", () => {
      const html = renderToString(<RecommendedOpportunities opportunities={[]} />);
      expect(html).not.toContain("Google");
      expect(html).not.toContain("Notion");
      expect(html).toContain("No opportunities yet");
    });

    it("does not pad real API results with reference jobs", () => {
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
      expect(html).not.toContain("Notion");
      expect(html).not.toContain("Google");
    });
  });

  describe("RecentApplicationsList no fabricated rows", () => {
    it("renders empty state instead of Stripe/Linear/Anthropic/Figma", () => {
      const html = renderToString(<RecentApplicationsList applications={[]} />);
      expect(html).not.toContain("Stripe");
      expect(html).not.toContain("Linear");
      expect(html).not.toContain("Anthropic");
      expect(html).not.toContain("Figma");
      expect(html).toMatch(/No applications|applications yet|Get started/i);
    });
  });

  describe("DailyBriefingCard no fabricated priorities", () => {
    it("does not show Over99/11-dormant fallback when API returns few priorities", async () => {
      const { useDailyBriefing } = await import("@/lib/api");
      vi.mocked(useDailyBriefing).mockReturnValue({
        data: {
          generatedAt: new Date().toISOString(),
          metrics: {
            stagedCount: 0,
            followUpsDueCount: 0,
            upcomingInterviewsCount: 0,
            activeApplicationsCount: 0,
          },
          priorityActions: [
            {
              id: "discover-opportunities",
              type: "DISCOVER_JOBS",
              title: "Source new roles",
              description: "Explore curated roles",
              count: 1,
              href: "/discovery",
              urgency: "low",
            },
          ],
          executiveSummary: [],
        },
        isLoading: false,
        error: null,
        refresh: vi.fn(),
      } as any);

      const html = renderToString(<DailyBriefingCard />);
      expect(html).not.toContain("Over99");
      expect(html).not.toContain("11 dormant applications");
      expect(html).toContain("Source new roles");
    });

    it("shows empty prompt when priorityActions is empty", async () => {
      const { useDailyBriefing } = await import("@/lib/api");
      vi.mocked(useDailyBriefing).mockReturnValue({
        data: {
          generatedAt: new Date().toISOString(),
          metrics: {
            stagedCount: 0,
            followUpsDueCount: 0,
            upcomingInterviewsCount: 0,
            activeApplicationsCount: 0,
          },
          priorityActions: [],
          executiveSummary: [],
        },
        isLoading: false,
        error: null,
        refresh: vi.fn(),
      } as any);

      const html = renderToString(<DailyBriefingCard />);
      expect(html).not.toContain("Over99");
      expect(html).not.toContain("11 dormant applications");
      expect(html).not.toContain("Source 2 new senior frontend roles");
      expect(html).toMatch(/No priorities|Explore Discovery|nothing urgent/i);
    });

    it("does not mis-parse summary lines with an early colon", async () => {
      const { useDailyBriefing } = await import("@/lib/api");
      vi.mocked(useDailyBriefing).mockReturnValue({
        data: {
          generatedAt: new Date().toISOString(),
          metrics: {
            stagedCount: 0,
            followUpsDueCount: 0,
            upcomingInterviewsCount: 0,
            activeApplicationsCount: 1,
          },
          priorityActions: [],
          executiveSummary: [
            "Note: this summary line has an early colon that must not split the headline incorrectly from the body content.",
          ],
        },
        isLoading: false,
        error: null,
        refresh: vi.fn(),
      } as any);

      const html = renderToString(<DailyBriefingCard />);
      expect(html).not.toContain("Note.");
      expect(html).toContain("Note: this summary line has an early colon");
    });

    it("still splits label-style summaries on a later colon", async () => {
      const { useDailyBriefing } = await import("@/lib/api");
      vi.mocked(useDailyBriefing).mockReturnValue({
        data: {
          generatedAt: new Date().toISOString(),
          metrics: {
            stagedCount: 0,
            followUpsDueCount: 2,
            upcomingInterviewsCount: 0,
            activeApplicationsCount: 5,
          },
          priorityActions: [],
          executiveSummary: [
            "Your interview pipeline is slowing down: Apply the follow-up playbook today.",
          ],
        },
        isLoading: false,
        error: null,
        refresh: vi.fn(),
      } as any);

      const html = renderToString(<DailyBriefingCard />);
      expect(html).toContain("Your interview pipeline is slowing down.");
      expect(html).toContain("Apply the follow-up playbook today.");
    });
  });

  describe("DailyBriefingCard loading skeleton layout", () => {
    it("uses the same 2-column grid as the live layout (not grid-cols-12)", () => {
      const source = fs.readFileSync(
        path.resolve(process.cwd(), "src/components/dashboard/DailyBriefingCard.tsx"),
        "utf-8"
      );
      const skeletonSection = source.slice(0, source.indexOf("if (error"));
      expect(skeletonSection).toContain("lg:grid-cols-2");
      expect(skeletonSection).not.toContain("lg:grid-cols-12");
      expect(skeletonSection).not.toContain("lg:col-span-7");
      expect(skeletonSection).not.toContain("lg:col-span-5");
    });
  });
});
