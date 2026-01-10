import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import ManageUsersClient from "./ManageUsersClient";
import { useAuthUser } from "@/hooks/useAuthUser";
import { mockRouter } from "@/test/mocks/router";
import { createMockAuthUser } from "@/test/mocks/useAuthUser";

vi.mock("next/navigation");
vi.mock("@/hooks/useAuthUser");

function renderWithChakra(component: React.ReactElement) {
  return render(<ChakraProvider value={defaultSystem}>{component}</ChakraProvider>);
}

describe("ManageUsersClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue(mockRouter as ReturnType<typeof useRouter>);
    vi.mocked(useAuthUser).mockReturnValue(createMockAuthUser() as ReturnType<typeof useAuthUser>);
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
});
