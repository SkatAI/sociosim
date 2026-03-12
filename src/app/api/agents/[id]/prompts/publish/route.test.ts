import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
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

describe("POST /api/agents/:id/prompts/publish", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthenticatedUser.mockResolvedValue({ user: ADMIN_USER as never, error: null });
  });

  it("returns 401 when not authenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ user: null, error: null });

    const request = new NextRequest("http://localhost", {
      method: "POST",
      body: JSON.stringify({ promptId: "prompt-1" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request, { params: Promise.resolve({ id: "agent-1" }) });
    expect(response.status).toBe(401);
  });

  it("returns 400 when agent id is missing", async () => {
    const request = new NextRequest("http://localhost", {
      method: "POST",
      body: JSON.stringify({ promptId: "prompt-1" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request, { params: Promise.resolve({ id: "" }) });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({ error: "Missing agent id" });
  });

  it("returns 400 when prompt id is missing", async () => {
    const request = new NextRequest("http://localhost", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request, { params: Promise.resolve({ id: "agent-1" }) });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({ error: "Missing prompt id" });
  });

  it("returns 403 when student publishes another user's agent", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ user: { id: "student-1" } as never, error: null });

    const mockFrom = vi.fn((table: string) => {
      if (table === "users") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: { role: "student" }, error: null }),
            }),
          }),
        };
      }
      if (table === "agents") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: { created_by: "other-user" }, error: null }),
            }),
          }),
        };
      }
      return {};
    });

    mockCreateServiceSupabaseClient.mockReturnValue({
      from: mockFrom,
    } as unknown as ReturnType<typeof mockCreateServiceSupabaseClient>);

    const request = new NextRequest("http://localhost", {
      method: "POST",
      body: JSON.stringify({ promptId: "prompt-1" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request, { params: Promise.resolve({ id: "agent-1" }) });
    expect(response.status).toBe(403);
  });

  it("publishes the selected prompt", async () => {
    const update = vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }));

    const mockFrom = vi.fn((table: string) => {
      if (table === "users") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: { role: "admin" }, error: null }),
            }),
          }),
        };
      }
      if (table === "agents") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: { created_by: ADMIN_USER.id }, error: null }),
            }),
          }),
        };
      }
      if (table === "agent_prompts") {
        return { update };
      }
      return {};
    });

    mockCreateServiceSupabaseClient.mockReturnValue({
      from: mockFrom,
    } as unknown as ReturnType<typeof mockCreateServiceSupabaseClient>);

    const request = new NextRequest("http://localhost", {
      method: "POST",
      body: JSON.stringify({ promptId: "prompt-1" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request, { params: Promise.resolve({ id: "agent-1" }) });

    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledTimes(2);
    expect(update).toHaveBeenNthCalledWith(1, { published: false });
    expect(update).toHaveBeenNthCalledWith(2, { published: true });
  });
});
