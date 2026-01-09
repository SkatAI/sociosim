import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { useParams, useRouter } from "next/navigation";
import { useAuthUser } from "@/hooks/useAuthUser";
import { mockUseAuthUser } from "@/test/mocks/useAuthUser";
import { mockRouter } from "@/test/mocks/router";
import EditAgentPromptPage from "./page";

vi.mock("@/hooks/useAuthUser");
vi.mock("next/navigation");
vi.mock("@tiptap/react", async () => {
  const React = await import("react");
  return {
    EditorContent: () => React.createElement("div", { "data-testid": "editor" }),
    useEditor: () => ({
      getMarkdown: () => "",
      commands: { setContent: vi.fn() },
      isActive: () => false,
      chain: () => ({
        focus: () => ({
          toggleHeading: () => ({ run: vi.fn() }),
          toggleBold: () => ({ run: vi.fn() }),
          toggleBulletList: () => ({ run: vi.fn() }),
        }),
      }),
    }),
  };
});

function renderWithChakra(component: React.ReactElement) {
  return render(<ChakraProvider value={defaultSystem}>{component}</ChakraProvider>);
}

describe("EditAgentPromptPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthUser).mockReturnValue(mockUseAuthUser as ReturnType<typeof useAuthUser>);
    vi.mocked(useRouter).mockReturnValue(mockRouter as ReturnType<typeof useRouter>);
    vi.mocked(useParams).mockReturnValue({ id: "agent-123" } as ReturnType<typeof useParams>);

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Missing agent id" }),
    });
  });

  it("shows an error when the prompt request fails", async () => {
    renderWithChakra(<EditAgentPromptPage />);

    await waitFor(() => {
      expect(screen.getByText("Impossible de charger le prompt.")).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledWith("/api/agents/agent-123/prompts");
  });
});
