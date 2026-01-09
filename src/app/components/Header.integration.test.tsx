import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";
import Providers from "@/app/providers";
import Header from "@/app/components/Header";
import { authService } from "@/lib/authService";
import { mockRouter } from "@/test/mocks/router";

vi.mock("@/lib/authService", () => ({
  authService: {
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
    signOutLocal: vi.fn(),
  },
}));

describe("Header auth integration", () => {
  const mockAuthService = authService as unknown as {
    getSession: ReturnType<typeof vi.fn>;
    onAuthStateChange: ReturnType<typeof vi.fn>;
    signOutLocal: ReturnType<typeof vi.fn>;
  };

  let authCallback: ((event: string, session: unknown) => void) | null = null;

  beforeEach(() => {
    vi.mocked(useRouter).mockReturnValue(mockRouter as ReturnType<typeof useRouter>);

    mockAuthService.getSession = vi.fn().mockResolvedValue({
      data: {
        session: {
          user: {
            id: "user-1",
            email: "user@example.com",
            user_metadata: { firstName: "Test", lastName: "User" },
          },
        },
      },
    });
    mockAuthService.signOutLocal = vi.fn().mockResolvedValue({ error: null });
    mockAuthService.onAuthStateChange = vi.fn((callback: (event: string, session: unknown) => void) => {
      authCallback = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ role: "student" }),
    });
  });

  it("logs out when user is present", async () => {
    const user = userEvent.setup();

    render(
      <Providers>
        <Header />
      </Providers>
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Déconnexion")).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText("Déconnexion"));

    expect(mockAuthService.signOutLocal).toHaveBeenCalled();
    expect(mockRouter.replace).toHaveBeenCalledWith("/login");
  });

  it("updates UI after auth state sign-out", async () => {
    render(
      <Providers>
        <Header />
      </Providers>
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Déconnexion")).toBeInTheDocument();
    });

    await act(async () => {
      authCallback?.("SIGNED_OUT", null);
    });

    await waitFor(() => {
      expect(screen.getByText("Se connecter")).toBeInTheDocument();
    });
  });
});
