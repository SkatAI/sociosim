import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";
import Providers from "@/app/providers";
import Header from "@/app/components/Header";
import { supabase } from "@/lib/supabaseClient";
import { mockRouter } from "@/test/mocks/router";

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(),
  },
}));

describe("Header auth integration", () => {
  const mockSupabase = supabase as unknown as {
    auth: {
      getSession: ReturnType<typeof vi.fn>;
      onAuthStateChange: ReturnType<typeof vi.fn>;
      signOut: ReturnType<typeof vi.fn>;
    };
    from: ReturnType<typeof vi.fn>;
  };

  let authCallback: ((event: string, session: unknown) => void) | null = null;

  beforeEach(() => {
    vi.mocked(useRouter).mockReturnValue(mockRouter as ReturnType<typeof useRouter>);

    mockSupabase.auth.getSession = vi.fn().mockResolvedValue({
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
    mockSupabase.auth.signOut = vi.fn().mockResolvedValue({ error: null });
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

    expect(mockSupabase.auth.signOut).toHaveBeenCalled();
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
