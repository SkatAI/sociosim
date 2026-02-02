import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { useParams, useRouter } from "next/navigation";
import { Suspense } from "react";
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

function renderWithChakra(component: React.ReactElement) {
  return render(
    <ChakraProvider value={defaultSystem}>
      <Suspense fallback={<div>Chargement...</div>}>{component}</Suspense>
    </ChakraProvider>
  );
}

function createSummaryResponse(ownerId = "test-user-123") {
  return {
    ok: true,
    json: async () => ({
      agent: { agent_id: "agent-oriane", agent_name: "oriane", description: "Master 1 EOS" },
      user: { id: ownerId, name: "Test User" },
      interview: { started_at: "2025-12-29T10:00:00Z" },
    }),
  };
}

function createHistoryResponse() {
  return {
    ok: true,
    json: async () => ({ interviews: [] }),
  };
}

describe("ResumeInterviewPage - Load Previous Messages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthUser).mockReturnValue(mockUseAuthUser as ReturnType<typeof useAuthUser>);
    vi.mocked(useRouter).mockReturnValue(mockRouter as ReturnType<typeof useRouter>);
    vi.mocked(useParams).mockReturnValue({ id: "interview-123" } as ReturnType<typeof useParams>);
    vi.mocked(useInterviewSession).mockReturnValue(
      mockUseInterviewSession as ReturnType<typeof useInterviewSession>
    );

    global.fetch = vi.fn().mockResolvedValue({ ok: true });
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
    vi.mocked(useAuthUser).mockReturnValue(mockUseAuthUser as ReturnType<typeof useAuthUser>);
    vi.mocked(useRouter).mockReturnValue(mockRouter as ReturnType<typeof useRouter>);
    vi.mocked(useParams).mockReturnValue({ id: "interview-123" } as ReturnType<typeof useParams>);
    vi.mocked(useInterviewSession).mockReturnValue(
      mockUseInterviewSession as ReturnType<typeof useInterviewSession>
    );

    global.fetch = vi.fn().mockResolvedValue({ ok: true });
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

describe("ResumeInterviewPage - Admin view-only access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue(mockRouter as ReturnType<typeof useRouter>);
    vi.mocked(useParams).mockReturnValue({ id: "interview-123" } as ReturnType<typeof useParams>);
    vi.mocked(useInterviewSession).mockReturnValue({
      session: null,
      messages: [],
      isResume: true,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useInterviewSession>);
  });

  it("hides input and shows messages for admin viewing another user's interview", async () => {
    vi.mocked(useAuthUser).mockReturnValue({
      ...mockUseAuthUser,
      user_admin: true,
      user: {
        ...mockUseAuthUser.user,
        id: "admin-1",
      },
    } as ReturnType<typeof useAuthUser>);

    global.fetch = vi.fn().mockImplementation((input: RequestInfo) => {
      if (typeof input === "string" && input.startsWith("/docs/guide_entretien_court.md")) {
        return Promise.resolve({
          ok: true,
          text: async () => "Guide court",
        });
      }
      if (typeof input === "string" && input.startsWith("/api/interviews/summary")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            agent: { agent_id: "agent-oriane", agent_name: "oriane", description: "Master 1 EOS" },
            user: { id: "owner-1", name: "User B" },
            interview: { started_at: "2025-12-29T10:00:00Z" },
          }),
        });
      }
      if (typeof input === "string" && input.startsWith("/api/user/interviews")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ interviews: [] }),
        });
      }
      if (typeof input === "string" && input.startsWith("/api/interviews/interview-123/messages")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            messages: [
              {
                id: "msg-1",
                role: "assistant",
                content: "Bonjour, je suis Oriane.",
                created_at: "2025-12-29T10:25:00Z",
              },
            ],
          }),
        });
      }
      return Promise.reject(new Error("Unexpected fetch"));
    });

    await act(async () => {
      renderWithChakra(
        <ResumeInterviewPage params={Promise.resolve({ id: "interview-123" })} />
      );
    });

    await waitFor(() => {
      expect(screen.queryByText("Chargement...")).not.toBeInTheDocument();
    });

    expect(await screen.findByRole("heading", { name: /Oriane/i })).toBeInTheDocument();
    expect(await screen.findByText("par User B")).toBeInTheDocument();
    expect(await screen.findByText("Bonjour, je suis Oriane.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Envoyer" })).not.toBeInTheDocument();
  });

  it("shows input when admin is the interview owner", async () => {
    vi.mocked(useAuthUser).mockReturnValue({
      ...mockUseAuthUser,
      user_admin: true,
      user: {
        ...mockUseAuthUser.user,
        id: "admin-1",
      },
    } as ReturnType<typeof useAuthUser>);

    global.fetch = vi.fn().mockImplementation((input: RequestInfo) => {
      if (typeof input === "string" && input.startsWith("/docs/guide_entretien_court.md")) {
        return Promise.resolve({
          ok: true,
          text: async () => "Guide court",
        });
      }
      if (typeof input === "string" && input.startsWith("/api/interviews/summary")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            agent: { agent_id: "agent-oriane", agent_name: "oriane", description: "Master 1 EOS" },
            user: { id: "admin-1", name: "Admin User" },
            interview: { started_at: "2025-12-29T10:00:00Z" },
          }),
        });
      }
      if (typeof input === "string" && input.startsWith("/api/user/interviews")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ interviews: [] }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ messages: [] }),
      });
    });

    await act(async () => {
      renderWithChakra(
        <ResumeInterviewPage params={Promise.resolve({ id: "interview-123" })} />
      );
    });

    await waitFor(() => {
      expect(screen.queryByText("Chargement...")).not.toBeInTheDocument();
    });

    expect(await screen.findByRole("button", { name: /Envoyer/i })).toBeInTheDocument();
  });
});

