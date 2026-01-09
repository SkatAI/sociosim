import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { createServiceSupabaseClient } from "@/lib/supabaseServiceClient";

vi.mock("@/lib/supabaseServiceClient", () => ({
  createServiceSupabaseClient: vi.fn(),
}));

const mockCreateServiceSupabaseClient = vi.mocked(createServiceSupabaseClient);

describe("POST /api/agents/:id/prompts/publish", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it("publishes the selected prompt", async () => {
    const update = vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }));

    const mockFrom = vi.fn(() => ({
      update,
    }));

    mockCreateServiceSupabaseClient.mockReturnValue({
      from: mockFrom,
    } as ReturnType<typeof mockCreateServiceSupabaseClient>);

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
