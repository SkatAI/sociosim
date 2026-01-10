import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { createServiceSupabaseClient } from "@/lib/supabaseServiceClient";

vi.mock("@/lib/supabaseServiceClient", () => ({
  createServiceSupabaseClient: vi.fn(),
}));

vi.mock("playwright", () => ({
  chromium: {
    launch: vi.fn().mockResolvedValue({
      newPage: vi.fn().mockResolvedValue({
        setContent: vi.fn(),
        pdf: vi.fn().mockResolvedValue(Buffer.from("pdf")),
      }),
      close: vi.fn(),
    }),
  },
}));

const mockCreateServiceSupabaseClient = vi.mocked(createServiceSupabaseClient);

describe("GET /api/interviews/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when interviewId is missing", async () => {
    const response = await GET(new NextRequest("http://localhost/api/interviews/export"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({ error: "Missing 'interviewId' query parameter" });
  });

  it("returns a pdf response", async () => {
    const supabase = {
      from: (table: string) => {
        if (table === "interviews") {
          return {
            select: () => ({
              eq: () => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: "interview-1", agent_id: "agent-1", created_at: "2025-01-01T10:00:00Z" },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "agents") {
          return {
            select: () => ({
              eq: () => ({
                single: vi.fn().mockResolvedValue({
                  data: { agent_name: "oriane", description: "desc" },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "user_interview_session") {
          return {
            select: (selection: string) => {
              if (selection.includes("session_id")) {
                return {
                  eq: vi.fn().mockResolvedValue({
                    data: [{ session_id: "session-1" }],
                    error: null,
                  }),
                };
              }
              return {
                eq: () => ({
                  limit: () => ({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: { users: { name: "User", email: "user@example.com" } },
                      error: null,
                    }),
                  }),
                }),
              };
            },
          };
        }
        if (table === "messages") {
          return {
            select: () => ({
              in: () => ({
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          };
        }
        if (table === "agent_prompts") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  order: () => ({
                    limit: () => ({
                      maybeSingle: vi.fn().mockResolvedValue({
                        data: { system_prompt: "Prompt", version: 1 },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        };
      },
    };

    mockCreateServiceSupabaseClient.mockReturnValue(
      supabase as unknown as ReturnType<typeof mockCreateServiceSupabaseClient>
    );

    const response = await GET(
      new NextRequest("http://localhost/api/interviews/export?interviewId=interview-1")
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
  });
});
