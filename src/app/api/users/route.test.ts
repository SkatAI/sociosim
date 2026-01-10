import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { createServiceSupabaseClient } from "@/lib/supabaseServiceClient";

vi.mock("@/lib/supabaseServiceClient", () => ({
  createServiceSupabaseClient: vi.fn(),
}));

const mockCreateServiceSupabaseClient = vi.mocked(createServiceSupabaseClient);

describe("GET /api/users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns users list", async () => {
    mockCreateServiceSupabaseClient.mockReturnValue({
      from: () => ({
        select: () => ({
          data: [
            { id: "user-1", name: "Admin User", email: "admin@example.com", role: "admin" },
          ],
          error: null,
        }),
      }),
    } as unknown as ReturnType<typeof mockCreateServiceSupabaseClient>);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      users: [
        {
          id: "user-1",
          name: "Admin User",
          email: "admin@example.com",
          role: "admin",
        },
      ],
    });
  });

  it("returns 500 when profile query fails", async () => {
    mockCreateServiceSupabaseClient.mockReturnValue({
      from: () => ({
        select: () => ({
          data: null,
          error: { message: "boom" },
        }),
      }),
    } as unknown as ReturnType<typeof mockCreateServiceSupabaseClient>);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toMatchObject({ error: "Impossible de charger les utilisateurs." });
  });
});
