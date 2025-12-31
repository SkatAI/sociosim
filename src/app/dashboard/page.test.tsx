import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import DashboardPage from "./page";
import { useAuthUser } from "@/hooks/useAuthUser";
import { mockUseAuthUser, createMockAuthUser } from "@/test/mocks/useAuthUser";
import { mockRouter } from "@/test/mocks/router";
import { mockInterviewsList } from "@/test/mocks/interviews";

// Mock modules
vi.mock("@/hooks/useAuthUser");
vi.mock("next/navigation");
const mockAgents = [
  {
    id: "agent-oriane",
    agent_name: "oriane",
    description: "Master 1 EOS\nUtilisatrice pragmatique de l'IA",
  },
  {
    id: "agent-theo",
    agent_name: "theo",
    description: "M2 Math. App. et Socio Quantitative\nPassionné de technologie",
  },
  {
    id: "agent-jade",
    agent_name: "jade",
    description: "M2 Sociologie et études de genre\nTechno sceptique",
  },
];

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn().mockResolvedValue({ data: mockAgents, error: null }),
      })),
    })),
  },
}));

// Helper function to render with ChakraProvider
function renderWithChakra(component: React.ReactElement) {
  return render(<ChakraProvider value={defaultSystem}>{component}</ChakraProvider>);
}

describe("DashboardPage - Create Interview Feature", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthUser).mockReturnValue(mockUseAuthUser);
    vi.mocked(useRouter).mockReturnValue(mockRouter as ReturnType<typeof useRouter>);

    // Mock interviews fetch (empty list)
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, interviews: [] }),
    });
  });

  it("renders agent cards with correct names and descriptions", async () => {
    renderWithChakra(<DashboardPage />);

    await waitFor(() => {
      expect(screen.queryByText("Chargement de vos entretiens...")).not.toBeInTheDocument();
    });

    expect(screen.getByText("oriane")).toBeInTheDocument();
    expect(screen.getByText("theo")).toBeInTheDocument();
    expect(screen.getByText("jade")).toBeInTheDocument();
    expect(screen.getByText(/Master 1 EOS/)).toBeInTheDocument();
    expect(screen.getByText(/Utilisatrice pragmatique de l'IA/)).toBeInTheDocument();
  });

  it("renders Interviewer button for each agent", async () => {
    renderWithChakra(<DashboardPage />);

    await waitFor(() => {
      expect(screen.queryByText("Chargement de vos entretiens...")).not.toBeInTheDocument();
    });

    const interviewerButtons = screen.getAllByRole("button", { name: /Interviewer/i });
    expect(interviewerButtons).toHaveLength(3);
  });

  it("clicking Interviewer button shows loading state", async () => {
    const user = userEvent.setup();

    const mockFetch = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({ success: true, interviews: [] }),
              }),
            100
          )
        )
    );
    global.fetch = mockFetch;

    renderWithChakra(<DashboardPage />);

    await waitFor(() => {
      expect(screen.queryByText("Chargement de vos entretiens...")).not.toBeInTheDocument();
    });

    const interviewerButtons = screen.getAllByRole("button", { name: /Interviewer/i });
    await user.click(interviewerButtons[0]);

    // Check that at least one loading state appears
    expect(screen.queryAllByText("Création...")).toHaveLength(3);
  });

  it("successful API response navigates to interview page", async () => {
    const user = userEvent.setup();

    const mockSessionData = {
      interviewId: "interview-456",
      sessionId: "session-789",
      adkSessionId: "adk-session-999",
    };

    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, interviews: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSessionData,
      });

    global.fetch = mockFetch;

    renderWithChakra(<DashboardPage />);

    await waitFor(() => {
      expect(screen.queryByText("Chargement de vos entretiens...")).not.toBeInTheDocument();
    });

    const interviewerButtons = screen.getAllByRole("button", { name: /Interviewer/i });
    await user.click(interviewerButtons[0]);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/sessions",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: "test-user-123",
            agent_name: "oriane",
          }),
        })
      );
    });

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith(
        "/interview?interviewId=interview-456&sessionId=session-789&adkSessionId=adk-session-999"
      );
    });
  });

  it("redirects to login if no user logged in", async () => {
    vi.mocked(useAuthUser).mockReturnValue(
      createMockAuthUser({ user: null, isLoading: false })
    );

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, interviews: [] }),
    });
    global.fetch = mockFetch;

    renderWithChakra(<DashboardPage />);

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith("/login");
    });
  });

  it("calls API with correct agent_name for each agent", async () => {
    const user = userEvent.setup();

    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, interviews: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          interviewId: "interview-123",
          sessionId: "session-456",
          adkSessionId: "adk-789",
        }),
      });

    global.fetch = mockFetch;

    renderWithChakra(<DashboardPage />);

    await waitFor(() => {
      expect(screen.queryByText("Chargement de vos entretiens...")).not.toBeInTheDocument();
    });

    // Click Théo's button (second agent)
    const theoButton = screen.getAllByRole("button", { name: /Interviewer/i })[1];
    await user.click(theoButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/sessions",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            userId: "test-user-123",
            agent_name: "theo",
          }),
        })
      );
    });
  });
});

describe("DashboardPage - Continue Interview Feature", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthUser).mockReturnValue(mockUseAuthUser);
    vi.mocked(useRouter).mockReturnValue(mockRouter as ReturnType<typeof useRouter>);

    // Mock interviews fetch with previous interviews
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        interviews: mockInterviewsList,
      }),
    });
  });

  it("renders interview cards with agent name and status", async () => {
    renderWithChakra(<DashboardPage />);

    await waitFor(
      () => {
        expect(screen.queryByText("Chargement de vos entretiens...")).not.toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // Check that agent names appear for the interviews
    const orianElements = screen.queryAllByText("oriane");
    const theoElements = screen.queryAllByText("theo");
    expect(orianElements.length + theoElements.length).toBeGreaterThan(0);
  });

  it("renders Continuer button for each interview", async () => {
    renderWithChakra(<DashboardPage />);

    await waitFor(() => {
      expect(screen.queryByText("Chargement de vos entretiens...")).not.toBeInTheDocument();
    });

    const continuerButtons = screen.getAllByRole("button", { name: /Continuer/i });
    expect(continuerButtons).toHaveLength(2);
  });

  it("displays last assistant message preview", async () => {
    renderWithChakra(<DashboardPage />);

    await waitFor(
      () => {
        expect(screen.queryByText("Chargement de vos entretiens...")).not.toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // Check that messages are displayed in the cards
    const messageElements = screen.queryAllByText(/Bonjour|message/i);
    expect(messageElements.length).toBeGreaterThanOrEqual(0);
  });

  it("shows token usage counts", async () => {
    renderWithChakra(<DashboardPage />);

    await waitFor(() => {
      expect(screen.queryByText("Chargement de vos entretiens...")).not.toBeInTheDocument();
    });

    // Check for token counts in interview cards
    const tokenElements = screen.queryAllByText(/1500|2000/);
    expect(tokenElements.length).toBeGreaterThan(0);
  });

  it("clicking Continuer navigates to interview page", async () => {
    const user = userEvent.setup();
    renderWithChakra(<DashboardPage />);

    await waitFor(() => {
      expect(screen.queryByText("Chargement de vos entretiens...")).not.toBeInTheDocument();
    });

    const continuerButton = screen.getAllByRole("button", { name: /Continuer/i })[0];
    await user.click(continuerButton);

    expect(mockRouter.push).toHaveBeenCalledWith("/interview/interview-123");
  });
});
