import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import Home from "./page";
import { supabase } from "@/lib/supabaseClient";
import { mockRouter } from "@/test/mocks/router";

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

function renderWithChakra(component: React.ReactElement) {
  return render(<ChakraProvider value={defaultSystem}>{component}</ChakraProvider>);
}

describe("Home page auth flow", () => {
  const mockSupabase = supabase as unknown as {
    auth: {
      getSession: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    vi.mocked(useRouter).mockReturnValue(mockRouter as ReturnType<typeof useRouter>);
    mockSupabase.auth.getSession = vi.fn().mockResolvedValue({
      data: { session: null },
    });
  });

  it("renders content when user is logged out", async () => {
    renderWithChakra(<Home />);

    expect(await screen.findByText("Bienvenue sur Sociosim")).toBeInTheDocument();
  });

  it("redirects to dashboard when a session exists", async () => {
    mockSupabase.auth.getSession = vi.fn().mockResolvedValue({
      data: { session: { user: { id: "user-1" } } },
    });

    renderWithChakra(<Home />);

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith("/dashboard");
    });
  });
});
