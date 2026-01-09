import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { interviews } from "@/lib/data";

vi.mock("@/lib/data", () => ({
  interviews: {
    getUserInterviewsWithMessages: vi.fn(),
  },
}));

const mockGetUserInterviewsWithMessages = vi.mocked(
  interviews.getUserInterviewsWithMessages
);

describe("GET /api/user/interviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when userId is missing", async () => {
    const response = await GET(new NextRequest("http://localhost/api/user/interviews"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({ error: "Missing 'userId' query parameter" });
  });

  it("returns interviews for the user", async () => {
    mockGetUserInterviewsWithMessages.mockResolvedValue([
      { id: "interview-1", messages: [] },
    ]);

    const response = await GET(
      new NextRequest("http://localhost/api/user/interviews?userId=test-user-123")
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockGetUserInterviewsWithMessages).toHaveBeenCalledWith("test-user-123");
    expect(body).toMatchObject({
      success: true,
      interviews: [{ id: "interview-1", messages: [] }],
    });
  });
});
