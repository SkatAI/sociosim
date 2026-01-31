"use client";

import { Container, Heading, Spinner, Text, VStack } from "@chakra-ui/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { InterviewLayout } from "@/app/components/InterviewLayout";
import { useInterviewSession } from "@/hooks/useInterviewSession";
import { UIMessage } from "@/types/ui";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useInterviewSummary } from "@/hooks/useInterviewSummary";
import { useInterviewExports } from "@/hooks/useInterviewExports";
import { sendInterviewMessage } from "@/lib/interviewChat";
import { formatAgentName, formatInterviewDate } from "@/lib/interviewFormat";

/**
 * Interview Page
 * Real-time chat interface for conducting interviews with AI agent
 * - Requires authentication
 * - Creates session on mount, deletes on unmount
 * - Streams responses from ADK Agent Service
 */
function InterviewPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: isAuthLoading } = useAuthUser();

  // Extract session info from URL (passed from dashboard for new interviews)
  const interviewIdParam = searchParams.get("interviewId");
  const sessionIdParam = searchParams.get("sessionId");
  const adkSessionIdParam = searchParams.get("adkSessionId");
  const hasSessionParams = !!(interviewIdParam && sessionIdParam && adkSessionIdParam);

  // Session management
  // If session params are in URL (new interview from dashboard), use them directly
  // Otherwise, call hook to create new session (backward compatibility)
  const {
    session: hookSession,
    isLoading: isSessionLoading,
    error: sessionError,
  } = useInterviewSession(hasSessionParams ? null : user?.id ?? null);

  const session = useMemo(() => {
    if (hasSessionParams) {
      return {
        sessionId: sessionIdParam,
        adkSessionId: adkSessionIdParam,
        interviewId: interviewIdParam,
      };
    }
    return hookSession;
  }, [hasSessionParams, interviewIdParam, sessionIdParam, adkSessionIdParam, hookSession]);

  // Chat state
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const [interviewStats, setInterviewStats] = useState({
    answeredQuestions: 0,
    inputTokens: 0,
    outputTokens: 0,
  });
  const handleUsageTokens = useCallback((usage: { totalInputTokens?: number; totalOutputTokens?: number }) => {
    if (!usage.totalInputTokens && !usage.totalOutputTokens) return;
    setInterviewStats((prev) => ({
      ...prev,
      inputTokens: usage.totalInputTokens ?? prev.inputTokens,
      outputTokens: usage.totalOutputTokens ?? prev.outputTokens,
    }));
  }, []);
  const { interviewSummary, summaryError, setSummaryError } = useInterviewSummary({
    interviewId: session?.interviewId ?? null,
    onUsageTokens: handleUsageTokens,
  });
  const {
    handleExportPdf,
    handleExportGoogleDocs,
    isExportingPdf,
    isExportingGoogleDocs,
  } = useInterviewExports({
    interviewId: session?.interviewId ?? null,
    interviewSummary,
    user,
    setSummaryError,
  });
  const showAssistantSkeleton =
    isStreaming && messages.length > 0 && messages[messages.length - 1]?.role !== "assistant";

  const agentDisplayName = interviewSummary
    ? formatAgentName(interviewSummary.agentName)
    : undefined;
  const dateDisplay = interviewSummary ? formatInterviewDate(interviewSummary.startedAt) : undefined;

  useEffect(() => {
    if (isAuthLoading) return;
    if (!user?.id) {
      router.push("/login");
    }
  }, [isAuthLoading, user?.id, router]);

  useEffect(() => {
    document.body.classList.add("interview-layout");
    return () => {
      document.body.classList.remove("interview-layout");
    };
  }, []);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const handleScroll = () => {
      container.dataset.scrolling = "true";
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        delete container.dataset.scrolling;
      }, 1200);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      container.removeEventListener("scroll", handleScroll);
    };
  }, []);


  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [messages]);

  const handleSendMessage = async (message: string) => {
    if (!session || !user?.id) {
      console.error("[Interview] No session or user ID");
      return;
    }
    await sendInterviewMessage({
      message,
      userId: user.id,
      session,
      setMessages,
      setIsStreaming,
      setInterviewStats,
    });
  };

  // Show loading state while checking auth
  if (isAuthLoading) {
    return (
      <Container maxWidth="2xl" height="100vh" display="flex" alignItems="center" justifyContent="center">
        <VStack gap={4}>
          <Spinner size="lg" color="blue.500" />
          <Text>Vérification d&apos;authentification...</Text>
        </VStack>
      </Container>
    );
  }

  // Show loading state while creating session
  if (isSessionLoading) {
    return (
      <Container maxWidth="2xl" height="100vh" display="flex" alignItems="center" justifyContent="center">
        <VStack gap={4}>
          <Spinner size="lg" color="blue.500" />
          <Text>Démarrage de la session d&apos;entretien...</Text>
        </VStack>
      </Container>
    );
  }

  // Show error if session creation failed
  if (sessionError) {
    return (
      <Container maxWidth="2xl" height="100vh" display="flex" alignItems="center" justifyContent="center">
        <VStack gap={4}>
          <Heading as="h2" size="lg" color="red.600">
            Erreur
          </Heading>
          <Text color="red.500">{sessionError}</Text>
        </VStack>
      </Container>
    );
  }

  return (
    <InterviewLayout
      agentDisplayName={agentDisplayName}
      agentId={interviewSummary?.agentId ?? null}
      userId={user?.id ?? null}
      agentDescription={interviewSummary?.agentDescription ?? null}
      userName={interviewSummary?.userName}
      dateDisplay={dateDisplay}
      error={summaryError}
      stats={interviewStats}
      historyUserId={user?.id}
      currentInterviewId={session?.interviewId ?? null}
      onExportPdf={handleExportPdf}
      onExportGoogleDocs={handleExportGoogleDocs}
      isExportingPdf={isExportingPdf}
      isExportingGoogleDocs={isExportingGoogleDocs}
      disableExport={!interviewSummary || !user || !session?.interviewId}
      messages={messages}
      onSendMessage={handleSendMessage}
      isStreaming={isStreaming}
      showAssistantSkeleton={showAssistantSkeleton}
      emptyStateText="Posez votre première question pour commencer l'entretien."
      messagesContainerRef={messagesContainerRef}
      agentNameForMessages={
        interviewSummary ? formatAgentName(interviewSummary.agentName) : undefined
      }
    />
  );
}

export default function InterviewPage() {
  return (
    <Suspense
      fallback={
        <Container
          maxWidth="2xl"
          height="100vh"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <VStack gap={4}>
            <Spinner size="lg" color="blue.500" />
            <Text>Chargement de la page d&apos;entretien...</Text>
          </VStack>
        </Container>
      }
    >
      <InterviewPageInner />
    </Suspense>
  );
}
