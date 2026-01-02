import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import RegisterPage from "./page";
import { mockRouter } from "@/test/mocks/router";

vi.mock("next/navigation");

function renderWithChakra(component: React.ReactElement) {
  return render(<ChakraProvider value={defaultSystem}>{component}</ChakraProvider>);
}

describe("RegisterPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue(mockRouter as ReturnType<typeof useRouter>);
    global.fetch = vi.fn();
  });

  it("shows validation errors for empty form", async () => {
    renderWithChakra(<RegisterPage />);

    const form = document.querySelector("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form as HTMLFormElement);

    expect(await screen.findByText("Votre prénom est requis.")).toBeInTheDocument();
    expect(await screen.findByText("Votre nom est requis.")).toBeInTheDocument();
    expect(await screen.findByText("Votre adresse e-mail est requise.")).toBeInTheDocument();
    expect(await screen.findByText("Votre mot de passe est requis.")).toBeInTheDocument();
    expect(await screen.findByText("Merci de confirmer votre mot de passe.")).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("shows validation errors for invalid email and password mismatch", async () => {
    const user = userEvent.setup();
    renderWithChakra(<RegisterPage />);

    await user.type(screen.getByLabelText("Prénom"), "Ada");
    await user.type(screen.getByLabelText("Nom"), "Lovelace");
    await user.type(screen.getByLabelText("Adresse e-mail"), "invalid-email");
    await user.type(screen.getByLabelText("Mot de passe"), "short");
    await user.type(screen.getByLabelText("Confirmez le mot de passe"), "different");

    const form = document.querySelector("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form as HTMLFormElement);

    expect(await screen.findByText("Merci de fournir une adresse e-mail valide.")).toBeInTheDocument();
    expect(await screen.findByText("Votre mot de passe doit contenir au moins 8 caractères.")).toBeInTheDocument();
    expect(await screen.findByText("La confirmation ne correspond pas au mot de passe.")).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("submits valid data and redirects on success", async () => {
    const user = userEvent.setup();
    vi.mocked(useRouter).mockReturnValue(mockRouter as ReturnType<typeof useRouter>);
    global.fetch = vi.fn().mockResolvedValue({ ok: true });

    renderWithChakra(<RegisterPage />);

    await user.type(screen.getByLabelText("Prénom"), " Ada ");
    await user.type(screen.getByLabelText("Nom"), " Lovelace ");
    await user.type(screen.getByLabelText("Adresse e-mail"), "ada@example.com ");
    await user.type(screen.getByLabelText("Mot de passe"), "longenough");
    await user.type(screen.getByLabelText("Confirmez le mot de passe"), "longenough");

    await user.click(screen.getByRole("button", { name: /Créer mon compte/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    const [url, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] ?? [];
    expect(url).toBe("/api/register");
    expect(options?.method).toBe("POST");
    expect(JSON.parse(options?.body)).toEqual({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      password: "longenough",
    });
    expect(mockRouter.replace).toHaveBeenCalledWith("/login?signup=success");
  });

  it("shows server error message on failure", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Erreur serveur" }),
    });

    renderWithChakra(<RegisterPage />);

    await user.type(screen.getByLabelText("Prénom"), "Ada");
    await user.type(screen.getByLabelText("Nom"), "Lovelace");
    await user.type(screen.getByLabelText("Adresse e-mail"), "ada@example.com");
    await user.type(screen.getByLabelText("Mot de passe"), "longenough");
    await user.type(screen.getByLabelText("Confirmez le mot de passe"), "longenough");

    await user.click(screen.getByRole("button", { name: /Créer mon compte/i }));

    expect(await screen.findByText("Erreur serveur")).toBeInTheDocument();
  });
});
