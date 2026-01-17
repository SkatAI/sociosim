import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import Home from "./page";
import { mockRouter } from "@/test/mocks/router";
import { useAuthUser } from "@/hooks/useAuthUser";

vi.mock("@/hooks/useAuthUser", () => ({
  useAuthUser: vi.fn(),
}));

function renderWithChakra(component: React.ReactElement) {
  return render(<ChakraProvider value={defaultSystem}>{component}</ChakraProvider>);
}

describe("Home page auth flow", () => {
  beforeEach(() => {
    vi.mocked(useRouter).mockReturnValue(mockRouter as ReturnType<typeof useRouter>);
    vi.mocked(useAuthUser).mockReturnValue({
      user: null,
      session: null,
      role: null,
      user_admin: false,
      isLoading: false,
      refreshUser: vi.fn(),
      updateUserMetadata: vi.fn(),
    } as ReturnType<typeof useAuthUser>);
  });

  it("renders content when user is logged out", async () => {
    renderWithChakra(<Home />);

    expect(await screen.findByText("Bienvenue sur Mimesis")).toBeInTheDocument();
  });

  it("redirects to dashboard when a session exists", async () => {
    vi.mocked(useAuthUser).mockReturnValue({
      user: { id: "user-1" } as ReturnType<typeof useAuthUser>["user"],
      session: null,
      role: null,
      user_admin: false,
      isLoading: false,
      refreshUser: vi.fn(),
      updateUserMetadata: vi.fn(),
    } as ReturnType<typeof useAuthUser>);

    renderWithChakra(<Home />);

    await waitFor(() => {
    expect(mockRouter.replace).toHaveBeenCalledWith("/personnas");
    });
  });
});
