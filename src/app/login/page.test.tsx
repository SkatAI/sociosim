import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { useRouter, useSearchParams, type ReadonlyURLSearchParams } from "next/navigation";
import LoginPage from "./page";
import { mockRouter } from "@/test/mocks/router";

const signInWithPassword = vi.fn();

vi.mock("next/navigation");
vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: unknown[]) => signInWithPassword(...args),
    },
  },
}));

function renderWithChakra(component: React.ReactElement) {
  return render(<ChakraProvider value={defaultSystem}>{component}</ChakraProvider>);
}

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue(mockRouter as ReturnType<typeof useRouter>);
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams() as unknown as ReadonlyURLSearchParams
    );
  });

  it("shows error message for invalid credentials", async () => {
    const user = userEvent.setup();
    signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { message: "Invalid login credentials" },
    });

    renderWithChakra(<LoginPage />);

    await user.type(screen.getByLabelText("Adresse e-mail"), "user@example.com");
    await user.type(screen.getByLabelText("Mot de passe"), "wrongpass");
    await user.click(screen.getByRole("button", { name: /Se connecter/i }));

    const errors = await screen.findAllByText(/Identifiants incorrects/i);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("shows generic error message on sign-in failure", async () => {
    const user = userEvent.setup();
    signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { message: "Some other error" },
    });

    renderWithChakra(<LoginPage />);

    await user.type(screen.getByLabelText("Adresse e-mail"), "user@example.com");
    await user.type(screen.getByLabelText("Mot de passe"), "wrongpass");
    await user.click(screen.getByRole("button", { name: /Se connecter/i }));

    const errors = await screen.findAllByText(/Impossible de vous connecter/i);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("re-enables submit button after failed sign-in", async () => {
    const user = userEvent.setup();
    signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { message: "Invalid login credentials" },
    });

    renderWithChakra(<LoginPage />);

    await user.type(screen.getByLabelText("Adresse e-mail"), "user@example.com");
    await user.type(screen.getByLabelText("Mot de passe"), "wrongpass");
    const submitButton = screen.getByRole("button", { name: /Se connecter/i });
    await user.click(submitButton);

    const errors = await screen.findAllByText(/Identifiants incorrects/i);
    expect(errors.length).toBeGreaterThan(0);
    expect(submitButton).not.toBeDisabled();
  });

  it("shows generic error when sign-in returns no session and no error", async () => {
    const user = userEvent.setup();
    signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    renderWithChakra(<LoginPage />);

    await user.type(screen.getByLabelText("Adresse e-mail"), "user@example.com");
    await user.type(screen.getByLabelText("Mot de passe"), "password123");
    await user.click(screen.getByRole("button", { name: /Se connecter/i }));

    const errors = await screen.findAllByText(/Impossible de vous connecter/i);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("shows generic error when sign-in throws", async () => {
    const user = userEvent.setup();
    signInWithPassword.mockRejectedValue(new Error("Network error"));

    renderWithChakra(<LoginPage />);

    await user.type(screen.getByLabelText("Adresse e-mail"), "user@example.com");
    await user.type(screen.getByLabelText("Mot de passe"), "password123");
    const submitButton = screen.getByRole("button", { name: /Se connecter/i });
    await user.click(submitButton);

    const errors = await screen.findAllByText(/Impossible de vous connecter/i);
    expect(errors.length).toBeGreaterThan(0);
    expect(submitButton).not.toBeDisabled();
  });

  it("redirects on successful sign-in", async () => {
    const user = userEvent.setup();
    vi.mocked(useRouter).mockReturnValue(mockRouter as ReturnType<typeof useRouter>);
    signInWithPassword.mockResolvedValue({
      data: { session: { user: { id: "user-1" } } },
      error: null,
    });

    renderWithChakra(<LoginPage />);

    await user.type(screen.getByLabelText("Adresse e-mail"), "user@example.com");
    await user.type(screen.getByLabelText("Mot de passe"), "correctpass");
    await user.click(screen.getByRole("button", { name: /Se connecter/i }));

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith("/dashboard");
    });
  });
});
