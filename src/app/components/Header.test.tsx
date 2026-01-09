import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import Header from "./Header";
import { useAuthUser } from "@/hooks/useAuthUser";
import { mockRouter } from "@/test/mocks/router";
import { mockUseAuthUser } from "@/test/mocks/useAuthUser";

const signOutLocal = vi.fn().mockResolvedValue({ error: null });

vi.mock("next/navigation");
vi.mock("@/hooks/useAuthUser");
vi.mock("@/lib/authService", () => ({
  authService: {
    signOutLocal: (...args: unknown[]) => signOutLocal(...args),
  },
}));

function renderWithChakra(component: React.ReactElement) {
  return render(<ChakraProvider value={defaultSystem}>{component}</ChakraProvider>);
}

describe("Header", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue(mockRouter as ReturnType<typeof useRouter>);
    vi.mocked(useAuthUser).mockReturnValue(mockUseAuthUser as ReturnType<typeof useAuthUser>);
  });

  it("logs out and redirects", async () => {
    const user = userEvent.setup();
    vi.mocked(useRouter).mockReturnValue(mockRouter as ReturnType<typeof useRouter>);

    renderWithChakra(<Header />);

    await user.click(screen.getByLabelText("Déconnexion"));

    expect(signOutLocal).toHaveBeenCalled();
    expect(mockRouter.replace).toHaveBeenCalledWith("/login");
  });
});
