import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { getAgentsWithPromptStatus, getPublishedAgents } from "@/lib/data/agents";
import { createServiceSupabaseClient } from "@/lib/supabaseServiceClient";
import { getAuthenticatedUser } from "@/lib/supabaseAuthServer";
import { mockUser } from "@/test/mocks/useAuthUser";

vi.mock("@/lib/data/agents", () => ({
  getAgentsWithPromptStatus: vi.fn(),
  getPublishedAgents: vi.fn(),
}));
vi.mock("@/lib/supabaseServiceClient", () => ({
  createServiceSupabaseClient: vi.fn(),
}));
vi.mock("@/lib/supabaseAuthServer", () => ({
  getAuthenticatedUser: vi.fn(),
}));

const mockGetAgents = vi.mocked(getAgentsWithPromptStatus);
const mockGetPublishedAgents = vi.mocked(getPublishedAgents);
const mockCreateServiceSupabaseClient = vi.mocked(createServiceSupabaseClient);
const mockGetAuthenticatedUser = vi.mocked(getAuthenticatedUser);

describe("GET /api/agents", () => {
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
  });

  it("returns published agents when published=true", async () => {
    mockGetPublishedAgents.mockResolvedValue([
      {
        id: "agent-1",
        agent_name: "oriane",
        description: "desc",
        active: true,
        is_template: false,
        is_public: true,
        created_by: null,
        creator_name: null,
        creator_role: null,
      },
    ]);

    const response = await GET(new NextRequest("http://localhost/api/agents?published=true"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockGetPublishedAgents).toHaveBeenCalledWith(undefined);
    expect(body).toMatchObject({
      success: true,
      agents: [
        {
          id: "agent-1",
          agent_name: "oriane",
          description: "desc",
          has_published_prompt: true,
        },
      ],
    });
  });

  it("returns all agents when published param is missing", async () => {
    mockGetAgents.mockResolvedValue([
      {
        id: "agent-2",
        agent_name: "theo",
        description: "desc",
        has_published_prompt: false,
        active: true,
        is_template: false,
        is_public: true,
        created_by: null,
        creator_name: null,
        creator_role: null,
      },
    ]);

    const response = await GET(new NextRequest("http://localhost/api/agents"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockGetAgents).toHaveBeenCalledWith(undefined);
    expect(body).toMatchObject({
      success: true,
      agents: [
        {
          id: "agent-2",
          agent_name: "theo",
          description: "desc",
          has_published_prompt: false,
        },
      ],
    });
  });

  it("filters out template agents when template=false", async () => {
    mockGetAgents.mockResolvedValue([
      {
        id: "agent-4",
        agent_name: "mona",
        description: "desc",
        has_published_prompt: false,
        active: true,
        is_template: false,
        is_public: true,
        created_by: null,
        creator_name: null,
        creator_role: null,
      },
    ]);

    const response = await GET(new NextRequest("http://localhost/api/agents?template=false"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockGetAgents).toHaveBeenCalledWith("exclude");
    expect(body).toMatchObject({
      success: true,
      agents: [
        {
          id: "agent-4",
          agent_name: "mona",
          description: "desc",
          has_published_prompt: false,
        },
      ],
    });
  });

  it("filters agents for students (public + own)", async () => {
    mockGetAgents.mockResolvedValue([
      {
        id: "agent-public",
        agent_name: "public",
        description: "desc",
        has_published_prompt: true,
        active: true,
        is_template: false,
        is_public: true,
        created_by: null,
        creator_name: null,
        creator_role: null,
      },
      {
        id: "agent-owned",
        agent_name: "owned",
        description: "desc",
        has_published_prompt: true,
        active: true,
        is_template: false,
        is_public: false,
        created_by: "user-1",
        creator_name: null,
        creator_role: null,
      },
      {
        id: "agent-hidden",
        agent_name: "hidden",
        description: "desc",
        has_published_prompt: true,
        active: true,
        is_template: false,
        is_public: false,
        created_by: "user-2",
        creator_name: null,
        creator_role: null,
      },
    ]);

    const response = await GET(new NextRequest("http://localhost/api/agents"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.agents).toHaveLength(2);
    expect(body.agents.map((agent: { id: string }) => agent.id)).toEqual([
      "agent-public",
      "agent-owned",
    ]);
  });

  it("returns all agents for admin/teacher users", async () => {
    mockCreateServiceSupabaseClient.mockReturnValueOnce({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: { role: "admin" }, error: null }),
          }),
        }),
      }),
    } as unknown as ReturnType<typeof createServiceSupabaseClient>);

    mockGetAgents.mockResolvedValue([
      {
        id: "agent-public",
        agent_name: "public",
        description: "desc",
        has_published_prompt: true,
        active: true,
        is_template: false,
        is_public: true,
        created_by: null,
        creator_name: null,
        creator_role: null,
      },
      {
        id: "agent-hidden",
        agent_name: "hidden",
        description: "desc",
        has_published_prompt: true,
        active: true,
        is_template: false,
        is_public: false,
        created_by: "user-2",
        creator_name: null,
        creator_role: null,
      },
    ]);

    const response = await GET(new NextRequest("http://localhost/api/agents"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.agents).toHaveLength(2);
  });
});
