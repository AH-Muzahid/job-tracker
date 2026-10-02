import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
    setQueryData: vi.fn(),
  })),
  useQuery: vi.fn((opts: { queryKey?: string[] }) => {
    if (opts?.queryKey?.[1] === "sessions") {
      return {
        data: [
          {
            id: "session-1",
            title: "Stripe Senior Backend JD",
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          },
          {
            id: "session-2",
            title: "Mock Interview Prep",
            updatedAt: new Date(Date.now() - 30 * 3600 * 1000).toISOString(),
            createdAt: new Date(Date.now() - 30 * 3600 * 1000).toISOString(),
          },
        ],
        isLoading: false,
        error: null,
      };
    }
    return {
      data: null,
      isLoading: false,
      error: null,
    };
  }),
  useMutation: vi.fn(() => ({
    mutate: vi.fn(),
  })),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/ai-assistant",
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({
    user: { firstName: "Candidate" },
    isSignedIn: true,
    isLoaded: true,
  }),
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
    useAI: () => ({
      activeChatId: "session-1",
      setActiveChatId: vi.fn(),
    }),
  };
});

vi.mock("@/components/ai/WorkspaceContext", () => ({
  useWorkspace: () => ({
    drawerOpen: false,
    setDrawerOpen: vi.fn(),
    setToolInvocations: vi.fn(),
    setPlan: vi.fn(),
    setIsStreaming: vi.fn(),
  }),
  WorkspaceProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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
import ChatHistorySidebar from "@/components/ai/ChatHistorySidebar";
import AIAssistantPage from "@/app/(app)/ai-assistant/page";

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

  it("strictly enforces accessibility: textarea contains aria-label and buttons have accessible titles", () => {
    const html = renderToString(<AIChat sessionId={null} isSidebar={false} />);
    expect(html).toContain('aria-label="Ask Career Copilot, paste a job description, or instruct action"');
    expect(html).toContain('aria-label="Add context"');
    expect(html).toContain('aria-label="Send message"');
  });

  it("renders ChatHistorySidebar with New Chat button, search bar, and relative date groupings", () => {
    const html = renderToString(
      <ChatHistorySidebar
        activeChatId="session-1"
        onSelectChat={vi.fn()}
        onNewChat={vi.fn()}
        isOpen={true}
        onToggleOpen={vi.fn()}
      />
    );
    expect(html).toContain("New Chat");
    expect(html).toContain("Search conversations...");
    expect(html).toContain("Today");
    expect(html).toContain("Yesterday");
    expect(html).toContain("Stripe Senior Backend JD");
    expect(html).toContain("Mock Interview Prep");
  });

  it("renders AIAssistantPage with 100dvh viewport and wires ChatHistorySidebar", () => {
    const html = renderToString(<AIAssistantPage />);
    expect(html).toContain("h-dvh");
    expect(html).toContain("aria-label=\"Chat History\"");
  });

  it("opens Delete Conversation confirmation modal instead of calling browser confirm alert", () => {
    const confirmSpy = vi.spyOn(window, "confirm");
    render(
      <ChatHistorySidebar
        activeChatId="session-1"
        onSelectChat={vi.fn()}
        onNewChat={vi.fn()}
        isOpen={true}
        onToggleOpen={vi.fn()}
      />
    );
    const deleteButtons = screen.getAllByLabelText("Delete conversation");
    expect(deleteButtons.length).toBeGreaterThan(0);
    fireEvent.click(deleteButtons[0]);

    // Ensure native confirm() was not called
    expect(confirmSpy).not.toHaveBeenCalled();

    // Ensure dialog modal is presented
    expect(screen.getByText("Delete Conversation")).toBeTruthy();
    expect(screen.getByText(/Are you sure you want to delete/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Delete" })).toBeTruthy();

    confirmSpy.mockRestore();
  });
});
