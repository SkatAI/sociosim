import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter, useSearchParams, type ReadonlyURLSearchParams } from "next/navigation";
import Providers from "@/app/providers";
import Header from "@/app/components/Header";
import LoginPage from "@/app/login/page";
import { supabase } from "@/lib/supabaseClient";
import { mockRouter } from "@/test/mocks/router";

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
    from: vi.fn(),
  },
}));

describe("Auth flow integration", () => {
  const mockSupabase = supabase as unknown as {
    auth: {
      getSession: ReturnType<typeof vi.fn>;
      signInWithPassword: ReturnType<typeof vi.fn>;
      signOut: ReturnType<typeof vi.fn>;
      onAuthStateChange: ReturnType<typeof vi.fn>;
    };
    from: ReturnType<typeof vi.fn>;
  };

  let authCallback: ((event: string, session: unknown) => void) | null = null;

  beforeEach(() => {
    vi.mocked(useRouter).mockReturnValue(mockRouter as ReturnType<typeof useRouter>);
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams() as unknown as ReadonlyURLSearchParams
    );

    mockSupabase.auth.getSession = vi.fn().mockResolvedValue({
      data: {
        session: null,
      },
    });
    mockSupabase.auth.signOut = vi.fn().mockResolvedValue({ error: null });
    mockSupabase.auth.signInWithPassword = vi.fn().mockResolvedValue({
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
    mockSupabase.auth.onAuthStateChange = vi.fn((callback: (event: string, session: unknown) => void) => {
      authCallback = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    mockSupabase.from = vi.fn(() => ({
      select: () => ({
        eq: () => ({
          single: vi.fn().mockResolvedValue({ data: { role: "student" }, error: null }),
        }),
      }),
    }));
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
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
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
