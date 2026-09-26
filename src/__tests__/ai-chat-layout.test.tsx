import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
  })),
  useQuery: vi.fn(() => ({
    data: [],
    isLoading: false,
    error: null,
  })),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/ai-assistant",
  useParams: () => ({}),
}));

vi.mock("@/lib/store", () => {
  const uiState = {
    aiSidebarOpen: true,
    pendingPrompt: null,
    setPendingPrompt: vi.fn(),
  };
  return {
    useUI: (selector?: (s: typeof uiState) => unknown) =>
      typeof selector === "function" ? selector(uiState) : uiState,
  };
});

vi.mock("@/components/ai/WorkspaceContext", () => ({
  useWorkspace: () => ({
    drawerOpen: false,
    setDrawerOpen: vi.fn(),
  }),
}));

vi.mock("@/components/ai/WorkspaceDrawer", () => ({
  default: () => <div data-testid="workspace-drawer" />,
}));

vi.mock("@/components/ai/ModelSelector", () => ({
  default: (props: { compact?: boolean }) => (
    <div data-testid="model-selector" data-compact={props.compact ? "true" : "false"}>
      ModelSelector
    </div>
  ),
}));

import AIChat from "@/components/ai/AIChat";

describe("AIChat Layout & Architecture Verification", () => {
  it("renders single-column starter list in sidebar mode without squishing cards", () => {
    const html = renderToString(<AIChat sessionId={null} isSidebar={true} />);
    // In sidebar mode, it should display the compact header and starter list
    expect(html).toContain("How can I help you today?");
    expect(html).toContain("Career Copilot");
    // Ensure it does NOT use the old sm:grid-cols-2 squish inside the sidebar
    expect(html).not.toContain("grid grid-cols-1 sm:grid-cols-2");
    // Model selector in sidebar mode should have compact=true
    expect(html).toContain('data-compact="true"');
  });

  it("renders spacious 2-column grid in fullscreen mode", () => {
    const html = renderToString(<AIChat sessionId={null} isSidebar={false} />);
    expect(html).toContain("CareerTrack Copilot");
    expect(html).toContain("Your autonomous career accelerator");
    expect(html).toContain("grid-cols-1 md:grid-cols-2");
    // Model selector in fullscreen mode should have compact=false
    expect(html).toContain('data-compact="false"');
  });

  it("renders the persistent input dock as a solid flex footer, never an absolute floating overlay", () => {
    const html = renderToString(<AIChat sessionId={null} isSidebar={true} />);
    // Should contain persistent flex footer
    expect(html).toContain("shrink-0 border-t border-border bg-background");
    // Must NOT contain the old overlapping absolute floating dock
    expect(html).not.toContain("absolute bottom-3 left-0 right-0 px-4");
  });
});
