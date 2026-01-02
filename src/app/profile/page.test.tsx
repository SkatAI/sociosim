import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import ProfilePage from "./page";
import { useAuthUser } from "@/hooks/useAuthUser";
import { mockRouter } from "@/test/mocks/router";
import { createMockAuthUser } from "@/test/mocks/useAuthUser";

vi.mock("next/navigation");
vi.mock("@/hooks/useAuthUser");

function renderWithChakra(component: React.ReactElement) {
  return render(<ChakraProvider value={defaultSystem}>{component}</ChakraProvider>);
}

describe("ProfilePage password update", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue(mockRouter as ReturnType<typeof useRouter>);
    vi.mocked(useAuthUser).mockReturnValue(createMockAuthUser() as ReturnType<typeof useAuthUser>);
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: "Profil mis à jour avec succès." }),
    });
  });

  it("shows validation errors for short password", async () => {
    const user = userEvent.setup();

    renderWithChakra(<ProfilePage />);

    await user.type(screen.getByLabelText("Nouveau mot de passe"), "short");
    await user.type(screen.getByLabelText("Confirmez le mot de passe"), "short");
    await user.click(screen.getByRole("button", { name: /Enregistrer/i }));

    expect(
      await screen.findByText(/Votre mot de passe doit contenir au moins 8 caractères/i)
    ).toBeInTheDocument();
  });

  it("shows validation error when confirmation mismatches", async () => {
    const user = userEvent.setup();

    renderWithChakra(<ProfilePage />);

    await user.type(screen.getByLabelText("Nouveau mot de passe"), "longenough");
    await user.type(screen.getByLabelText("Confirmez le mot de passe"), "different");
    await user.click(screen.getByRole("button", { name: /Enregistrer/i }));

    expect(
      await screen.findByText(/La confirmation ne correspond pas au mot de passe/i)
    ).toBeInTheDocument();
  });

  it("submits password change when valid", async () => {
    const user = userEvent.setup();

    renderWithChakra(<ProfilePage />);

    await user.type(screen.getByLabelText("Nouveau mot de passe"), "longenough");
    await user.type(screen.getByLabelText("Confirmez le mot de passe"), "longenough");
    await user.click(screen.getByRole("button", { name: /Enregistrer/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] ?? [];
    expect(JSON.parse(options?.body)).toEqual({
      firstName: "Test",
      lastName: "User",
      password: "longenough",
    });
  });
});
