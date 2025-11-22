import { useEffect, useRef, useState } from "react";
import { Message } from "@/lib/schemas";

interface InterviewSession {
  sessionId: string; // Database session UUID
  adkSessionId: string; // ADK session ID (for ADK API calls)
  interviewId: string;
  createdAt: string;
}

/**
 * Hook to manage interview session lifecycle
 * Creates a session on mount (new or resume) and deletes it on unmount
 * If existingInterviewId is provided, resumes that interview and loads existing messages
 */
export function useInterviewSession(userId: string | null, existingInterviewId?: string | null) {
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isResume, setIsResume] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use ref to track session for cleanup without triggering re-renders
  const sessionRef = useRef<InterviewSession | null>(null);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    const initializeSession = async () => {
      try {
        setIsLoading(true);
        setError(null);

        let interviewId = existingInterviewId;

        // If resuming, don't generate new ID
        // If new interview, generate ID (but let API create it)
        if (!existingInterviewId) {
          // New interview - don't generate ID here, let API create it
          interviewId = undefined;
        }

        const response = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            ...(interviewId && { interviewId }),
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to create session");
        }

        const data = await response.json();
        const newSession: InterviewSession = {
          sessionId: data.sessionId, // Database session UUID
          adkSessionId: data.adkSessionId, // ADK session ID
          interviewId: data.interviewId,
          createdAt: data.createdAt,
        };

        setSession(newSession);
        setIsResume(data.isResume || false);
        sessionRef.current = newSession;

        // If resuming, load existing messages
        if (data.isResume && data.interviewId) {
          try {
            const messagesResponse = await fetch(`/api/interviews/${data.interviewId}/messages`);

            if (!messagesResponse.ok) {
              throw new Error("Failed to load messages");
            }

            const messagesData = await messagesResponse.json();
            setMessages(messagesData.messages || []);
            console.log("[useInterviewSession] Loaded", (messagesData.messages || []).length, "messages");
          } catch (msgErr) {
            const msgMessage = msgErr instanceof Error ? msgErr.message : "Unknown error";
            console.error("[useInterviewSession] Error loading messages:", msgMessage);
            // Don't fail the whole hook if messages fail to load
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        console.error("[useInterviewSession] Error creating session:", message);
      } finally {
        setIsLoading(false);
      }
    };

    initializeSession();

    // Cleanup: delete session on unmount
    return () => {
      if (sessionRef.current && userId) {
        fetch(
          `/api/sessions?userId=${userId}&sessionId=${sessionRef.current.adkSessionId}`,
          { method: "DELETE" }
        ).catch((err) =>
          console.error("[useInterviewSession] Error deleting session:", err)
        );
      }
    };
  }, [userId, existingInterviewId]);

  return {
    session,
    messages,
    isResume,
    isLoading,
    error,
  };
}
