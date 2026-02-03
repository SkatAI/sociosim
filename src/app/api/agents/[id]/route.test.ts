import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { PATCH } from "./route";
import { createServiceSupabaseClient } from "@/lib/supabaseServiceClient";

vi.mock("@/lib/supabaseServiceClient", () => ({
  createServiceSupabaseClient: vi.fn(),
}));

const mockCreateServiceSupabaseClient = vi.mocked(createServiceSupabaseClient);

describe("PATCH /api/agents/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it("updates the agent name and description", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn(() => ({ eq }));
    const mockFrom = vi.fn(() => ({ update }));

    mockCreateServiceSupabaseClient.mockReturnValue({
      from: mockFrom,
    } as unknown as ReturnType<typeof mockCreateServiceSupabaseClient>);

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
    const eq = vi.fn().mockResolvedValue({ error: { message: "fail" } });
    const update = vi.fn(() => ({ eq }));
    const mockFrom = vi.fn(() => ({ update }));

    mockCreateServiceSupabaseClient.mockReturnValue({
      from: mockFrom,
    } as unknown as ReturnType<typeof mockCreateServiceSupabaseClient>);

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
