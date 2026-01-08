/**
 * ADK Agent Service Type Definitions
 *
 * Types for communicating with the separate ADK Agent Service
 * See: ../adk-agent/docs/bff-contract.md
 */

/**
 * Message part - can be text or other content types (images, etc.)
 */
export interface MessagePart {
  text: string;
  // Future: image?: { url: string; mimeType: string }
}

/**
 * A message in the conversation
 */
export interface AdkMessage {
  role: "user" | "assistant";
  parts: MessagePart[];
}

/**
 * Request to send to ADK agent service
 */
export interface AdkRequest {
  /** Name of the app (e.g., "app") */
  app_name: string;
  /** ID of the user making the request */
  user_id: string;
  /** ID of the conversation session */
  session_id: string;
  /** The new message to process */
  new_message: AdkMessage;
  /** Agent UUID from the database */
  agent_id: string;
  /** Optional: request streaming responses */
  streaming?: boolean;
}

/**
 * Event emitted by the ADK service
 */
export interface AdkEvent {
  /** Who sent this event (agent, tool, etc.) */
  author: string;
  /** The content of the event */
  content: {
    role: "assistant" | "user";
    parts: MessagePart[];
  };
  /** Optional: tool calls triggered by the agent */
  tool_calls?: Array<{
    id: string;
    name: string;
    arguments: Record<string, unknown>;
  }>;
  /** Optional: errors that occurred */
  errors?: Array<{
    message: string;
    code?: string;
  }>;
}

/**
 * Final response from ADK after all events
 */
export interface AdkFinalResponse {
  /** Total input tokens used */
  total_input_tokens?: number;
  /** Total output tokens generated */
  total_output_tokens?: number;
  /** Any metadata about the response */
  metadata?: Record<string, unknown>;
}

/**
 * Session information returned from ADK
 */
export interface AdkSession {
  /** Session ID */
  session_id: string;
  /** User ID */
  user_id: string;
  /** ISO timestamp when session was created */
  created_at: string;
  /** Optional: session state */
  state?: Record<string, unknown>;
}

/**
 * Error response from ADK service
 */
export interface AdkError {
  /** HTTP status code */
  status: number;
  /** Error message */
  detail: string;
  /** Error code for programmatic handling */
  code?: string;
}

/**
 * Type guard for checking if response is an error
 */
export function isAdkError(data: unknown): data is AdkError {
  return (
    typeof data === "object" &&
    data !== null &&
    "status" in data &&
    "detail" in data
  );
}

/**
 * Type guard for checking if data is a final response
 */
export function isAdkFinalResponse(data: unknown): data is AdkFinalResponse {
  return (
    typeof data === "object" &&
    data !== null &&
    ("total_input_tokens" in data ||
      "total_output_tokens" in data ||
      "metadata" in data)
  );
}

/**
 * Type guard for checking if data is an event
 */
export function isAdkEvent(data: unknown): data is AdkEvent {
  return (
    typeof data === "object" &&
    data !== null &&
    "author" in data &&
    "content" in data
  );
}
