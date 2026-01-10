import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { PATCH } from "./route";
import { createServiceSupabaseClient } from "@/lib/supabaseServiceClient";

vi.mock("@/lib/supabaseServiceClient", () => ({
  createServiceSupabaseClient: vi.fn(),
}));

const mockCreateServiceSupabaseClient = vi.mocked(createServiceSupabaseClient);

describe("PATCH /api/users/[id]/ban", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates ban status", async () => {
    const updateUserById = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: "user-1",
              name: "Test User",
              email: "test@example.com",
              role: "student",
              is_banned: true,
            },
            error: null,
          }),
        }),
      }),
    });

    mockCreateServiceSupabaseClient.mockReturnValue({
      auth: {
        admin: {
          updateUserById,
        },
      },
      from: () => ({
        update,
      }),
    } as unknown as ReturnType<typeof mockCreateServiceSupabaseClient>);

    const request = new NextRequest("http://localhost/api/users/user-1/ban", {
      method: "PATCH",
      body: JSON.stringify({ isBanned: true }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "user-1" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(updateUserById).toHaveBeenCalledWith("user-1", {
      ban_duration: "100000h",
    });
    expect(body).toMatchObject({
      user: {
        id: "user-1",
        name: "Test User",
        email: "test@example.com",
        role: "student",
        is_banned: true,
      },
    });
  });
});
