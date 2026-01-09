import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter, useSearchParams, type ReadonlyURLSearchParams } from "next/navigation";
import Providers from "@/app/providers";
import Header from "@/app/components/Header";
import LoginPage from "@/app/login/page";
import { authService } from "@/lib/authService";
import { mockRouter } from "@/test/mocks/router";

vi.mock("@/lib/authService", () => ({
  authService: {
    getSession: vi.fn(),
    signInWithPassword: vi.fn(),
    signOutLocal: vi.fn(),
    onAuthStateChange: vi.fn(),
  },
}));

describe("Auth flow integration", () => {
  const mockAuthService = authService as unknown as {
    getSession: ReturnType<typeof vi.fn>;
    signInWithPassword: ReturnType<typeof vi.fn>;
    signOutLocal: ReturnType<typeof vi.fn>;
    onAuthStateChange: ReturnType<typeof vi.fn>;
  };

  let authCallback: ((event: string, session: unknown) => void) | null = null;

  beforeEach(() => {
    vi.mocked(useRouter).mockReturnValue(mockRouter as ReturnType<typeof useRouter>);
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams() as unknown as ReadonlyURLSearchParams
    );

    mockAuthService.getSession = vi.fn().mockResolvedValue({
      data: {
        session: null,
      },
    });
    mockAuthService.signOutLocal = vi.fn().mockResolvedValue({ error: null });
    mockAuthService.signInWithPassword = vi.fn().mockResolvedValue({
      data: {
        session: {
          user: {
            id: "user-1",
            email: "user@example.com",
            user_metadata: { firstName: "Test", lastName: "User" },
          },
        },
      },
      error: null,
    });
    mockAuthService.onAuthStateChange = vi.fn((callback: (event: string, session: unknown) => void) => {
      authCallback = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ role: "student" }),
    });
  });

  it(
    "updates header after sign-in and sign-out events",
    async () => {
      const user = userEvent.setup();

    render(
      <Providers>
        <Header />
        <LoginPage />
      </Providers>
    );

    const header = screen.getByRole("banner");

    await user.type(screen.getByLabelText("Adresse e-mail"), "user@example.com");
    await user.type(screen.getByLabelText("Mot de passe"), "password123");
    await user.click(screen.getByRole("button", { name: /Se connecter/i }));

    await act(async () => {
      authCallback?.("SIGNED_IN", {
        access_token: "access-token",
        user: {
          id: "user-1",
          email: "user@example.com",
          user_metadata: { firstName: "Test", lastName: "User" },
        },
      });
    });

    await waitFor(() => {
      expect(within(header).getByLabelText("Déconnexion")).toBeInTheDocument();
    });

    await user.click(within(header).getByLabelText("Déconnexion"));
    await waitFor(() => {
      expect(mockAuthService.signOutLocal).toHaveBeenCalled();
    });

    await act(async () => {
      authCallback?.("SIGNED_OUT", null);
    });

    await waitFor(() => {
      expect(within(header).queryByLabelText("Déconnexion")).not.toBeInTheDocument();
      expect(within(header).getByRole("link", { name: "Se connecter" })).toBeInTheDocument();
    });
    },
    15000
  );
});
