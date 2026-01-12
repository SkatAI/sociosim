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

vi.mock("@/hooks/useAuthUser", () => ({
  useAuthUser: vi.fn(),
}));
vi.mock("next/navigation");

const mockAgents = [
  {
    id: "agent-oriane",
    agent_name: "oriane",
    description: "Master 1 EOS\\nUtilisatrice pragmatique de l'IA",
    has_published_prompt: true,
  },
  {
    id: "agent-theo",
    agent_name: "theo",
    description: "M2 Math. App. et Socio Quantitative\\nPassionné de technologie",
    has_published_prompt: true,
  },
  {
    id: "agent-jade",
    agent_name: "jade",
    description: "M2 Sociologie et études de genre\\nTechno sceptique",
    has_published_prompt: false,
  },
];

function renderWithChakra(component: React.ReactElement) {
  return render(<ChakraProvider value={defaultSystem}>{component}</ChakraProvider>);
}

const createAgentsResponse = (agents: unknown[]) => ({
  ok: true,
  json: async () => ({ success: true, agents }),
});

const createInterviewsResponse = (interviews: unknown[]) => ({
  ok: true,
  json: async () => ({ success: true, interviews }),
});

describe("PersonnasPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthUser).mockReturnValue(mockUseAuthUser);
    vi.mocked(useRouter).mockReturnValue(mockRouter as ReturnType<typeof useRouter>);

    global.fetch = vi.fn().mockImplementation((input: RequestInfo) => {
      if (input === "/api/agents?template=false") {
        return Promise.resolve(createAgentsResponse(mockAgents));
      }
      if (typeof input === "string" && input.startsWith("/api/user/interviews")) {
        return Promise.resolve(createInterviewsResponse([]));
      }
      return Promise.reject(new Error("Unexpected fetch"));
    });
  });

  it("renders agent cards and action buttons", async () => {
    renderWithChakra(<PersonnasPage />);

    await waitFor(() => {
      expect(screen.queryByText("Chargement des personnas...")).not.toBeInTheDocument();
    });

    expect(screen.getByText("Oriane")).toBeInTheDocument();
    expect(screen.getByText("Theo")).toBeInTheDocument();
    expect(screen.getByText("Jade")).toBeInTheDocument();
    const interviewButtons = screen.getAllByRole("button", { name: /Nouvel entretien/i });
    expect(interviewButtons).toHaveLength(3);
    expect(interviewButtons.some((button) => button.hasAttribute("disabled"))).toBe(true);
  });

  it("shows Historique only for agents with previous interviews", async () => {
    global.fetch = vi.fn().mockImplementation((input: RequestInfo) => {
      if (input === "/api/agents?template=false") {
        return Promise.resolve(createAgentsResponse(mockAgents));
      }
      if (typeof input === "string" && input.startsWith("/api/user/interviews")) {
        return Promise.resolve(createInterviewsResponse([mockInterview]));
      }
      return Promise.reject(new Error("Unexpected fetch"));
    });

    renderWithChakra(<PersonnasPage />);

    await waitFor(() => {
      expect(screen.queryByText("Chargement des personnas...")).not.toBeInTheDocument();
    });

    expect(screen.getAllByRole("button", { name: /Historique/i })).toHaveLength(1);
  });

  it("navigates to dashboard with agent filter on Historique click", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockImplementation((input: RequestInfo) => {
      if (input === "/api/agents?template=false") {
        return Promise.resolve(createAgentsResponse(mockAgents));
      }
      if (typeof input === "string" && input.startsWith("/api/user/interviews")) {
        return Promise.resolve(createInterviewsResponse([mockInterview]));
      }
      return Promise.reject(new Error("Unexpected fetch"));
    });

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
      if (input === "/api/agents?template=false") {
        return Promise.resolve(createAgentsResponse(mockAgents));
      }
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
            agent_id: "agent-oriane",
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
