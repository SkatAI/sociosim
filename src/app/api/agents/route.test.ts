import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { getAgents, getPublishedAgents } from "@/lib/data/agents";

vi.mock("@/lib/data/agents", () => ({
  getAgents: vi.fn(),
  getPublishedAgents: vi.fn(),
}));

const mockGetAgents = vi.mocked(getAgents);
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
    expect(mockGetPublishedAgents).toHaveBeenCalledTimes(1);
    expect(body).toMatchObject({
      success: true,
      agents: [{ id: "agent-1", agent_name: "oriane", description: "desc" }],
    });
  });

  it("returns all agents when published param is missing", async () => {
    mockGetAgents.mockResolvedValue([
      { id: "agent-2", agent_name: "theo", description: "desc" },
    ]);

    const response = await GET(new Request("http://localhost/api/agents"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockGetAgents).toHaveBeenCalledTimes(1);
    expect(body).toMatchObject({
      success: true,
      agents: [{ id: "agent-2", agent_name: "theo", description: "desc" }],
    });
  });
});
