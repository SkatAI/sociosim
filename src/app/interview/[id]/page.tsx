"use client";

import { Box, Button, Container, Heading, HStack, Spinner, Stack, Text, VStack } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { AssistantSkeleton } from "@/components/AssistantSkeleton";
import { ChatMessage } from "@/components/ChatMessage";
import { MessageInput } from "@/components/MessageInput";
import { useInterviewSession } from "@/hooks/useInterviewSession";
import { generateUuid } from "@/lib/uuid";
import { Message } from "@/lib/schemas";
import { UIMessage } from "@/types/ui";
import { useAuthUser } from "@/hooks/useAuthUser";

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

  const [interviewSummary, setInterviewSummary] = useState<{
    agentName: string;
    userName: string;
    startedAt: string;
    starterUserId?: string | null;
  } | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [viewOnlyMessages, setViewOnlyMessages] = useState<Message[]>([]);
  const [viewOnlyError, setViewOnlyError] = useState<string | null>(null);
  const [isViewOnlyLoading, setIsViewOnlyLoading] = useState(false);

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

  // Chat state
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [messagesContainerRef, setMessagesContainerRef] = useState<HTMLDivElement | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const showAssistantSkeleton =
    isStreaming && messages.length > 0 && messages[messages.length - 1]?.role !== "assistant";

  useEffect(() => {
    if (isAuthLoading) return;
    if (!user?.id) {
      router.push("/login");
    }
  }, [isAuthLoading, user?.id, router]);

  const formatInterviewDate = (value?: string | null) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };
  const formatAgentName = (name: string) => name.charAt(0).toUpperCase() + name.slice(1);

  // Load interview summary from database based on interview ID
  useEffect(() => {
    async function loadSummary() {
      try {
        setSummaryError(null);
        const response = await fetch(`/api/interviews/summary?interviewId=${interviewId}`);
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          const message = payload?.error ?? response.statusText;
          throw new Error(message);
        }
        const payload = (await response.json().catch(() => null)) as
          | {
              agent?: { agent_name?: string };
              user?: { id?: string | null; name?: string };
              interview?: { started_at?: string };
            }
          | null;
        if (!payload?.agent?.agent_name || !payload?.user?.name || !payload?.interview?.started_at) {
          throw new Error("Interview summary missing required fields");
        }
        setInterviewSummary({
          agentName: payload.agent.agent_name,
          userName: payload.user.name,
          startedAt: payload.interview.started_at,
          starterUserId: payload.user?.id ?? null,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("[Interview] Failed to load summary:", errorMessage);
        setSummaryError(`Failed to load interview summary: ${errorMessage}`);
      }
    }

    loadSummary();
  }, [interviewId]);

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
    } else {
      setMessages([]);
    }
  }, [isViewOnly, loadedMessages, viewOnlyMessages]);

  // Auto-scroll to bottom when messages load (resume mode)
  useEffect(() => {
    if (isResume && messagesContainerRef && messages.length > 0) {
      messagesContainerRef.scrollTop = messagesContainerRef.scrollHeight;
    }
  }, [isResume, messages, messagesContainerRef]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesContainerRef && !isResume) {
      messagesContainerRef.scrollTop = messagesContainerRef.scrollHeight;
    }
  }, [messages, messagesContainerRef, isResume]);

  const handleSendMessage = async (message: string) => {
    if (!session || !user?.id) {
      console.error("[Interview] No session or user ID");
      return;
    }

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
            userId: user.id,
            sessionId: session.sessionId,        // Database session UUID
            adkSessionId: session.adkSessionId,  // ADK session ID
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
                  } else {
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
                  }
                });
              } else if (data.type === "done") {
                // Stream finished, token info available but not displayed yet
                console.log("[Interview] Stream finished, tokens:", {
                  input: data.event.total_input_tokens,
                  output: data.event.total_output_tokens,
                });
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
  };

  const handleExportPdf = async () => {
    if (!interviewId || !interviewSummary || !user) return;
    setIsExporting(true);
    try {
      const response = await fetch(`/api/interviews/export?interviewId=${interviewId}`);
      if (!response.ok) {
        throw new Error("Export failed");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const safeAgentName = interviewSummary.agentName.replace(/\s+/g, "-").toLowerCase();
      const dateStamp = new Date().toISOString().slice(0, 10);
      const fileName = `entretien-${safeAgentName}-${dateStamp}.pdf`;
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      window.URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
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

  // Main interview interface
  return (
    <Box flex={1} minHeight={0} display="flex" flexDirection="column" backgroundColor="bg.surface">
      {/* Interview header */}
      <Box
        padding={4}
        borderBottom="1px solid"
        borderBottomColor="border.muted"
        backgroundColor="bg.surface"
        zIndex={10}
        position="sticky"
        top={0}
      >
        {summaryError || viewOnlyError ? (
          <Heading as="h1" size="lg" color="red.600">
            Erreur: {summaryError ?? viewOnlyError}
          </Heading>
        ) : (
          <HStack justify="space-between" align="center">
            <Heading as="h1" size="lg">
              {interviewSummary
                ? `Entretien avec ${formatAgentName(interviewSummary.agentName)} par ${interviewSummary.userName} le ${formatInterviewDate(interviewSummary.startedAt)}`
                : "Chargement de l'entretien..."}
            </Heading>
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportPdf}
              loading={isExporting}
              disabled={!interviewSummary || !user || !interviewId}
              paddingInline={4}
            >
              Exporter
            </Button>
          </HStack>
        )}
      </Box>

      {/* Messages + Input */}
      <Box display="flex" flexDirection="column" flex={1} minHeight={0} backgroundColor="bg.surface">
        <Box
          ref={setMessagesContainerRef}
          flex={1}
          overflowY="auto"
          paddingX={4}
          paddingY={4}
        >
          {messages.length === 0 ? (
            <VStack align="center" justify="center" height="100%" gap={4}>
              <Text color="fg.muted" fontSize="lg">
                {!canCreateSession
                  ? isViewOnlyLoading
                    ? "Chargement des messages..."
                    : "Aucun message pour cet entretien."
                  : isResume
                    ? "Continuer votre entretien"
                    : "Bonjour! Cliquez ci-dessous pour commencer."}
              </Text>
            </VStack>
          ) : (
            <Stack gap={0}>
              {messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  role={msg.role}
                  text={msg.text}
                  userName={interviewSummary?.userName}
                  agentName={interviewSummary ? formatAgentName(interviewSummary.agentName) : undefined}
                  timestamp={msg.timestamp}
                />
              ))}
              {showAssistantSkeleton && <AssistantSkeleton />}
            </Stack>
          )}
        </Box>
        {canCreateSession && (
          <MessageInput
            onSendMessage={handleSendMessage}
            isLoading={isStreaming}
            placeholder="Tapez votre message..."
            containerProps={{ width: "100%" }}
          />
        )}
      </Box>

    </Box>
  );
}
