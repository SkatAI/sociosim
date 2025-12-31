import { mockMessages } from "./messages";

export const mockUseInterviewSession = {
  session: {
    sessionId: "session-123",
    adkSessionId: "adk-session-456",
    interviewId: "interview-123",
    createdAt: "2025-12-29T10:30:00Z",
  },
  messages: mockMessages,
  isResume: true,
  isLoading: false,
  error: null,
};

export const createMockSessionHook = (overrides = {}) => ({
  ...mockUseInterviewSession,
  ...overrides,
});
