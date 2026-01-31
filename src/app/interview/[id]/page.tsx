"use client";

import { Container, Heading, Spinner, Text, VStack } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useRef, useState } from "react";
import { InterviewLayout } from "@/app/components/InterviewLayout";
import { useInterviewSession } from "@/hooks/useInterviewSession";
import { Message } from "@/lib/schemas";
import { UIMessage } from "@/types/ui";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useInterviewSummary } from "@/hooks/useInterviewSummary";
import { useInterviewExports } from "@/hooks/useInterviewExports";
import { sendInterviewMessage } from "@/lib/interviewChat";
import { formatAgentName, formatInterviewDate } from "@/lib/interviewFormat";

/**
 * Resume Interview Page
 * Real-time chat interface for resuming past interviews
 * - Requires authentication
 * - Loads existing messages from database
 * - Creates new session for continued conversation
 * - Streams responses from ADK Agent Service
 */
export default function ResumeInterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: interviewId } = use(params);

  const { user, isLoading: isAuthLoading, user_admin } = useAuthUser();

  const [viewOnlyMessages, setViewOnlyMessages] = useState<Message[]>([]);
  const [viewOnlyError, setViewOnlyError] = useState<string | null>(null);
  const [isViewOnlyLoading, setIsViewOnlyLoading] = useState(false);

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
    interviewId,
    includeStarterUserId: true,
    onUsageTokens: handleUsageTokens,
  });
  // Session management
  const isOwner =
    Boolean(interviewSummary?.starterUserId && user?.id) &&
    interviewSummary?.starterUserId === user?.id;
  const isViewOnly = Boolean(user_admin && interviewSummary?.starterUserId && !isOwner);
  const canCreateSession = !user_admin || isOwner;
  const {
    session,
    messages: loadedMessages,
    isResume,
    isLoading: isSessionLoading,
    error: sessionError,
  } = useInterviewSession(user?.id ?? null, interviewId, { enabled: canCreateSession });
  const {
    handleExportPdf,
    handleExportGoogleDocs,
    isExportingPdf,
    isExportingGoogleDocs,
  } = useInterviewExports({
    interviewId,
    interviewSummary,
    user,
    setSummaryError,
  });
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

  const showAssistantSkeleton =
    isStreaming && messages.length > 0 && messages[messages.length - 1]?.role !== "assistant";

  const agentDisplayName = interviewSummary
    ? formatAgentName(interviewSummary.agentName)
    : undefined;
  const dateDisplay = interviewSummary ? formatInterviewDate(interviewSummary.startedAt) : undefined;

  useEffect(() => {
    if (!isViewOnly || !interviewId) return;

    const loadMessages = async () => {
      try {
        setIsViewOnlyLoading(true);
        setViewOnlyError(null);

        const response = await fetch(`/api/interviews/${interviewId}/messages`);
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          const message = payload?.error ?? response.statusText;
          throw new Error(message);
        }
        const payload = (await response.json().catch(() => null)) as
          | { messages?: Message[] }
          | null;
        setViewOnlyMessages(payload?.messages ?? []);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("[Interview] Failed to load view-only messages:", errorMessage);
        setViewOnlyError(`Impossible de charger les messages: ${errorMessage}`);
      } finally {
        setIsViewOnlyLoading(false);
      }
    };

    loadMessages();
  }, [interviewId, isViewOnly]);

  // Initialize messages from loaded data (resume or view-only mode)
  useEffect(() => {
    const sourceMessages = isViewOnly ? viewOnlyMessages : loadedMessages;
    if (sourceMessages.length > 0) {
      const convertedMessages: UIMessage[] = sourceMessages.map((msg: Message) => ({
        id: msg.id,
        role: msg.role,
        text: msg.content,
        timestamp: new Date(msg.created_at).toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      }));
      setMessages(convertedMessages);
      const userCount = sourceMessages.filter((msg) => msg.role === "user").length;
      const assistantCount = sourceMessages.filter((msg) => msg.role === "assistant").length;
      setInterviewStats((prev) => ({
        ...prev,
        answeredQuestions: Math.min(userCount, assistantCount),
      }));
    } else {
      setMessages([]);
      setInterviewStats((prev) => ({ ...prev, answeredQuestions: 0 }));
    }
  }, [isViewOnly, loadedMessages, viewOnlyMessages]);

  // Auto-scroll to bottom when messages load (resume mode)
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (isResume && container && messages.length > 0) {
      container.scrollTop = container.scrollHeight;
    }
  }, [isResume, messages]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container && !isResume) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages, isResume]);

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
  if (isSessionLoading && canCreateSession) {
    return (
      <Container maxWidth="2xl" height="100vh" display="flex" alignItems="center" justifyContent="center">
        <VStack gap={4}>
          <Spinner size="lg" color="blue.500" />
          <Text>Chargement de la session d&apos;entretien...</Text>
        </VStack>
      </Container>
    );
  }

  // Show error if session creation failed
  if (sessionError && canCreateSession) {
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

  const emptyStateText = !canCreateSession
    ? isViewOnlyLoading
      ? "Chargement des messages..."
      : "Aucun message pour cet entretien."
    : isResume
      ? "Continuer votre entretien"
      : "Bonjour! Cliquez ci-dessous pour commencer.";

  return (
    <InterviewLayout
      agentDisplayName={agentDisplayName}
      agentId={interviewSummary?.agentId ?? null}
      userId={user?.id ?? null}
      agentDescription={interviewSummary?.agentDescription ?? null}
      userName={interviewSummary?.userName}
      dateDisplay={dateDisplay}
      error={summaryError ?? viewOnlyError}
      stats={interviewStats}
      historyUserId={interviewSummary?.starterUserId ?? user?.id ?? null}
      currentInterviewId={interviewId}
      onExportPdf={handleExportPdf}
      onExportGoogleDocs={handleExportGoogleDocs}
      isExportingPdf={isExportingPdf}
      isExportingGoogleDocs={isExportingGoogleDocs}
      disableExport={!interviewSummary || !user || !interviewId}
      messages={messages}
      onSendMessage={handleSendMessage}
      isStreaming={isStreaming}
      showAssistantSkeleton={showAssistantSkeleton}
      emptyStateText={emptyStateText}
      emptyStateTextSize="lg"
      showInput={canCreateSession}
      messageInputContainerProps={{ width: "100%" }}
      messagesContainerRef={messagesContainerRef}
      agentNameForMessages={
        interviewSummary ? formatAgentName(interviewSummary.agentName) : undefined
      }
    />
  );
}
