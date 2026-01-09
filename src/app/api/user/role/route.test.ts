import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { createServiceSupabaseClient } from "@/lib/supabaseServiceClient";

vi.mock("@/lib/supabaseServiceClient", () => ({
  createServiceSupabaseClient: vi.fn(),
}));

const mockCreateServiceSupabaseClient = vi.mocked(createServiceSupabaseClient);

describe("GET /api/user/role", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when userId is missing", async () => {
    const response = await GET(new NextRequest("http://localhost/api/user/role"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({ error: "Missing 'userId' query parameter" });
  });

  it("returns role for user", async () => {
    mockCreateServiceSupabaseClient.mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            single: vi.fn().mockResolvedValue({ data: { role: "student" }, error: null }),
          }),
        }),
      }),
    } as unknown as ReturnType<typeof mockCreateServiceSupabaseClient>);

    const response = await GET(
      new NextRequest("http://localhost/api/user/role?userId=user-123")
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ role: "student" });
  });
});
