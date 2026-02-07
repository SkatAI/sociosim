import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { interviews, sessions } from "@/lib/data";
import { getAgentById } from "@/lib/data/agents";
import { getAuthenticatedUser } from "@/lib/supabaseAuthServer";
import { createServiceSupabaseClient } from "@/lib/supabaseServiceClient";
import { mockUser } from "@/test/mocks/useAuthUser";

const { mockCreateSession, mockDeleteSession } = vi.hoisted(() => ({
  mockCreateSession: vi.fn().mockResolvedValue({ session_id: "adk-1", created_at: "now" }),
  mockDeleteSession: vi.fn(),
}));

vi.mock("@/lib/adkClient", () => {
  class MockAdkClient {
    createSession = mockCreateSession;
    deleteSession = mockDeleteSession;
  }

  return { AdkClient: MockAdkClient };
});

vi.mock("@/lib/data", () => ({
  interviews: {
    getInterviewById: vi.fn(),
    createInterview: vi.fn(),
  },
  sessions: {
    createSession: vi.fn(),
    linkUserInterviewSession: vi.fn(),
    updateSessionStatus: vi.fn(),
  },
}));

vi.mock("@/lib/data/agents", () => ({
  getAgentById: vi.fn(),
  getInterviewWithAgent: vi.fn(),
}));

vi.mock("@/lib/supabaseAuthServer", () => ({
  getAuthenticatedUser: vi.fn(),
}));

vi.mock("@/lib/supabaseServiceClient", () => ({
  createServiceSupabaseClient: vi.fn(),
}));

const mockGetAgentById = vi.mocked(getAgentById);
const mockGetAuthenticatedUser = vi.mocked(getAuthenticatedUser);
const mockCreateServiceSupabaseClient = vi.mocked(createServiceSupabaseClient);
const mockCreateInterview = vi.mocked(interviews.createInterview);
const mockCreateSessionRecord = vi.mocked(sessions.createSession);
const mockLinkUserInterviewSession = vi.mocked(sessions.linkUserInterviewSession);

describe("POST /api/sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { ...mockUser, id: "user-1" },
      error: null,
    });
    mockCreateServiceSupabaseClient.mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: { role: "student" }, error: null }),
          }),
        }),
      }),
    } as unknown as ReturnType<typeof createServiceSupabaseClient>);
    mockCreateInterview.mockResolvedValue({
      id: "interview-1",
      status: "in_progress",
      agent_id: "agent-1",
      started_at: new Date().toISOString(),
      completed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    mockCreateSessionRecord.mockResolvedValue({
      id: "session-1",
      adk_session_id: "adk-1",
      status: "active",
      started_at: new Date().toISOString(),
      ended_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    mockLinkUserInterviewSession.mockResolvedValue(undefined);
  });

  it("blocks students from hidden agents they do not own", async () => {
    mockGetAgentById.mockResolvedValue({
      id: "agent-1",
      agent_name: "hidden",
      description: "desc",
      active: true,
      is_template: false,
      is_public: false,
      created_by: "user-2",
    });

    const request = new NextRequest("http://localhost/api/sessions", {
      method: "POST",
      body: JSON.stringify({ userId: "user-1", agent_id: "agent-1" }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toMatchObject({ error: "Agent not accessible" });
    expect(mockCreateInterview).not.toHaveBeenCalled();
    expect(mockCreateSession).not.toHaveBeenCalled();
  });

  it("allows students to create sessions for public agents", async () => {
    mockGetAgentById.mockResolvedValue({
      id: "agent-1",
      agent_name: "public",
      description: "desc",
      active: true,
      is_template: false,
      is_public: true,
      created_by: "user-2",
    });

    const request = new NextRequest("http://localhost/api/sessions", {
      method: "POST",
      body: JSON.stringify({ userId: "user-1", agent_id: "agent-1" }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toMatchObject({
      success: true,
      agent_id: "agent-1",
      agent_name: "public",
    });
    expect(mockCreateInterview).toHaveBeenCalledWith("agent-1");
    expect(mockCreateSession).toHaveBeenCalled();
    expect(mockCreateSessionRecord).toHaveBeenCalledWith("adk-1");
    expect(mockLinkUserInterviewSession).toHaveBeenCalledWith(
      "user-1",
      "interview-1",
      "session-1"
    );
  });

  it("allows admins to access hidden agents", async () => {
    mockCreateServiceSupabaseClient.mockReturnValueOnce({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: { role: "admin" }, error: null }),
          }),
        }),
      }),
    } as unknown as ReturnType<typeof createServiceSupabaseClient>);

    mockGetAgentById.mockResolvedValue({
      id: "agent-1",
      agent_name: "hidden",
      description: "desc",
      active: true,
      is_template: false,
      is_public: false,
      created_by: "user-2",
    });

    const request = new NextRequest("http://localhost/api/sessions", {
      method: "POST",
      body: JSON.stringify({ userId: "user-1", agent_id: "agent-1" }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toMatchObject({ success: true, agent_id: "agent-1" });
  });
});