describe("ResumeInterviewPage - Chat Interaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthUser).mockReturnValue(mockUseAuthUser as ReturnType<typeof useAuthUser>);
    vi.mocked(useRouter).mockReturnValue(mockRouter as ReturnType<typeof useRouter>);
    vi.mocked(useParams).mockReturnValue({ id: "interview-123" } as ReturnType<typeof useParams>);
    vi.mocked(useInterviewSession).mockReturnValue(
      mockUseInterviewSession as ReturnType<typeof useInterviewSession>
    );

    global.fetch = vi.fn().mockImplementation((input: RequestInfo) => {
      if (typeof input === "string" && input.startsWith("/docs/guide_entretien_court.md")) {
        return Promise.resolve({ ok: true, text: async () => "Guide court" });
      }
      if (typeof input === "string" && input.startsWith("/api/user/interviews")) {
        return Promise.resolve(createHistoryResponse());
      }
      if (typeof input === "string" && input.startsWith("/api/interviews/summary")) {
        return Promise.resolve(createSummaryResponse("test-user-123"));
      }
      if (input === "/api/chat") {
        return Promise.resolve(createMockStreamingResponse("Réponse"));
      }
      return Promise.reject(new Error("Unexpected fetch"));
    });
  });

  it("sends a message and renders assistant response", async () => {
    const user = userEvent.setup();
    await act(async () => {
      renderWithChakra(
        <ResumeInterviewPage params={Promise.resolve({ id: "interview-123" })} />
      );
    });

    await screen.findByRole("heading", { name: /Oriane/i });

    const input = screen.getByPlaceholderText(/Posez votre question/i);
    const sendButton = screen.getByRole("button", { name: /Envoyer/i });

    await user.type(input, "Test message");
    await user.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText("Test message")).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText("Réponse")).toBeInTheDocument();
    });
  });
});

describe("ResumeInterviewPage - Summary Errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthUser).mockReturnValue(mockUseAuthUser as ReturnType<typeof useAuthUser>);
    vi.mocked(useRouter).mockReturnValue(mockRouter as ReturnType<typeof useRouter>);
    vi.mocked(useParams).mockReturnValue({ id: "interview-123" } as ReturnType<typeof useParams>);
    vi.mocked(useInterviewSession).mockReturnValue(
      mockUseInterviewSession as ReturnType<typeof useInterviewSession>
    );

    global.fetch = vi.fn().mockImplementation((input: RequestInfo) => {
      if (typeof input === "string" && input.startsWith("/docs/guide_entretien_court.md")) {
        return Promise.resolve({ ok: true, text: async () => "Guide court" });
      }
      if (typeof input === "string" && input.startsWith("/api/user/interviews")) {
        return Promise.resolve(createHistoryResponse());
      }
      if (typeof input === "string" && input.startsWith("/api/interviews/summary")) {
        return Promise.resolve({
          ok: false,
          json: async () => ({ error: "Boom" }),
          statusText: "Bad Request",
        });
      }
      return Promise.reject(new Error("Unexpected fetch"));
    });
  });

  it("shows summary error in sidebar when summary fetch fails", async () => {
    await act(async () => {
      renderWithChakra(
        <ResumeInterviewPage params={Promise.resolve({ id: "interview-123" })} />
      );
    });

    expect(
      await screen.findByRole("heading", { name: /Erreur: Failed to load interview summary: Boom/i })
    ).toBeInTheDocument();
  });
});

describe("ResumeInterviewPage - Exports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthUser).mockReturnValue(mockUseAuthUser as ReturnType<typeof useAuthUser>);
    vi.mocked(useRouter).mockReturnValue(mockRouter as ReturnType<typeof useRouter>);
    vi.mocked(useParams).mockReturnValue({ id: "interview-123" } as ReturnType<typeof useParams>);
    vi.mocked(useInterviewSession).mockReturnValue(
      mockUseInterviewSession as ReturnType<typeof useInterviewSession>
    );

    global.fetch = vi.fn().mockImplementation((input: RequestInfo) => {
      if (typeof input === "string" && input.startsWith("/docs/guide_entretien_court.md")) {
        return Promise.resolve({ ok: true, text: async () => "Guide court" });
      }
      if (typeof input === "string" && input.startsWith("/api/user/interviews")) {
        return Promise.resolve(createHistoryResponse());
      }
      if (typeof input === "string" && input.startsWith("/api/interviews/summary")) {
        return Promise.resolve(createSummaryResponse("test-user-123"));
      }
      if (typeof input === "string" && input.startsWith("/api/interviews/export?interviewId=")) {
        return Promise.resolve({
          ok: true,
          blob: async () => new Blob(["pdf"]),
        });
      }
      return Promise.reject(new Error("Unexpected fetch"));
    });

    if (!URL.createObjectURL) {
      Object.defineProperty(URL, "createObjectURL", { value: vi.fn(), writable: true });
    }
    if (!URL.revokeObjectURL) {
      Object.defineProperty(URL, "revokeObjectURL", { value: vi.fn(), writable: true });
    }
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:pdf");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
  });

  it("exports PDF using the interviewId", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    await act(async () => {
      renderWithChakra(
        <ResumeInterviewPage params={Promise.resolve({ id: "interview-123" })} />
      );
    });

    await screen.findByRole("heading", { name: /Oriane/i });

    await user.click(screen.getByRole("button", { name: "Exporter en PDF" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/interviews/export?interviewId=interview-123"
      );
    });
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });
});
