import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { getAgentsWithPromptStatus, getPublishedAgents } from "@/lib/data/agents";

vi.mock("@/lib/data/agents", () => ({
  getAgentsWithPromptStatus: vi.fn(),
  getPublishedAgents: vi.fn(),
}));

const mockGetAgents = vi.mocked(getAgentsWithPromptStatus);
const mockGetPublishedAgents = vi.mocked(getPublishedAgents);

describe("GET /api/agents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns published agents when published=true", async () => {
    mockGetPublishedAgents.mockResolvedValue([
      { id: "agent-1", agent_name: "oriane", description: "desc" },
    ]);

    const response = await GET(new Request("http://localhost/api/agents?published=true"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockGetPublishedAgents).toHaveBeenCalledWith(false);
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
      },
    ]);

    const response = await GET(new Request("http://localhost/api/agents"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockGetAgents).toHaveBeenCalledWith(false);
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

  it("filters to active agents when active=true", async () => {
    mockGetAgents.mockResolvedValue([
      {
        id: "agent-3",
        agent_name: "jade",
        description: "desc",
        has_published_prompt: false,
      },
    ]);

    const response = await GET(new Request("http://localhost/api/agents?active=true"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockGetAgents).toHaveBeenCalledWith(true);
    expect(body).toMatchObject({
      success: true,
      agents: [
        {
          id: "agent-3",
          agent_name: "jade",
          description: "desc",
          has_published_prompt: false,
        },
      ],
    });
  });
});
