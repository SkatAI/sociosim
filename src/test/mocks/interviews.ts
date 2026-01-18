export const mockInterview = {
  id: "interview-123",
  agent_id: "agent-oriane",
  status: "in_progress",
  updated_at: "2025-12-29T10:30:00Z",
  message_count: 2,
  agents: {
    agent_name: "oriane",
  },
  interview_usage: [
    {
      total_input_tokens: 1500,
      total_output_tokens: 2000,
    },
  ],
  messages: [
    {
      content: "Bonjour, je suis Oriane. Comment allez-vous?",
      role: "assistant",
      created_at: "2025-12-29T10:25:00Z",
    },
    {
      content: "Bonjour! Je vais bien, merci.",
      role: "user",
      created_at: "2025-12-29T10:26:00Z",
    },
  ],
};

export const createMockInterview = (overrides = {}) => ({
  ...mockInterview,
  ...overrides,
});

export const mockInterviewsList = [
  mockInterview,
  createMockInterview({
    id: "interview-456",
    agent_id: "agent-theo",
    agents: { agent_name: "theo" },
  }),
];
