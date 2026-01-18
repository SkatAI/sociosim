import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { InterviewSidebar } from "./InterviewSidebar";
import { mockRouter } from "@/test/mocks/router";

vi.mock("next/navigation");

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = MockResizeObserver;
}

function renderWithChakra(component: React.ReactElement) {
  return render(<ChakraProvider value={defaultSystem}>{component}</ChakraProvider>);
}

describe("InterviewSidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue(mockRouter as ReturnType<typeof useRouter>);
  });

  it("starts a new interview from the create button", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    global.fetch = vi.fn().mockImplementation((input: RequestInfo) => {
      if (typeof input === "string" && input.startsWith("/docs/guide_entretien_court.md")) {
        return Promise.resolve({
          ok: true,
          text: async () => "Guide court",
        });
      }
      if (input === "/api/sessions") {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            interviewId: "interview-456",
            sessionId: "session-789",
            adkSessionId: "adk-session-999",
          }),
        });
      }
      if (typeof input === "string" && input.startsWith("/api/user/interviews")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ interviews: [] }),
        });
      }
      return Promise.reject(new Error("Unexpected fetch"));
    });

    renderWithChakra(
      <InterviewSidebar
        agentDisplayName="Oriane"
        agentId="agent-oriane"
        userId="test-user-123"
        agentDescription="Master 1 EOS"
        userName="Test User"
        dateDisplay="18/01/2026"
        stats={{ answeredQuestions: 2, inputTokens: 10, outputTokens: 20 }}
        historyUserId="test-user-123"
        currentInterviewId="interview-123"
        onExportPdf={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "Commencer un nouvel entretien" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/sessions",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            userId: "test-user-123",
            agent_id: "agent-oriane",
          }),
        })
      );
    });

    expect(mockRouter.push).toHaveBeenCalledWith(
      "/interview?interviewId=interview-456&sessionId=session-789&adkSessionId=adk-session-999"
    );
  });

  it("shows history entries with question counts and highlights current interview", async () => {
    global.fetch = vi.fn().mockImplementation((input: RequestInfo) => {
      if (typeof input === "string" && input.startsWith("/docs/guide_entretien_court.md")) {
        return Promise.resolve({
          ok: true,
          text: async () => "Guide court",
        });
      }
      if (typeof input === "string" && input.startsWith("/api/user/interviews")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            interviews: [
              {
                id: "interview-123",
                agent_id: "agent-oriane",
                updated_at: "2025-12-29T10:30:00Z",
                agents: { agent_name: "oriane" },
                messages: [{ role: "assistant" }, { role: "assistant" }],
              },
              {
                id: "interview-456",
                agent_id: "agent-oriane",
                updated_at: "2025-12-28T10:30:00Z",
                agents: { agent_name: "oriane" },
                messages: [{ role: "assistant" }],
              },
            ],
          }),
        });
      }
      return Promise.reject(new Error("Unexpected fetch"));
    });

    renderWithChakra(
      <InterviewSidebar
        agentDisplayName="Oriane"
        agentId="agent-oriane"
        userId="test-user-123"
        agentDescription="Master 1 EOS"
        userName="Test User"
        dateDisplay="18/01/2026"
        stats={{ answeredQuestions: 2, inputTokens: 10, outputTokens: 20 }}
        historyUserId="test-user-123"
        currentInterviewId="interview-123"
        onExportPdf={vi.fn()}
      />
    );

    expect(await screen.findByText(/Oriane - 29\/12\/25 · 2q\./i)).toBeInTheDocument();
    expect(await screen.findByText(/Oriane - 28\/12\/25 · 1q\./i)).toBeInTheDocument();

    const currentLink = screen.getByRole("link", { name: /29\/12\/25 · 2q\./i });
    expect(currentLink).toHaveStyle({ backgroundColor: "var(--chakra-colors-cyan-50)" });
  });

  it("renders export and help actions", async () => {
    const onExportPdf = vi.fn();
    const onExportGoogleDocs = vi.fn();

    const user = userEvent.setup({ pointerEventsCheck: 0 });
    global.fetch = vi.fn().mockImplementation((input: RequestInfo) => {
      if (typeof input === "string" && input.startsWith("/docs/guide_entretien_court.md")) {
        return Promise.resolve({
          ok: true,
          text: async () => "Guide court",
        });
      }
      if (typeof input === "string" && input.startsWith("/api/user/interviews")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ interviews: [] }),
        });
      }
      return Promise.reject(new Error("Unexpected fetch"));
    });

    renderWithChakra(
      <InterviewSidebar
        agentDisplayName="Oriane"
        agentId="agent-oriane"
        userId="test-user-123"
        agentDescription="Master 1 EOS"
        userName="Test User"
        dateDisplay="18/01/2026"
        stats={{ answeredQuestions: 2, inputTokens: 10, outputTokens: 20 }}
        historyUserId="test-user-123"
        currentInterviewId="interview-123"
        onExportPdf={onExportPdf}
        onExportGoogleDocs={onExportGoogleDocs}
      />
    );

    await user.click(screen.getByRole("button", { name: "Exporter en PDF" }));
    expect(onExportPdf).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Exporter vers Google docs" }));
    expect(onExportGoogleDocs).toHaveBeenCalled();

    const helpButton = screen.getByRole("button", { name: "Aide pour l'entretien" });
    expect(helpButton).toBeInTheDocument();
    await user.hover(helpButton);
    expect(await screen.findByText("Aide pour l'entretien")).toBeInTheDocument();
  });

  it("shows agent description under the name", async () => {
    global.fetch = vi.fn().mockImplementation((input: RequestInfo) => {
      if (typeof input === "string" && input.startsWith("/docs/guide_entretien_court.md")) {
        return Promise.resolve({
          ok: true,
          text: async () => "Guide court",
        });
      }
      if (typeof input === "string" && input.startsWith("/api/user/interviews")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ interviews: [] }),
        });
      }
      return Promise.reject(new Error("Unexpected fetch"));
    });

    renderWithChakra(
      <InterviewSidebar
        agentDisplayName="Oriane"
        agentId="agent-oriane"
        userId="test-user-123"
        agentDescription="Master 1 EOS"
        userName="Test User"
        dateDisplay="18/01/2026"
        stats={{ answeredQuestions: 2, inputTokens: 10, outputTokens: 20 }}
        historyUserId="test-user-123"
        currentInterviewId="interview-123"
        onExportPdf={vi.fn()}
      />
    );

    expect(await screen.findByText("Master 1 EOS")).toBeInTheDocument();
  });
});
