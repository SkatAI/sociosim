import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import ResetPasswordPage from "./page";

function renderWithChakra(component: React.ReactElement) {
  return render(<ChakraProvider value={defaultSystem}>{component}</ChakraProvider>);
}

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("shows API error message on failure", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Email inconnu" }),
    });

    renderWithChakra(<ResetPasswordPage />);

    await user.type(screen.getByLabelText("Adresse e-mail"), "user@example.com");
    await user.click(screen.getByRole("button", { name: /Envoyer le lien/i }));

    expect(await screen.findByText("Email inconnu")).toBeInTheDocument();
  });

  it("shows success state on ok response", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    renderWithChakra(<ResetPasswordPage />);

    await user.type(screen.getByLabelText("Adresse e-mail"), "user@example.com");
    await user.click(screen.getByRole("button", { name: /Envoyer le lien/i }));

    expect(await screen.findByText(/Lien envoyé/i)).toBeInTheDocument();
  });
});
