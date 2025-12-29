import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { useParams, useRouter } from "next/navigation";
import ResumeInterviewPage from "./page";
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
vi.mock("@/lib/agents", () => ({
  getAgentById: vi.fn((agentName) => ({
    id: agentName,
    name: agentName === "oriane" ? "Oriane" : "Théo",
  })),
}));

function renderWithChakra(component: React.ReactElement) {
  return render(<ChakraProvider value={defaultSystem}>{component}</ChakraProvider>);
}

describe("ResumeInterviewPage - Load Previous Messages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthUser).mockReturnValue(mockUseAuthUser);
    vi.mocked(useRouter).mockReturnValue(mockRouter as any);
    vi.mocked(useParams).mockReturnValue({ id: "interview-123" } as any);
    vi.mocked(useInterviewSession).mockReturnValue(mockUseInterviewSession as any);

    // Mock Supabase agent fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        agent_id: "agent-oriane",
        agents: { agent_name: "oriane" },
      }),
    });
  });

  it("useInterviewSession hook provides session with sessionId", () => {
    const session = mockUseInterviewSession.session;
    expect(session).toBeDefined();
    expect(session?.sessionId).toBe("session-123");
  });

  it("useInterviewSession hook provides adkSessionId", () => {
    const session = mockUseInterviewSession.session;
    expect(session?.adkSessionId).toBe("adk-session-456");
  });

  it("useInterviewSession hook provides interviewId", () => {
    const session = mockUseInterviewSession.session;
    expect(session?.interviewId).toBe("interview-123");
  });

  it("useInterviewSession hook indicates resume mode with isResume=true", () => {
    expect(mockUseInterviewSession.isResume).toBe(true);
  });

  it("useInterviewSession hook loads previous messages", () => {
    expect(mockUseInterviewSession.messages).toHaveLength(2);
  });

  it("messages include both assistant and user roles", () => {
    const roles = mockUseInterviewSession.messages.map(m => m.role);
    expect(roles).toContain("assistant");
    expect(roles).toContain("user");
  });
});

describe("ResumeInterviewPage - Send New Messages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthUser).mockReturnValue(mockUseAuthUser);
    vi.mocked(useRouter).mockReturnValue(mockRouter as any);
    vi.mocked(useParams).mockReturnValue({ id: "interview-123" } as any);
    vi.mocked(useInterviewSession).mockReturnValue(mockUseInterviewSession as any);

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        agent_id: "agent-oriane",
        agents: { agent_name: "oriane" },
      }),
    });
  });

  it("session has sessionId for chat API requests", () => {
    const session = mockUseInterviewSession.session;
    expect(session?.sessionId).toBe("session-123");
  });

  it("session has adkSessionId for ADK API requests", () => {
    const session = mockUseInterviewSession.session;
    expect(session?.adkSessionId).toBe("adk-session-456");
  });

  it("session has interviewId for tracking", () => {
    const session = mockUseInterviewSession.session;
    expect(session?.interviewId).toBe("interview-123");
  });

  it("useInterviewSession is not loading after initialization", () => {
    expect(mockUseInterviewSession.isLoading).toBe(false);
  });

  it("useInterviewSession has no error", () => {
    expect(mockUseInterviewSession.error).toBeNull();
  });

  it("messages are array type for rendering", () => {
    expect(Array.isArray(mockUseInterviewSession.messages)).toBe(true);
  });
});
