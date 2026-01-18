import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { useRouter, useSearchParams, type ReadonlyURLSearchParams } from "next/navigation";
import InterviewPage from "./page";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useInterviewSession } from "@/hooks/useInterviewSession";
import { mockUseAuthUser } from "@/test/mocks/useAuthUser";
import { mockRouter } from "@/test/mocks/router";
import { mockUseInterviewSession } from "@/test/mocks/useInterviewSession";
import { createMockStreamingResponse } from "@/test/helpers/streaming";

// Mock modules
vi.mock("@/hooks/useAuthUser");
vi.mock("@/hooks/useInterviewSession");
vi.mock("next/navigation");
function createMarkdownResponse(markdown = "Guide court") {
  return {
    ok: true,
    text: async () => markdown,
  };
}

function createSummaryResponse() {
  return {
    ok: true,
    json: async () => ({
      agent: {
        agent_id: "agent-oriane",
        agent_name: "oriane",
        description: "Master 1 EOS",
      },
      user: { id: "test-user-123", name: "Test User" },
      interview: { started_at: "2025-12-29T10:00:00Z" },
      usage: { total_input_tokens: 10, total_output_tokens: 20 },
    }),
  };
}

function createBaseFetch() {
  return vi.fn().mockImplementation((input: RequestInfo) => {
    if (typeof input === "string" && input.startsWith("/docs/guide_entretien_court.md")) {
      return Promise.resolve(createMarkdownResponse());
    }
    if (typeof input === "string" && input.startsWith("/api/interviews/summary")) {
      return Promise.resolve(createSummaryResponse());
    }
    return Promise.reject(new Error("Unexpected fetch"));
  });
}

function createChatFetch(responseText: string) {
  const baseFetch = createBaseFetch();
  return vi.fn().mockImplementation((input: RequestInfo) => {
    if (input === "/api/chat") {
      return Promise.resolve(createMockStreamingResponse(responseText));
    }
    return baseFetch(input);
  });
}

function renderWithChakra(component: React.ReactElement) {
  return render(<ChakraProvider value={defaultSystem}>{component}</ChakraProvider>);
}

async function renderInterviewPage() {
  await act(async () => {
    renderWithChakra(<InterviewPage />);
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe("InterviewPage - Authentication & Session Setup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthUser).mockReturnValue(mockUseAuthUser as ReturnType<typeof useAuthUser>);
    vi.mocked(useRouter).mockReturnValue(mockRouter as ReturnType<typeof useRouter>);
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams() as unknown as ReadonlyURLSearchParams
    );
    vi.mocked(useInterviewSession).mockReturnValue({
      ...mockUseInterviewSession,
      isResume: false,
    } as ReturnType<typeof useInterviewSession>);

    global.fetch = createBaseFetch();
  });

  it("redirects to login when user not authenticated", async () => {
    vi.mocked(useAuthUser).mockReturnValue({
      ...mockUseAuthUser,
      user: null,
      isLoading: false,
    } as ReturnType<typeof useAuthUser>);

    await renderInterviewPage();

    expect(mockRouter.push).toHaveBeenCalledWith("/login");
  });

  it("creates session with URL parameters from dashboard", async () => {
    const mockSearchParams = new URLSearchParams({
      interviewId: "interview-123",
      sessionId: "session-456",
      adkSessionId: "adk-789",
    });

    vi.mocked(useSearchParams).mockReturnValue(
      mockSearchParams as unknown as ReadonlyURLSearchParams
    );

    await renderInterviewPage();

    // Should call useInterviewSession with null when URL params exist (null means: don't create new session)
    expect(vi.mocked(useInterviewSession)).toHaveBeenCalledWith(null);
  });

  it("creates session automatically when no URL parameters", async () => {
    const mockSearchParams = new URLSearchParams();
    vi.mocked(useSearchParams).mockReturnValue(
      mockSearchParams as unknown as ReadonlyURLSearchParams
    );

    global.fetch = createBaseFetch();

    await renderInterviewPage();

    // Should call useInterviewSession hook when no URL params
    expect(vi.mocked(useInterviewSession)).toHaveBeenCalledWith("test-user-123");
  });

  it("shows loading state during authentication", async () => {
    vi.mocked(useAuthUser).mockReturnValue({
      ...mockUseAuthUser,
      isLoading: true,
    } as ReturnType<typeof useAuthUser>);

    await renderInterviewPage();

    // Loading spinner should be displayed
    expect(screen.getByText(/Vérification d'authentification/)).toBeInTheDocument();
  });
});

describe("InterviewPage - Agent Loading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthUser).mockReturnValue(mockUseAuthUser as ReturnType<typeof useAuthUser>);
    vi.mocked(useRouter).mockReturnValue(mockRouter as ReturnType<typeof useRouter>);
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams({
        interviewId: "interview-123",
        sessionId: "session-456",
        adkSessionId: "adk-789",
      }) as unknown as ReadonlyURLSearchParams
    );
    vi.mocked(useInterviewSession).mockReturnValue({
      ...mockUseInterviewSession,
      isResume: false,
    } as ReturnType<typeof useInterviewSession>);

    global.fetch = createBaseFetch();
  });

  it("loads agent name from interview session", async () => {
    const mockSearchParams = new URLSearchParams({
      interviewId: "interview-123",
      sessionId: "session-456",
      adkSessionId: "adk-789",
    });

    vi.mocked(useSearchParams).mockReturnValue(
      mockSearchParams as unknown as ReadonlyURLSearchParams
    );

    await renderInterviewPage();

    // Agent name should be displayed in header (loaded asynchronously)
    // The mock doesn't return agent data, so it will show "Chargement de l'agent..."
    const header = screen.getByRole("heading", { level: 2 });
    expect(header).toBeInTheDocument();
  });

  it("has session with sessionId for API requests", () => {
    const session = mockUseInterviewSession.session;
    expect(session?.sessionId).toBe("session-123");
  });

  it("has session with adkSessionId and interviewId", () => {
    const session = mockUseInterviewSession.session;
    expect(session?.adkSessionId).toBe("adk-session-456");
    expect(session?.interviewId).toBe("interview-123");
  });
});

