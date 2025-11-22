/**
 * ADK Agent Service Client
 *
 * TypeScript client for communicating with the separate ADK Agent Service.
 * Handles session creation, message sending, and streaming responses.
 *
 * See: ../adk-agent/docs/bff-contract.md
 */

import {
  AdkRequest,
  AdkSession,
  AdkError,
  AdkEvent,
  AdkFinalResponse,
} from "@/types/adk";
// Unused imports preserved for future use:
// - isAdkEvent, isAdkFinalResponse, isAdkError: for error type guards
// - AdkMessage: for type hints in future methods

export class AdkClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.NEXT_PUBLIC_ADK_BASE_URL || "http://localhost:8000";
  }

  /**
   * Create a new session with the ADK service
   *
   * @param appName - Name of the app (usually "app")
   * @param userId - ID of the user
   * @param sessionId - Optional: specific session ID to use
   * @returns Session information
   * @throws AdkError if session creation fails
   */
  async createSession(
    appName: string,
    userId: string,
    sessionId?: string
  ): Promise<AdkSession> {
    const response = await fetch(
      `${this.baseUrl}/apps/${appName}/users/${userId}/sessions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sessionId ? { session_id: sessionId } : {}),
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to create session: ${response.status} ${data.detail || data.error || ""}`
      );
    }

    // ADK returns { id, appName, userId, state, events, lastUpdateTime }
    // Convert to our AdkSession interface
    const adkResponse = await response.json();
    return {
      session_id: adkResponse.id,
      user_id: adkResponse.userId,
      created_at: new Date(adkResponse.lastUpdateTime * 1000).toISOString(),
      state: adkResponse.state,
    };
  }

  /**
   * Delete a session
   *
   * @param appName - Name of the app
   * @param userId - ID of the user
   * @param sessionId - ID of the session to delete
   * @throws Error if deletion fails
   */
  async deleteSession(
    appName: string,
    userId: string,
    sessionId: string
  ): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/apps/${appName}/users/${userId}/sessions/${sessionId}`,
      { method: "DELETE" }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        `Failed to delete session: ${response.status} ${data.detail || data.error || ""}`
      );
    }
  }

  /**
   * Send a message to the ADK agent and receive streaming responses
   *
   * @param request - The request object with app_name, user_id, session_id, and message
   * @yields Event objects as they're received
   * @throws Error if the request fails or stream is not available
   */
  async *streamMessage(request: AdkRequest): AsyncGenerator<Record<string, unknown>> {
    const response = await fetch(`${this.baseUrl}/run_sse`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const data = await response.json();
      const error = data as AdkError;
      throw new Error(
        `ADK request failed: ${response.status} ${error.detail || "Unknown error"}`
      );
    }

    if (!response.body) {
      throw new Error("Response body is empty");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // ADK returns lines starting with "data: " followed by JSON
        // We need to find complete JSON objects
        const lines = buffer.split("\n");

        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i].trim();

          // Skip empty lines
          if (!line) continue;

          // Check if this is a data line
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6);

            try {
              // Try to parse the JSON
              const event = JSON.parse(dataStr);
              yield event;
            } catch {
              // JSON might be incomplete, keep trying to accumulate
              // Put this line back in buffer
              buffer = line + "\n" + lines.slice(i + 1).join("\n");
              break;
            }
          }
        }

        // Keep incomplete line in buffer
        buffer = lines[lines.length - 1];
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Send a message and wait for all responses (non-streaming)
   *
   * @param request - The request object
   * @returns Array of events (messages) and final response
   * @throws Error if the request fails
   */
  async sendMessage(
    request: AdkRequest
  ): Promise<Array<AdkEvent | AdkFinalResponse>> {
    const response = await fetch(`${this.baseUrl}/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const data = await response.json();
      const error = data as AdkError;
      throw new Error(
        `ADK request failed: ${response.status} ${error.detail || "Unknown error"}`
      );
    }

    const events = await response.json();
    return Array.isArray(events) ? events : [events];
  }

  /**
   * Helper method to extract the assistant's text response from events
   *
   * @param events - Array of events from ADK
   * @returns The concatenated text response from the assistant
   */
  extractTextResponse(events: Array<AdkEvent | AdkFinalResponse>): string {
    return events
      .filter((e): e is AdkEvent => "content" in e && e.content !== undefined)
      .flatMap((e) => e.content.parts)
      .map((p) => p.text || "")
      .join("");
  }

  /**
   * Helper method to get token usage from events
   *
   * @param events - Array of events from ADK
   * @returns Token counts or null if not available
   */
  getTokenUsage(
    events: Array<AdkEvent | AdkFinalResponse>
  ): {
    input: number;
    output: number;
  } | null {
    // ADK returns total_input_tokens and total_output_tokens in final response
    for (const event of events) {
      if (event && "total_input_tokens" in event && "total_output_tokens" in event) {
        const finalResponse = event as AdkFinalResponse;
        if (finalResponse.total_input_tokens && finalResponse.total_output_tokens) {
          return {
            input: finalResponse.total_input_tokens,
            output: finalResponse.total_output_tokens,
          };
        }
      }
    }

    return null;
  }
}

// Export singleton instance for convenience
export const adkClient = new AdkClient();
