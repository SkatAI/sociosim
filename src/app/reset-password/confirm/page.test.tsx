import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import ResetPasswordConfirmPage from "./page";
import { mockRouter } from "@/test/mocks/router";

vi.mock("next/navigation");
const setSession = vi.fn();
const exchangeCodeForSession = vi.fn();
const getSession = vi.fn();
const updateUser = vi.fn();
const signOut = vi.fn();
const unsubscribe = vi.fn();
const onAuthStateChange = vi.fn().mockReturnValue({
  data: {
    subscription: { unsubscribe },
  },
});

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    auth: {
      setSession: (...args: unknown[]) => setSession(...args),
      exchangeCodeForSession: (...args: unknown[]) => exchangeCodeForSession(...args),
      getSession: (...args: unknown[]) => getSession(...args),
      updateUser: (...args: unknown[]) => updateUser(...args),
      signOut: (...args: unknown[]) => signOut(...args),
      onAuthStateChange: (...args: unknown[]) => onAuthStateChange(...args),
    },
  },
}));

function renderWithChakra(component: React.ReactElement) {
  return render(<ChakraProvider value={defaultSystem}>{component}</ChakraProvider>);
}

describe("ResetPasswordConfirmPage", () => {
  const waitForFormReady = async () => {
    await waitFor(() => {
      expect(screen.getByLabelText("Nouveau mot de passe")).not.toBeDisabled();
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue(mockRouter as ReturnType<typeof useRouter>);
    setSession.mockResolvedValue({ error: null });
    exchangeCodeForSession.mockResolvedValue({ error: null });
    getSession.mockResolvedValue({ data: { session: null } });
    updateUser.mockResolvedValue({ error: null });
    signOut.mockResolvedValue({ error: null });
    onAuthStateChange.mockReturnValue({
      data: {
        subscription: { unsubscribe },
      },
    });
    window.history.replaceState({}, document.title, "http://localhost:3000/reset-password/confirm");
  });

  it("shows error when token is missing", async () => {
    renderWithChakra(<ResetPasswordConfirmPage />);

    expect(await screen.findByText(/invalide ou expiré/i)).toBeInTheDocument();
  });

  it("shows validation error for short password", async () => {
    const user = userEvent.setup();
    window.location.hash = "#access_token=token-123&refresh_token=refresh-123";
    getSession.mockResolvedValue({
      data: {
        session: { user: { id: "user-1" } },
      },
    });

    renderWithChakra(<ResetPasswordConfirmPage />);

    expect(screen.getByLabelText("Nouveau mot de passe")).toBeDisabled();
    await waitForFormReady();
    await user.type(screen.getByLabelText("Nouveau mot de passe"), "short");
    await user.type(screen.getByLabelText("Confirmez le mot de passe"), "short");
    await user.click(screen.getByRole("button", { name: /Réinitialiser/i }));

    expect(await screen.findByText(/au moins 8 caractères/i)).toBeInTheDocument();
  });

  it("clears the recovery hash after session hydration", async () => {
    window.location.hash = "#access_token=token-123&refresh_token=refresh-123";
    getSession.mockResolvedValue({
      data: {
        session: { user: { id: "user-1" } },
      },
    });

    renderWithChakra(<ResetPasswordConfirmPage />);

    await waitForFormReady();
    expect(window.location.hash).toBe("");
  });

  it("shows validation error when confirmation mismatches", async () => {
    const user = userEvent.setup();
    window.location.hash = "#access_token=token-123&refresh_token=refresh-123";
    getSession.mockResolvedValue({
      data: {
        session: { user: { id: "user-1" } },
      },
    });

    renderWithChakra(<ResetPasswordConfirmPage />);

    await waitForFormReady();
    await user.type(screen.getByLabelText("Nouveau mot de passe"), "longenough");
    await user.type(screen.getByLabelText("Confirmez le mot de passe"), "different");
    await user.click(screen.getByRole("button", { name: /Réinitialiser/i }));

    expect(await screen.findByText(/confirmation ne correspond pas/i)).toBeInTheDocument();
  });

  it("redirects on success", async () => {
    const user = userEvent.setup();
    vi.mocked(useRouter).mockReturnValue(mockRouter as ReturnType<typeof useRouter>);
    window.location.hash = "#access_token=token-123&refresh_token=refresh-123";
    getSession.mockResolvedValue({
      data: {
        session: { user: { id: "user-1" } },
      },
    });

    renderWithChakra(<ResetPasswordConfirmPage />);

    await waitForFormReady();
    await user.type(screen.getByLabelText("Nouveau mot de passe"), "longenough");
    await user.type(screen.getByLabelText("Confirmez le mot de passe"), "longenough");
    await user.click(screen.getByRole("button", { name: /Réinitialiser/i }));

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith("/login?password=reset");
    });
  });

  it("shows error message on update failure", async () => {
    const user = userEvent.setup();
    window.location.hash = "#access_token=token-123&refresh_token=refresh-123";
    getSession.mockResolvedValue({
      data: {
        session: { user: { id: "user-1" } },
      },
    });
    updateUser.mockResolvedValue({ error: { message: "Lien invalide" } });
    const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const originalSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ message: "Lien invalide" }),
    });

    renderWithChakra(<ResetPasswordConfirmPage />);

    await waitForFormReady();
    await user.type(screen.getByLabelText("Nouveau mot de passe"), "longenough");
    await user.type(screen.getByLabelText("Confirmez le mot de passe"), "longenough");
    await user.click(screen.getByRole("button", { name: /Réinitialiser/i }));

    expect(await screen.findByText("Lien invalide")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Réinitialiser/i })).not.toBeDisabled();
    });
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalSupabaseAnonKey;
  });
});
