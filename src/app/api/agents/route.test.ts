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
      },
    ]);

    const response = await GET(new Request("http://localhost/api/agents"));
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
      },
    ]);

    const response = await GET(new Request("http://localhost/api/agents?template=false"));
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
});
