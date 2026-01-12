import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import userEvent from "@testing-library/user-event";
import ManageUsersClient from "./ManageUsersClient";
import { useAuthUser } from "@/hooks/useAuthUser";
import { mockRouter } from "@/test/mocks/router";
import { createMockAuthUser } from "@/test/mocks/useAuthUser";

vi.mock("next/navigation");
vi.mock("@/hooks/useAuthUser");
vi.mock("@/components/ui/toaster", () => ({
  toaster: { create: vi.fn() },
}));

function renderWithChakra(component: React.ReactElement) {
  return render(<ChakraProvider value={defaultSystem}>{component}</ChakraProvider>);
}

describe("ManageUsersClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue(mockRouter as ReturnType<typeof useRouter>);
    vi.mocked(useAuthUser).mockReturnValue(
      createMockAuthUser({ user_admin: true }) as ReturnType<typeof useAuthUser>
    );
  });

  it("renders users list", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        users: [
          {
            id: "user-1",
            name: "Admin User",
            email: "admin@example.com",
            role: "admin",
            is_banned: false,
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    renderWithChakra(<ManageUsersClient />);

    await waitFor(() => {
      expect(screen.getByText("Admin User")).toBeInTheDocument();
      expect(screen.getByText("admin@example.com")).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "Admin" })).toBeInTheDocument();
  });

  it("redirects when user is not logged in", async () => {
    vi.mocked(useAuthUser).mockReturnValue(
      createMockAuthUser({ user: null, isLoading: false }) as ReturnType<typeof useAuthUser>
    );
    const mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);

    renderWithChakra(<ManageUsersClient />);

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith("/login");
    });
  });

  it("redirects when user is not admin", async () => {
    vi.mocked(useAuthUser).mockReturnValue(
      createMockAuthUser({ user_admin: false }) as ReturnType<typeof useAuthUser>
    );
    const mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);

    renderWithChakra(<ManageUsersClient />);

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("invites a user and resets the form", async () => {
    const user = userEvent.setup();
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ users: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          user: {
            id: "user-2",
            name: "New User",
            email: "new@example.com",
            role: "student",
            is_banned: false,
          },
        }),
      });
    vi.stubGlobal("fetch", mockFetch);

    renderWithChakra(<ManageUsersClient />);

    await waitFor(() => {
      expect(screen.queryByText("Chargement des utilisateurs...")).not.toBeInTheDocument();
    });

    await user.type(screen.getByLabelText("Adresse e-mail"), "new@example.com");
    await user.type(screen.getByLabelText("Nom"), "New User");
    await user.click(screen.getByLabelText("Inviter un utilisateur"));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenLastCalledWith(
        "/api/users",
        expect.objectContaining({
          method: "POST",
        })
      );
    });

    expect(screen.getByLabelText("Adresse e-mail")).toHaveValue("");
    expect(screen.getByLabelText("Nom")).toHaveValue("");
  });
});
