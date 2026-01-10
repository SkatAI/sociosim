import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { useRouter, useSearchParams, type ReadonlyURLSearchParams } from "next/navigation";
import DashboardClient from "./DashboardClient";
import { useAuthUser } from "@/hooks/useAuthUser";
import { mockUseAuthUser } from "@/test/mocks/useAuthUser";
import { mockRouter } from "@/test/mocks/router";
import { mockInterviewsList, mockInterview } from "@/test/mocks/interviews";

vi.mock("@/hooks/useAuthUser", () => ({
  useAuthUser: vi.fn(),
}));
vi.mock("next/navigation");

function renderWithChakra(component: React.ReactElement) {
  return render(<ChakraProvider value={defaultSystem}>{component}</ChakraProvider>);
}

const createInterviewsResponse = (interviews: unknown[]) => ({
  ok: true,
  json: async () => ({ success: true, interviews }),
});

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthUser).mockReturnValue(mockUseAuthUser);
    vi.mocked(useRouter).mockReturnValue(mockRouter as ReturnType<typeof useRouter>);
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams() as unknown as ReadonlyURLSearchParams
    );

    global.fetch = vi.fn().mockResolvedValue(createInterviewsResponse(mockInterviewsList));
  });

  it("shows filter dropdown only when multiple agents exist", async () => {
    renderWithChakra(<DashboardClient />);

    await waitFor(() => {
      expect(screen.queryByText("Chargement de vos entretiens...")).not.toBeInTheDocument();
    });

    expect(screen.getByLabelText("Filtrer par agent")).toBeInTheDocument();
    expect(screen.getByLabelText("Entretiens par page")).toBeInTheDocument();
  });

  it("hides the filter dropdown when only one agent exists", async () => {
    global.fetch = vi.fn().mockResolvedValue(createInterviewsResponse([mockInterview]));

    renderWithChakra(<DashboardClient />);

    await waitFor(() => {
      expect(screen.queryByText("Chargement de vos entretiens...")).not.toBeInTheDocument();
    });

    expect(screen.queryByLabelText("Filtrer par agent")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Entretiens par page")).toBeInTheDocument();
  });

  it("filters interviews when an agent is selected", async () => {
    const user = userEvent.setup();
    renderWithChakra(<DashboardClient />);

    await waitFor(() => {
      expect(screen.queryByText("Chargement de vos entretiens...")).not.toBeInTheDocument();
    });

    const select = screen.getByLabelText("Filtrer par agent");
    await user.selectOptions(select, "theo");

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /Continuer/i })).toHaveLength(1);
    });
  });

  it("navigates to personnas when creating without a selected agent", async () => {
    const user = userEvent.setup();
    renderWithChakra(<DashboardClient />);

    await waitFor(() => {
      expect(screen.queryByText("Chargement de vos entretiens...")).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /Nouvel entretien/i }));
    expect(mockRouter.push).toHaveBeenCalledWith("/personnas");
  });

  it("creates a session when an agent is selected", async () => {
    const user = userEvent.setup();
    const mockFetch = vi.fn().mockImplementation((input: RequestInfo) => {
      if (typeof input === "string" && input.startsWith("/api/user/interviews")) {
        return Promise.resolve(createInterviewsResponse(mockInterviewsList));
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

    renderWithChakra(<DashboardClient />);

    await waitFor(() => {
      expect(screen.queryByText("Chargement de vos entretiens...")).not.toBeInTheDocument();
    });

    const select = screen.getByLabelText("Filtrer par agent");
    await user.selectOptions(select, "oriane");
    await user.click(screen.getByRole("button", { name: /Nouvel entretien/i }));

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

  it("applies agent selection from URL param", async () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams({ agent: "agent-theo" }) as unknown as ReadonlyURLSearchParams
    );

    renderWithChakra(<DashboardClient />);

    await waitFor(() => {
      expect(screen.queryByText("Chargement de vos entretiens...")).not.toBeInTheDocument();
    });

    const select = screen.getByLabelText("Filtrer par agent") as HTMLSelectElement;
    await waitFor(() => {
      expect(select.value).toBe("agent-theo");
    });
  });
});
