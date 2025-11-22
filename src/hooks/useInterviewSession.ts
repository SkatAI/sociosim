import { useEffect, useState } from "react";

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

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    const createSession = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Generate interview ID
        const interviewId = `interview-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

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
        setSession({
          sessionId: data.sessionId,
          interviewId: data.interviewId,
          createdAt: data.createdAt,
        });
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
      if (session) {
        fetch(
          `/api/sessions?userId=${userId}&sessionId=${session.sessionId}`,
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
