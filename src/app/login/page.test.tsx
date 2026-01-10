import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { useRouter, useSearchParams, type ReadonlyURLSearchParams } from "next/navigation";
import LoginPage from "./page";
import { mockRouter } from "@/test/mocks/router";
import { toaster } from "@/components/ui/toaster";

const signInWithPassword = vi.fn();

vi.mock("next/navigation");
vi.mock("@/lib/authService", () => ({
  authService: {
    signInWithPassword: (...args: unknown[]) => signInWithPassword(...args),
  },
}));
vi.mock("@/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
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
    signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { message: "Invalid login credentials" },
    });

    renderWithChakra(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Adresse e-mail"), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Mot de passe"), {
      target: { value: "wrongpass" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Se connecter/i }));

    await waitFor(() => {
      expect(toaster.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description:
            "Identifiants incorrects. Merci de vérifier votre email et votre mot de passe.",
        })
      );
    });
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

    await waitFor(() => {
      expect(toaster.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: "Impossible de vous connecter pour le moment. Veuillez réessayer.",
        })
      );
    });
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

    await waitFor(() => {
      expect(toaster.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description:
            "Identifiants incorrects. Merci de vérifier votre email et votre mot de passe.",
        })
      );
    });
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

    await waitFor(() => {
      expect(toaster.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: "Impossible de vous connecter pour le moment. Veuillez réessayer.",
        })
      );
    });
  });

  it("shows generic error when sign-in throws", async () => {
    const user = userEvent.setup();
    signInWithPassword.mockRejectedValue(new Error("Network error"));

    renderWithChakra(<LoginPage />);

    await user.type(screen.getByLabelText("Adresse e-mail"), "user@example.com");
    await user.type(screen.getByLabelText("Mot de passe"), "password123");
    const submitButton = screen.getByRole("button", { name: /Se connecter/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(toaster.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: "Impossible de vous connecter pour le moment. Veuillez réessayer.",
        })
      );
    });
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
