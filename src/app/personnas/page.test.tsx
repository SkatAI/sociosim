import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import PersonnasPage from "./page";
import { useAuthUser } from "@/hooks/useAuthUser";
import { mockUseAuthUser } from "@/test/mocks/useAuthUser";
import { mockRouter } from "@/test/mocks/router";
import { mockInterview } from "@/test/mocks/interviews";

vi.mock("@/hooks/useAuthUser");
vi.mock("next/navigation");

const mockAgents = [
  {
    id: "agent-oriane",
    agent_name: "oriane",
    description: "Master 1 EOS\\nUtilisatrice pragmatique de l'IA",
  },
  {
    id: "agent-theo",
    agent_name: "theo",
    description: "M2 Math. App. et Socio Quantitative\\nPassionné de technologie",
  },
  {
    id: "agent-jade",
    agent_name: "jade",
    description: "M2 Sociologie et études de genre\\nTechno sceptique",
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

function renderWithChakra(component: React.ReactElement) {
  return render(<ChakraProvider value={defaultSystem}>{component}</ChakraProvider>);
}

const createInterviewsResponse = (interviews: unknown[]) => ({
  ok: true,
  json: async () => ({ success: true, interviews }),
});

describe("PersonnasPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthUser).mockReturnValue(mockUseAuthUser);
    vi.mocked(useRouter).mockReturnValue(mockRouter as ReturnType<typeof useRouter>);

    global.fetch = vi.fn().mockResolvedValue(createInterviewsResponse([]));
  });

  it("renders agent cards and action buttons", async () => {
    renderWithChakra(<PersonnasPage />);

    await waitFor(() => {
      expect(screen.queryByText("Chargement des personnas...")).not.toBeInTheDocument();
    });

    expect(screen.getByText("oriane")).toBeInTheDocument();
    expect(screen.getByText("theo")).toBeInTheDocument();
    expect(screen.getByText("jade")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Nouvel entretien/i })).toHaveLength(3);
  });

  it("shows Historique only for agents with previous interviews", async () => {
    global.fetch = vi.fn().mockResolvedValue(createInterviewsResponse([mockInterview]));

    renderWithChakra(<PersonnasPage />);

    await waitFor(() => {
      expect(screen.queryByText("Chargement des personnas...")).not.toBeInTheDocument();
    });

    expect(screen.getAllByRole("button", { name: /Historique/i })).toHaveLength(1);
  });

  it("navigates to dashboard with agent filter on Historique click", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValue(createInterviewsResponse([mockInterview]));

    renderWithChakra(<PersonnasPage />);

    await waitFor(() => {
      expect(screen.queryByText("Chargement des personnas...")).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /Historique/i }));
    expect(mockRouter.push).toHaveBeenCalledWith("/dashboard?agent=oriane");
  });

  it("creates a new interview when Nouvel entretien is clicked", async () => {
    const user = userEvent.setup();
    const mockFetch = vi.fn().mockImplementation((input: RequestInfo) => {
      if (typeof input === "string" && input.startsWith("/api/user/interviews")) {
        return Promise.resolve(createInterviewsResponse([mockInterview]));
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
      return Promise.reject(new Error("Unexpected fetch"));
    });
    global.fetch = mockFetch;

    renderWithChakra(<PersonnasPage />);

    await waitFor(() => {
      expect(screen.queryByText("Chargement des personnas...")).not.toBeInTheDocument();
    });

    await user.click(screen.getAllByRole("button", { name: /Nouvel entretien/i })[0]);

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
});
