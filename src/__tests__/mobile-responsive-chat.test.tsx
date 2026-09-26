import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";

// Mock Clerk auth & navigation
vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({
    user: { firstName: "Alex" },
    isSignedIn: true,
    isLoaded: true,
  }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
  })),
  useQuery: vi.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
  })),
}));

// Mock UI store
vi.mock("@/lib/store", () => {
  const uiState = {
    searchOpen: false,
    setSearchOpen: vi.fn(),
    evaluatorModal: false,
    setEvaluatorModal: vi.fn(),
    aiSidebarOpen: true,
    setAiSidebarOpen: vi.fn(),
  };
  return {
    useUI: (selector?: (s: typeof uiState) => unknown) =>
      typeof selector === "function" ? selector(uiState) : uiState,
  };
});

// Mock notifications & user nav
vi.mock("@/components/notifications/NotificationCenter", () => ({
  NotificationCenter: () => <div data-testid="notification-center" />,
}));

vi.mock("@/components/nav-user", () => ({
  NavUser: () => <div data-testid="nav-user" />,
}));

vi.mock("@/components/custom-sidebar-trigger", () => ({
  CustomSidebarTrigger: () => <div data-testid="custom-sidebar-trigger" />,
}));

vi.mock("@/components/ai/AIChat", () => ({
  default: () => <div data-testid="ai-chat" />,
}));

import { AppHeader } from "@/components/app-header";
import GlobalAISidebar from "@/components/ai/GlobalAISidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";

describe("Mobile Responsiveness & AI Chat Architecture Verification", () => {
  describe("AppHeader Mobile Optimization", () => {
    it("renders CareerTrack brand logo on mobile matching prototype Screen 1", () => {
      const html = renderToString(<AppHeader />);
      expect(html).toContain("CareerTrack");
      expect(html).toContain("aria-label=\"CareerTrack Home\"");
    });

    it("renders dedicated mobile Search and Copilot trigger buttons for viewport < md", () => {
      const html = renderToString(<AppHeader />);
      expect(html).toContain("aria-label=\"Search\"");
      expect(html).toContain("aria-label=\"Open Career Copilot\"");
      expect(html).toContain("md:hidden");
    });

    it("does not render mobile sidebar trigger in mobile header", () => {
      const html = renderToString(<AppHeader />);
      // CustomSidebarTrigger must be inside desktop container only
      expect(html).not.toContain("md:hidden shrink-0\"><div data-testid=\"custom-sidebar-trigger\"");
    });

    it("strictly uses semantic CSS tokens and contains zero hardcoded slate colors", () => {
      const html = renderToString(<AppHeader />);
      expect(html).not.toContain("border-slate-100");
      expect(html).not.toContain("border-slate-800");
      expect(html).not.toContain("bg-[#f1f5f9]");
      expect(html).not.toContain("text-slate-400");
      expect(html).not.toContain("text-slate-500");
      expect(html).toContain("border-border");
      expect(html).toContain("bg-background");
    });
  });

  describe("GlobalAISidebar Viewport Pinned Architecture", () => {
    it("locks height to viewport (h-dvh max-h-dvh) and sticky top-0 on desktop", () => {
      const html = renderToString(<GlobalAISidebar />);
      expect(html).toContain("h-dvh max-h-dvh");
      expect(html).toContain("xl:sticky xl:top-0");
      expect(html).toContain("xl:self-start");
      // Verify it does not stretch with flex layout
      expect(html).not.toContain("xl:relative xl:z-0 xl:translate-x-0");
    });

    it("renders mobile drawer with backdrop and close affordances", () => {
      const html = renderToString(<GlobalAISidebar />);
      // Backdrop for mobile
      expect(html).toContain("fixed inset-0 z-40");
      expect(html).toContain("xl:hidden");
      // Career Copilot title
      expect(html).toContain("Career Copilot");
      expect(html).toContain("aria-label=\"Close Copilot\"");
    });
  });

  describe("DashboardHeader Mobile Actions", () => {
    it("renders + Quick Intake button without hiding it on mobile", () => {
      const html = renderToString(<DashboardHeader onAnalyzeJD={() => {}} />);
      expect(html).toContain("+ Quick Intake");
      // Must not be hidden on mobile
      expect(html).not.toContain("hidden sm:flex items-center gap-2");
      expect(html).toContain("flex items-center gap-2 shrink-0");
    });
  });
});
