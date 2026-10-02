import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { createResponderNode } from "@/lib/ai/graph/nodes/responder";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { navGroups } from "@/components/app-shared";
import { NavUser } from "@/components/nav-user";
import { AppHeader } from "@/components/app-header";
import GlobalAISidebar from "@/components/ai/GlobalAISidebar";

// Mock Clerk auth
vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({
    user: {
      fullName: "Tanvir Ahmed",
      primaryEmailAddress: { emailAddress: "tanvir@example.com" },
      imageUrl: "/avatars/tanvir.png",
    },
    isSignedIn: true,
    isLoaded: true,
  }),
  useClerk: () => ({
    signOut: vi.fn(),
  }),
}));

// Mock navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
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

vi.mock("@/components/ai/AIChat", () => ({
  default: () => <div data-testid="ai-chat" />,
}));

vi.mock("@/components/notifications/NotificationCenter", () => ({
  NotificationCenter: () => <div data-testid="notification-center" />,
}));

vi.mock("@/components/custom-sidebar-trigger", () => ({
  CustomSidebarTrigger: () => <div data-testid="custom-sidebar-trigger" />,
}));

describe("Word-by-Word LLM Token Streaming Suite", () => {
  it("streams tokens via onToken callback when model.stream yields chunks", async () => {
    const tokens: string[] = [];
    const mockStreamChunks = [
      { content: "Hello" },
      { content: " there! " },
      { content: "How can I help you " },
      { content: "today?" },
    ];

    const mockModel: any = {
      stream: vi.fn(async function* () {
        for (const chunk of mockStreamChunks) {
          yield chunk;
        }
      }),
      invoke: vi.fn(),
    };

    const responder = createResponderNode(mockModel, (delta) => {
      tokens.push(delta);
    });

    const result = await responder({
      goal: "Hello CareerTrack",
      messages: [],
      plan: [],
      currentStepIndex: 0,
      reflection: { passed: true, retryCount: 0 },
      userId: "user-123",
      sessionId: "sess-123",
      interruptData: null,
      responseContent: "",
      routeContext: null,
      isHeadlessMode: false,
    } as any);

    expect(tokens.join("")).toBe("Hello there! How can I help you today?");
    expect(result.responseContent).toBe("Hello there! How can I help you today?");
    expect(mockModel.stream).toHaveBeenCalled();
  });

  it("handles complex content chunks (array text) gracefully during streaming", async () => {
    const tokens: string[] = [];
    const mockModel: any = {
      stream: vi.fn(async function* () {
        yield { content: [{ type: "text", text: "Software " }, { type: "text", text: "Engineer" }] };
        yield { content: " role analysis" };
      }),
      invoke: vi.fn(),
    };

    const responder = createResponderNode(mockModel, (delta) => {
      tokens.push(delta);
    });

    const result = await responder({
      goal: "Analyze this role",
      messages: [],
      plan: [],
      currentStepIndex: 0,
      reflection: { passed: true, retryCount: 0 },
      userId: "user-123",
      sessionId: "sess-123",
      interruptData: null,
      responseContent: "",
      routeContext: null,
      isHeadlessMode: false,
    } as any);

    expect(tokens.join("")).toBe("Software Engineer role analysis");
    expect(result.responseContent).toBe("Software Engineer role analysis");
  });

  it("immediately forwards responseContent to onToken if planner already created error response", async () => {
    const tokens: string[] = [];
    const mockModel: any = {
      stream: vi.fn(),
      invoke: vi.fn(),
    };

    const responder = createResponderNode(mockModel, (delta) => {
      tokens.push(delta);
    });

    const result = await responder({
      goal: "Invalid query",
      messages: [],
      plan: [],
      responseContent: "I could not understand your request.",
      currentStepIndex: 0,
      reflection: { passed: true, retryCount: 0 },
      userId: "user-123",
      sessionId: "sess-123",
      interruptData: null,
      routeContext: null,
      isHeadlessMode: false,
    } as any);

    expect(tokens).toEqual(["I could not understand your request."]);
    expect(result.responseContent).toBe("I could not understand your request.");
    expect(mockModel.stream).not.toHaveBeenCalled();
  });
});

describe("Mobile Bottom Dock Dedicated AI Chat Suite", () => {
  it("renders a dedicated AI Chat tab linking to /ai-assistant with MessageSquare", () => {
    const html = renderToString(<MobileBottomNav />);
    expect(html).toContain("AI Chat");
    expect(html).toContain("href=\"/ai-assistant\"");
    expect(html).toContain("aria-label=\"Mobile Navigation\"");
  });

  it("contains all 5 essential tabs in mobile dock", () => {
    const html = renderToString(<MobileBottomNav />);
    expect(html).toContain("Dashboard");
    expect(html).toContain("Discovery");
    expect(html).toContain("AI Chat");
    expect(html).toContain("Applications");
    expect(html).toContain("Profile");
  });
});

