import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { useRouter, useSearchParams, type ReadonlyURLSearchParams } from "next/navigation";
import ResetPasswordConfirmPage from "./page";
import { mockRouter } from "@/test/mocks/router";

vi.mock("next/navigation");

function renderWithChakra(component: React.ReactElement) {
  return render(<ChakraProvider value={defaultSystem}>{component}</ChakraProvider>);
}

describe("ResetPasswordConfirmPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue(mockRouter as ReturnType<typeof useRouter>);
    global.fetch = vi.fn();
  });

  it("shows error when token is missing", async () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams() as unknown as ReadonlyURLSearchParams
    );

    renderWithChakra(<ResetPasswordConfirmPage />);

    const form = document.querySelector("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form as HTMLFormElement);

    expect(await screen.findByText(/invalide ou expiré/i)).toBeInTheDocument();
  });

  it("shows validation error for short password", async () => {
    const user = userEvent.setup();
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams({ token: "token-123" }) as unknown as ReadonlyURLSearchParams
    );

    renderWithChakra(<ResetPasswordConfirmPage />);

    await user.type(screen.getByLabelText("Nouveau mot de passe"), "short");
    await user.type(screen.getByLabelText("Confirmez le mot de passe"), "short");
    await user.click(screen.getByRole("button", { name: /Réinitialiser/i }));

    expect(await screen.findByText(/au moins 8 caractères/i)).toBeInTheDocument();
  });

  it("shows validation error when confirmation mismatches", async () => {
    const user = userEvent.setup();
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams({ token: "token-123" }) as unknown as ReadonlyURLSearchParams
    );

    renderWithChakra(<ResetPasswordConfirmPage />);

    await user.type(screen.getByLabelText("Nouveau mot de passe"), "longenough");
    await user.type(screen.getByLabelText("Confirmez le mot de passe"), "different");
    await user.click(screen.getByRole("button", { name: /Réinitialiser/i }));

    expect(await screen.findByText(/confirmation ne correspond pas/i)).toBeInTheDocument();
  });

  it("redirects on success", async () => {
    const user = userEvent.setup();
    vi.mocked(useRouter).mockReturnValue(mockRouter as ReturnType<typeof useRouter>);
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams({ token: "token-123" }) as unknown as ReadonlyURLSearchParams
    );
    global.fetch = vi.fn().mockResolvedValue({ ok: true });

    renderWithChakra(<ResetPasswordConfirmPage />);

    await user.type(screen.getByLabelText("Nouveau mot de passe"), "longenough");
    await user.type(screen.getByLabelText("Confirmez le mot de passe"), "longenough");
    await user.click(screen.getByRole("button", { name: /Réinitialiser/i }));

    expect(mockRouter.replace).toHaveBeenCalledWith("/login?password=reset");
  });

  it("shows API error message on failure", async () => {
    const user = userEvent.setup();
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams({ token: "token-123" }) as unknown as ReadonlyURLSearchParams
    );
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Lien invalide" }),
    });

    renderWithChakra(<ResetPasswordConfirmPage />);

    await user.type(screen.getByLabelText("Nouveau mot de passe"), "longenough");
    await user.type(screen.getByLabelText("Confirmez le mot de passe"), "longenough");
    await user.click(screen.getByRole("button", { name: /Réinitialiser/i }));

    expect(await screen.findByText("Lien invalide")).toBeInTheDocument();
  });
});
