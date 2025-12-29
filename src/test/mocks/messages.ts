export const mockMessages = [
  {
    id: "msg-1",
    session_id: "session-123",
    role: "assistant" as const,
    content: "Bonjour, je suis Oriane.",
    input_tokens: null,
    output_tokens: 50,
    created_at: "2025-12-29T10:25:00Z",
  },
  {
    id: "msg-2",
    session_id: "session-123",
    role: "user" as const,
    content: "Bonjour!",
    input_tokens: 5,
    output_tokens: null,
    created_at: "2025-12-29T10:26:00Z",
  },
];

export const createMockMessage = (overrides = {}) => ({
  ...mockMessages[0],
  ...overrides,
});