describe("Desktop Accessibility of Mobile Profile Tools Suite", () => {
  it("exposes all mobile profile tools in desktop sidebar navGroups", () => {
    const toolsGroup = navGroups.find((g) => g.label === "TOOLS");
    expect(toolsGroup).toBeDefined();

    const paths = (toolsGroup?.items || []).flatMap((item) =>
      item.subItems?.length ? item.subItems.map((s) => s.path) : [item.path]
    );
    expect(paths).toContain("/resumes");
    expect(paths).toContain("/weekly-goals");
    expect(paths).toContain("/profile-setup");
    expect(paths).toContain("/ai-memory");
    expect(paths).toContain("/brain");
    expect(paths).toContain("/integrations");
    expect(paths).toContain("/settings");
  });

  it("renders NavUser dropdown trigger with user info", () => {
    const html = renderToString(<NavUser />);
    expect(html).toContain("Tanvir Ahmed");
    expect(html).toContain("Job Seeker");
  });
});

describe("Iconography & Visual Style Rules (AGENTS.md)", () => {
  it("strictly prohibits Bot, Sparkles, Brain, and Cpu icons in AppHeader", () => {
    const html = renderToString(<AppHeader />);
    expect(html).not.toContain("lucide-bot");
    expect(html).not.toContain("lucide-sparkles");
    expect(html).not.toContain("lucide-brain");
    expect(html).not.toContain("lucide-cpu");
    expect(html).toContain("Copilot");
  });

  it("strictly prohibits Bot, Sparkles, Brain, and Cpu icons in MobileBottomNav", () => {
    const html = renderToString(<MobileBottomNav />);
    expect(html).not.toContain("lucide-bot");
    expect(html).not.toContain("lucide-sparkles");
    expect(html).not.toContain("lucide-brain");
    expect(html).not.toContain("lucide-cpu");
  });

  it("strictly prohibits Bot, Sparkles, Brain, and Cpu icons in GlobalAISidebar", () => {
    const html = renderToString(<GlobalAISidebar />);
    expect(html).not.toContain("lucide-bot");
    expect(html).not.toContain("lucide-sparkles");
    expect(html).not.toContain("lucide-brain");
    expect(html).not.toContain("lucide-cpu");
  });
});

describe("Copilot Fresh Chat & Non-Empty Responder Guarantees", () => {
  it("renders GlobalAISidebar with New Chat button and clean copilot header", () => {
    const html = renderToString(<GlobalAISidebar />);
    expect(html).toContain("Career Copilot");
    expect(html).toContain("New Chat");
    expect(html).toContain("Close Copilot");
  });

  it("guarantees responder node produces non-empty fallback when model streams empty tokens", async () => {
    const tokens: string[] = [];
    const mockModel: any = {
      stream: vi.fn(async function* () {
        yield { content: "" };
        yield { content: "   " };
      }),
      invoke: vi.fn().mockResolvedValue({ content: "" }),
    };

    const responder = createResponderNode(mockModel, (delta) => {
      tokens.push(delta);
    });

    const result = await responder({
      goal: "amar save kora job koita?",
      messages: [],
      plan: [],
      currentStepIndex: 0,
      reflection: { passed: true, retryCount: 0 },
      userId: "user-123",
      sessionId: "sess-123",
      interruptData: null,
      responseContent: "",
      routeContext: null,
      isHeadlessMode: false,
    } as any);

    expect(result.responseContent).toBeTruthy();
    expect(result.responseContent!.length).toBeGreaterThan(10);
  });

  it("fast-paths conversational courtesies and greetings in GREETING_REGEX", async () => {
    const { GREETING_REGEX } = await import("@/lib/ai/graph/constants");
    expect(GREETING_REGEX.test("hi")).toBe(true);
    expect(GREETING_REGEX.test("hello")).toBe(true);
    expect(GREETING_REGEX.test("thanks")).toBe(true);
    expect(GREETING_REGEX.test("thank you")).toBe(true);
    expect(GREETING_REGEX.test("ok")).toBe(true);
    expect(GREETING_REGEX.test("okay")).toBe(true);
    expect(GREETING_REGEX.test("got it")).toBe(true);
    expect(GREETING_REGEX.test("bujhlam")).toBe(true);
    expect(GREETING_REGEX.test("dhonnobad")).toBe(true);
    // Actionable requests must NOT be treated as greetings
    expect(GREETING_REGEX.test("track Google as Applied")).toBe(false);
    expect(GREETING_REGEX.test("apply to Stripe")).toBe(false);
  });

  it("configures Google Gemini provider with Google OpenAI baseURL and normalized model", async () => {
    const { getLangChainChatModel } = await import("@/lib/ai/graph/llm");
    const model = getLangChainChatModel({
      providerType: "google",
      apiKey: "AIzaSyTestKey",
      model: "gemini-3.6-flash",
    }) as any;

    expect(model.caller).toBeDefined();
    // Verify baseURL configuration points to generativelanguage
    expect(model.clientConfig?.baseURL || (model as any).lc_kwargs?.configuration?.baseURL).toBe(
      "https://generativelanguage.googleapis.com/v1beta/openai/"
    );
  });

  it("falls back to resilient BaseCheckpointSaver when checkpointer is requested", async () => {
    const { getGraphCheckpointer } = await import("@/lib/ai/graph/checkpointer");
    const checkpointer = await getGraphCheckpointer();
    expect(checkpointer).toBeDefined();
    expect(typeof checkpointer.getTuple).toBe("function");
    expect(typeof checkpointer.put).toBe("function");
  });
});
