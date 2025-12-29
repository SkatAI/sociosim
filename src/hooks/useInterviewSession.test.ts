import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useInterviewSession } from "./useInterviewSession";
import { mockMessages } from "@/test/mocks/messages";

describe("useInterviewSession - Resume Mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates session with interviewId for resume mode", async () => {
    const mockFetch = vi.fn()
      .mockImplementationOnce(async () => ({
        ok: true,
        json: async () => ({
          sessionId: "session-123",
          adkSessionId: "adk-456",
          interviewId: "interview-123",
          isResume: true,
        }),
      }))
      .mockImplementationOnce(async () => ({
        ok: true,
        json: async () => ({ messages: mockMessages }),
      }))
      .mockImplementationOnce(async () => ({
        ok: true,
      }));

    global.fetch = mockFetch;

    const { result } = renderHook(() =>
      useInterviewSession("user-123", "interview-123")
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/sessions",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          userId: "user-123",
          interviewId: "interview-123",
        }),
      })
    );
  });

  it("loads messages for interview", async () => {
    const mockFetch = vi.fn()
      .mockImplementationOnce(async () => ({
        ok: true,
        json: async () => ({
          sessionId: "session-123",
          adkSessionId: "adk-456",
          interviewId: "interview-123",
        }),
      }))
      .mockImplementationOnce(async () => ({
        ok: true,
        json: async () => ({ messages: mockMessages }),
      }))
      .mockImplementationOnce(async () => ({
        ok: true,
      }));

    global.fetch = mockFetch;

    const { result } = renderHook(() =>
      useInterviewSession("user-123", "interview-123")
    );

    await waitFor(() => {
      expect(result.current.messages.length).toBeGreaterThan(0);
    });

    expect(result.current.messages[0].role).toBe("assistant");
    expect(result.current.messages[1].role).toBe("user");
  });

  it("returns isResume=true for resume mode", async () => {
    const mockFetch = vi.fn()
      .mockImplementationOnce(async () => ({
        ok: true,
        json: async () => ({
          sessionId: "session-123",
          adkSessionId: "adk-456",
          interviewId: "interview-123",
          isResume: true,
        }),
      }))
      .mockImplementationOnce(async () => ({
        ok: true,
        json: async () => ({ messages: [] }),
      }))
      .mockImplementationOnce(async () => ({
        ok: true,
      }));

    global.fetch = mockFetch;

    const { result } = renderHook(() =>
      useInterviewSession("user-123", "interview-123")
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isResume).toBe(true);
  });

  it("cleans up session on unmount", async () => {
    const mockFetch = vi.fn()
      .mockImplementationOnce(async () => ({
        ok: true,
        json: async () => ({
          sessionId: "session-123",
          adkSessionId: "adk-456",
          interviewId: "interview-123",
        }),
      }))
      .mockImplementationOnce(async () => ({
        ok: true,
        json: async () => ({ messages: [] }),
      }))
      .mockImplementationOnce(async () => ({
        ok: true,
      }));

    global.fetch = mockFetch;

    const { result, unmount } = renderHook(() =>
      useInterviewSession("user-123", "interview-123")
    );

    await waitFor(() => {
      expect(result.current.session).toBeTruthy();
    });

    unmount();

    // Give cleanup time to execute
    await new Promise(resolve => setTimeout(resolve, 50));

    // Check that DELETE was called
    const deleteCalls = mockFetch.mock.calls.filter(
      call => call[1]?.method === "DELETE"
    );
    expect(deleteCalls.length).toBeGreaterThan(0);
  });
});
