import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";
import { createServiceSupabaseClient } from "@/lib/supabaseServiceClient";

vi.mock("@/lib/supabaseServiceClient", () => ({
  createServiceSupabaseClient: vi.fn(),
}));

const mockCreateServiceSupabaseClient = vi.mocked(createServiceSupabaseClient);

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
                data: { id: "agent-1", agent_name: "Eliot" },
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
      agent: { id: "agent-1", agent_name: "Eliot" },
      prompts: [{ id: "prompt-1", version: 1 }],
    });
  });
});

describe("POST /api/agents/:id/prompts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when required fields are missing", async () => {
    const request = new NextRequest("http://localhost", {
      method: "POST",
      body: JSON.stringify({ system_prompt: "", edited_by: "" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request, { params: Promise.resolve({ id: "agent-1" }) });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({ error: "Missing required fields" });
  });

  it("creates a new prompt version", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { version: 2 },
      error: null,
    });

    const mockFrom = vi.fn((table: string) => {
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
      body: JSON.stringify({ system_prompt: "Salut", edited_by: "user-123" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request, { params: Promise.resolve({ id: "agent-1" }) });

    expect(response.status).toBe(201);
    expect(insert).toHaveBeenCalledWith({
      agent_id: "agent-1",
      system_prompt: "Salut",
      edited_by: "user-123",
      version: 3,
      published: false,
    });
  });
});
