import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";
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

describe("GET /api/agents/:id/prompts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when agent id is missing", async () => {
    const response = await GET(new NextRequest("http://localhost"), {
      params: Promise.resolve({ id: "" }),
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({ error: "Missing agent id" });
  });

  it("returns agent and prompts when found", async () => {
    const mockFrom = vi.fn((table: string) => {
      if (table === "agents") {
        return {
          select: () => ({
            eq: () => ({
              single: vi.fn().mockResolvedValue({
                data: { id: "agent-1", agent_name: "Eliot", description: "Desc" },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "agent_prompts") {
        return {
          select: () => ({
            eq: () => ({
              order: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: "prompt-1",
                    system_prompt: "Salut",
                    version: 1,
                    last_edited: "2024-01-01T00:00:00Z",
                    published: true,
                    users: { name: "Test User" },
                  },
                ],
                error: null,
              }),
            }),
          }),
        };
      }
      return {};
    });

    mockCreateServiceSupabaseClient.mockReturnValue({
      from: mockFrom,
    } as unknown as ReturnType<typeof mockCreateServiceSupabaseClient>);

    const response = await GET(new NextRequest("http://localhost"), {
      params: Promise.resolve({ id: "agent-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      agent: { id: "agent-1", agent_name: "Eliot", description: "Desc" },
      prompts: [{ id: "prompt-1", version: 1 }],
    });
  });
});

describe("POST /api/agents/:id/prompts", () => {
  const ADMIN_USER = { id: "user-admin", email: "admin@test.com" };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthenticatedUser.mockResolvedValue({ user: ADMIN_USER as never, error: null });
  });

  it("returns 401 when not authenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ user: null, error: null });

    const request = new NextRequest("http://localhost", {
      method: "POST",
      body: JSON.stringify({ system_prompt: "Salut" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request, { params: Promise.resolve({ id: "agent-1" }) });
    expect(response.status).toBe(401);
  });

  it("returns 400 when required fields are missing", async () => {
    const request = new NextRequest("http://localhost", {
      method: "POST",
      body: JSON.stringify({ system_prompt: "" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request, { params: Promise.resolve({ id: "agent-1" }) });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({ error: "Missing required fields" });
  });

  it("returns 403 when student edits another user's agent", async () => {
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
      body: JSON.stringify({ system_prompt: "Salut" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request, { params: Promise.resolve({ id: "agent-1" }) });
    expect(response.status).toBe(403);
  });

  it("creates a new prompt version", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { version: 2 },
      error: null,
    });

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
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => ({
                  maybeSingle,
                }),
              }),
            }),
          }),
          insert,
        };
      }
      return {};
    });

    mockCreateServiceSupabaseClient.mockReturnValue({
      from: mockFrom,
    } as unknown as ReturnType<typeof mockCreateServiceSupabaseClient>);

    const request = new NextRequest("http://localhost", {
      method: "POST",
      body: JSON.stringify({ system_prompt: "Salut" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request, { params: Promise.resolve({ id: "agent-1" }) });

    expect(response.status).toBe(201);
    expect(insert).toHaveBeenCalledWith({
      agent_id: "agent-1",
      system_prompt: "Salut",
      edited_by: ADMIN_USER.id,
      version: 3,
      published: false,
    });
  });
});