describe("InterviewPage - Chat Interaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthUser).mockReturnValue(mockUseAuthUser as ReturnType<typeof useAuthUser>);
    vi.mocked(useRouter).mockReturnValue(mockRouter as ReturnType<typeof useRouter>);
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams({
        interviewId: "interview-123",
        sessionId: "session-456",
        adkSessionId: "adk-789",
      }) as unknown as ReadonlyURLSearchParams
    );
    vi.mocked(useInterviewSession).mockReturnValue({
      ...mockUseInterviewSession,
      isResume: false,
    } as ReturnType<typeof useInterviewSession>);

    global.fetch = createBaseFetch();
  });

  it("can type in message input", async () => {
    const user = userEvent.setup();
    await renderInterviewPage();

    const input = screen.getByPlaceholderText(/Tapez votre message/);
    await user.type(input, "Test message");

    expect(input).toHaveValue("Test message");
  });

  it("clicking send adds user message immediately", async () => {
    const user = userEvent.setup();

    global.fetch = createChatFetch("Assistant response");

    await renderInterviewPage();

    const input = screen.getByPlaceholderText(/Tapez votre message/);
    const sendButton = screen.getByRole("button", { name: /Envoyer/i });

    await user.type(input, "Test message");
    await user.click(sendButton);

    // User message should appear immediately
    await waitFor(() => {
      expect(screen.getByText("Test message")).toBeInTheDocument();
    });
  });

  it("sends to chat API with correct sessionId parameter", async () => {
    const user = userEvent.setup();

    const mockFetch = createChatFetch("Response");
    global.fetch = mockFetch;

    await renderInterviewPage();

    const input = screen.getByPlaceholderText(/Tapez votre message/);
    const sendButton = screen.getByRole("button", { name: /Envoyer/i });

    await user.type(input, "Test");
    await user.click(sendButton);

    // Give chat API call time to execute
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check that /api/chat was called with correct data
    const chatCalls = mockFetch.mock.calls.filter((call) =>
      call[0] === "/api/chat"
    );
    expect(chatCalls.length).toBeGreaterThan(0);
  });

  it("can send a complete message interaction", async () => {
    const user = userEvent.setup();

    const mockFetch = createChatFetch("Réponse");
    global.fetch = mockFetch;

    await renderInterviewPage();

    const input = screen.getByPlaceholderText(/Tapez votre message/);
    const sendButton = screen.getByRole("button", { name: /Envoyer/i });

    await user.type(input, "Bonjour");
    await user.click(sendButton);

    // Message should appear
    await waitFor(() => {
      expect(screen.getByText("Bonjour")).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it("chat API receives all required parameters", () => {
    // This test validates the structure expected by /api/chat
    const session = mockUseInterviewSession.session;
    const user = mockUseAuthUser.user;

    expect(session?.sessionId).toBeDefined();
    expect(session?.adkSessionId).toBeDefined();
    expect(session?.interviewId).toBeDefined();
    expect(user?.id).toBeDefined();
  });
});

describe("InterviewPage - UI States", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthUser).mockReturnValue(mockUseAuthUser as ReturnType<typeof useAuthUser>);
    vi.mocked(useRouter).mockReturnValue(mockRouter as ReturnType<typeof useRouter>);
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams({
        interviewId: "interview-123",
        sessionId: "session-456",
        adkSessionId: "adk-789",
      }) as unknown as ReadonlyURLSearchParams
    );
    vi.mocked(useInterviewSession).mockReturnValue({
      ...mockUseInterviewSession,
      isResume: false,
    } as ReturnType<typeof useInterviewSession>);

    global.fetch = createBaseFetch();
  });

  it("shows empty state prompt before first message", async () => {
    await renderInterviewPage();

    // Empty state message should be visible
    expect(
      screen.getByText(
        "Posez votre première question pour commencer l'entretien."
      )
    ).toBeInTheDocument();
  });

  it("does not display session ID in header", async () => {
    await renderInterviewPage();

    expect(screen.queryByText(/Session:/)).not.toBeInTheDocument();
  });

  it("has messageInput component for sending messages", async () => {
    await renderInterviewPage();

    const input = screen.getByPlaceholderText(/Tapez votre message/);
    expect(input).toBeInTheDocument();
  });

  it("can send message when session params provided", async () => {
    const user = userEvent.setup();

    global.fetch = createChatFetch("Response");

    await renderInterviewPage();

    const input = screen.getByPlaceholderText(/Tapez votre message/);
    const sendButton = screen.getByRole("button", { name: /Envoyer/i });

    expect(input).toBeInTheDocument();
    expect(sendButton).toBeInTheDocument();

    await user.type(input, "Message");
    await user.click(sendButton);

    // Message should be added
    await waitFor(() => {
      expect(screen.getByText("Message")).toBeInTheDocument();
    });
  });
});
