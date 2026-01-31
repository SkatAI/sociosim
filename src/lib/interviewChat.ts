import type { Dispatch, SetStateAction } from "react";
import { generateUuid } from "@/lib/uuid";
import type { UIMessage } from "@/types/ui";

type InterviewSession = {
  sessionId: string;
  adkSessionId: string;
  interviewId: string;
};

type InterviewStats = {
  answeredQuestions: number;
  inputTokens: number;
  outputTokens: number;
};

type SendInterviewMessageArgs = {
  message: string;
  userId: string;
  session: InterviewSession;
  setMessages: Dispatch<SetStateAction<UIMessage[]>>;
  setIsStreaming: Dispatch<SetStateAction<boolean>>;
  setInterviewStats: Dispatch<SetStateAction<InterviewStats>>;
};

export async function sendInterviewMessage({
  message,
  userId,
  session,
  setMessages,
  setIsStreaming,
  setInterviewStats,
}: SendInterviewMessageArgs) {
  // Add user message to display
  const userMessage: UIMessage = {
    id: generateUuid(),
    role: "user",
    text: message,
    timestamp: new Date().toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };

  setMessages((prev) => [...prev, userMessage]);
  setIsStreaming(true);

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        userId,
        sessionId: session.sessionId, // Database session UUID
        adkSessionId: session.adkSessionId, // ADK session ID
        interviewId: session.interviewId,
        // Agent is now loaded from database, no longer passed in request
        streaming: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Chat request failed: ${response.status}`);
    }

    if (!response.body) {
      throw new Error("No response body");
    }

    // Parse SSE stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    const assistantMessageId = generateUuid();
    let assistantText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");

      // Process all complete lines
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === "message" && data.event?.content?.parts) {
              // Append to assistant message
              const textChunk = data.event.content.parts
                .map((part: { text?: string }) => part.text || "")
                .join("");

              assistantText += textChunk;

              // Update or create assistant message
              setMessages((prev) => {
                const existing = prev.findIndex((m) => m.id === assistantMessageId);
                if (existing >= 0) {
                  const updated = [...prev];
                  updated[existing].text = assistantText;
                  return updated;
                }
                return [
                  ...prev,
                  {
                    id: assistantMessageId,
                    role: "assistant" as const,
                    text: assistantText,
                    timestamp: new Date().toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    }),
                  } as UIMessage,
                ];
              });
            } else if (data.type === "done") {
              console.log("[Interview SSE] done event:", data);
              // Stream finished, token info available but not displayed yet
              console.log("[Interview] Stream finished, tokens:", {
                input: data.event.total_input_tokens,
                output: data.event.total_output_tokens,
              });
              const totalInputTokens = data.event.total_input_tokens;
              const totalOutputTokens = data.event.total_output_tokens;
              setInterviewStats((prev) => ({
                answeredQuestions: prev.answeredQuestions + 1,
                inputTokens: totalInputTokens ?? prev.inputTokens,
                outputTokens: totalOutputTokens ?? prev.outputTokens,
              }));
            } else {
              console.log("[Interview SSE] event:", data);
            }
          } catch {
            // JSON parse error, incomplete data
            console.debug("[Interview] Incomplete JSON, buffering...");
            buffer = line + "\n" + lines.slice(i + 1).join("\n");
            break;
          }
        }
      }

      // Keep incomplete line in buffer
      buffer = lines[lines.length - 1];
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Interview] Error sending message:", errorMessage);

    setMessages((prev) => [
      ...prev,
      {
        id: generateUuid(),
        role: "assistant" as const,
        text: `Erreur: ${errorMessage}`,
        timestamp: new Date().toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      } as UIMessage,
    ]);
  } finally {
    setIsStreaming(false);
  }
}
