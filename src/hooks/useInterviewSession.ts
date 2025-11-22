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

        const resumeInterviewId = existingInterviewId ?? undefined;

        const response = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            interviewId: resumeInterviewId,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to create session");
        }

        const data = await response.json();
        if (resumeInterviewId && data.interviewId !== resumeInterviewId) {
          throw new Error("La reprise de l'entretien a échoué (identifiant différent)");
        }

        const newSession: InterviewSession = {
          sessionId: data.sessionId, // Database session UUID
          adkSessionId: data.adkSessionId, // ADK session ID
          interviewId: resumeInterviewId || data.interviewId,
          createdAt: data.createdAt,
        };

        setSession(newSession);
        setIsResume(!!resumeInterviewId || data.isResume || false);
        sessionRef.current = newSession;

        // If resuming, load existing messages
        if (resumeInterviewId || data.interviewId) {
          const targetInterviewId = resumeInterviewId || data.interviewId;

          try {
            const messagesResponse = await fetch(
              `/api/interviews/${targetInterviewId}/messages?userId=${userId}`
            );

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
        const dbSessionId = sessionRef.current.sessionId;
        const adkSessionId = sessionRef.current.adkSessionId;

        fetch(
          `/api/sessions?userId=${userId}&sessionId=${dbSessionId}&adkSessionId=${adkSessionId}`,
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
