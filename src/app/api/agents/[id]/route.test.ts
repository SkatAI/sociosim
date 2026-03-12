import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { PATCH } from "./route";
import { createServiceSupabaseClient } from "@/lib/supabaseServiceClient";
import { getAuthenticatedUser } from "@/lib/supabaseAuthServer";

vi.mock("@/lib/supabaseServiceClient", () => ({
  createServiceSupabaseClient: vi.fn(),
}));

vi.mock("@/lib/supabaseAuthServer", () => ({
  getAuthenticatedUser: vi.fn(),
}));

const mockCreateServiceSupabaseClient = vi.mocked(createServiceSupabaseClient);
const mockGetAuthenticatedUser = vi.mocked(getAuthenticatedUser);

const ADMIN_USER = { id: "user-admin", email: "admin@test.com" };

function mockSupabaseForPatch({
  role = "admin",
  createdBy = "user-admin",
  updateError = null as { message: string } | null,
} = {}) {
  const eq = vi.fn().mockResolvedValue({ error: updateError });
  const update = vi.fn(() => ({ eq }));

  const mockFrom = vi.fn((table: string) => {
    if (table === "users") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: { role }, error: null }),
          }),
        }),
      };
    }
    if (table === "agents") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { created_by: createdBy },
              error: null,
            }),
          }),
        }),
        update,
      };
    }
    return {};
  });

  mockCreateServiceSupabaseClient.mockReturnValue({
    from: mockFrom,
  } as unknown as ReturnType<typeof mockCreateServiceSupabaseClient>);

  return { update, eq };
}

describe("PATCH /api/agents/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthenticatedUser.mockResolvedValue({ user: ADMIN_USER as never, error: null });
  });

  it("returns 401 when not authenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ user: null, error: null });

    const request = new NextRequest("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ agent_name: "Eliot", description: "Desc" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "agent-1" }) });
    expect(response.status).toBe(401);
  });

  it("returns 400 when agent id is missing", async () => {
    const request = new NextRequest("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ agent_name: "Eliot", description: "Desc" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "" }) });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({ error: "Missing agent id" });
  });

  it("returns 400 when required fields are missing", async () => {
    const request = new NextRequest("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ agent_name: "", description: "" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "agent-1" }) });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({ error: "Missing required fields" });
  });

  it("returns 403 when student tries to edit another user's agent", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ user: { id: "student-1" } as never, error: null });
    mockSupabaseForPatch({ role: "student", createdBy: "other-user" });

    const request = new NextRequest("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ agent_name: "Eliot", description: "Desc" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "agent-1" }) });
    expect(response.status).toBe(403);
  });

  it("updates the agent name and description", async () => {
    const { update, eq } = mockSupabaseForPatch();

    const request = new NextRequest("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ agent_name: "Eliot", description: "Desc" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "agent-1" }) });

    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith({ agent_name: "Eliot", description: "Desc" });
    expect(eq).toHaveBeenCalledWith("id", "agent-1");
  });

  it("returns 500 when update fails", async () => {
    mockSupabaseForPatch({ updateError: { message: "fail" } });

    const request = new NextRequest("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ agent_name: "Eliot", description: "Desc" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "agent-1" }) });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toMatchObject({ error: "fail" });
  });
});
