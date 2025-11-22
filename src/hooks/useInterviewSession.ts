import { useEffect, useRef, useState } from "react";
import { generateUuid } from "@/lib/uuid";

interface InterviewSession {
  sessionId: string;
  interviewId: string;
  createdAt: string;
}

/**
 * Hook to manage interview session lifecycle
 * Creates a session on mount and deletes it on unmount
 */
export function useInterviewSession(userId: string | null) {
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use ref to track session for cleanup without triggering re-renders
  const sessionRef = useRef<InterviewSession | null>(null);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    const createSession = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Generate interview ID as UUID
        const interviewId = generateUuid();

        const response = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            interviewId,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to create session");
        }

        const data = await response.json();
        const newSession: InterviewSession = {
          sessionId: data.sessionId,
          interviewId: data.interviewId,
          createdAt: data.createdAt,
        };

        setSession(newSession);
        sessionRef.current = newSession;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        console.error("[useInterviewSession] Error creating session:", message);
      } finally {
        setIsLoading(false);
      }
    };

    createSession();

    // Cleanup: delete session on unmount
    return () => {
      if (sessionRef.current && userId) {
        fetch(
          `/api/sessions?userId=${userId}&sessionId=${sessionRef.current.sessionId}`,
          { method: "DELETE" }
        ).catch((err) =>
          console.error("[useInterviewSession] Error deleting session:", err)
        );
      }
    };
  }, [userId]);

  return {
    session,
    isLoading,
    error,
  };
}
