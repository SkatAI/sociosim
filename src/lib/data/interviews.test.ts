import { describe, it, expect, vi, beforeEach } from "vitest";
import { getUserInterviewsWithMessages } from "./interviews";
import { createServiceSupabaseClient } from "@/lib/supabaseServiceClient";

vi.mock("@/lib/supabaseServiceClient", () => ({
  createServiceSupabaseClient: vi.fn(),
}));

const mockCreateServiceSupabaseClient = vi.mocked(createServiceSupabaseClient);

describe("getUserInterviewsWithMessages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("combines messages across multiple sessions for the same interview", async () => {
    const userSessions = [
      { interview_id: "interview-1", session_id: "session-a", created_at: "2024-01-01T10:00:00Z" },
      { interview_id: "interview-1", session_id: "session-b", created_at: "2024-01-02T10:00:00Z" },
    ];
    const interviews = [
      {
        id: "interview-1",
        status: "in_progress",
        updated_at: "2024-01-02T12:00:00Z",
        agents: { agent_name: "oriane", active: true },
        interview_usage: [],
      },
    ];
    const messages = [
      {
        session_id: "session-a",
        content: "Ancien message",
        role: "assistant",
        created_at: "2024-01-01T10:05:00Z",
      },
      {
        session_id: "session-b",
        content: "Dernier message",
        role: "assistant",
        created_at: "2024-01-02T10:05:00Z",
      },
    ];

    const mockFrom = vi.fn((table: string) => {
      if (table === "user_interview_session") {
        return {
          select: () => ({
            eq: vi.fn().mockResolvedValue({ data: userSessions, error: null }),
          }),
        };
      }
      if (table === "interviews") {
        return {
          select: () => ({
            in: () => ({
              eq: () => ({
                order: vi.fn().mockResolvedValue({ data: interviews, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === "messages") {
        return {
          select: () => ({
            in: vi.fn().mockResolvedValue({ data: messages, error: null }),
          }),
        };
      }
      return {};
    });

    mockCreateServiceSupabaseClient.mockReturnValue({
      from: mockFrom,
    } as unknown as ReturnType<typeof mockCreateServiceSupabaseClient>);

    const result = await getUserInterviewsWithMessages("user-123");

    expect(result).toHaveLength(1);
    expect(result[0].messages).toHaveLength(2);
    expect(result[0].messages[0]?.content).toBe("Dernier message");
    expect(result[0].messages[1]?.content).toBe("Ancien message");
  });
});
