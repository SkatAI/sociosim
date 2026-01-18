"use client";

import {
  Box,
  Button,
  Container,
  Dialog,
  Heading,
  Portal,
  Spinner,
  Stack,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { marked } from "marked";
import { AssistantSkeleton } from "@/components/AssistantSkeleton";
import { ChatMessage } from "@/components/ChatMessage";
import { InterviewSidebar } from "@/app/components/InterviewSidebar";
import { MessageInput } from "@/components/MessageInput";
import { useInterviewSession } from "@/hooks/useInterviewSession";
import { generateUuid } from "@/lib/uuid";
import { UIMessage } from "@/types/ui";
import { useAuthUser } from "@/hooks/useAuthUser";

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

  const [introHtml, setIntroHtml] = useState<string>("");
  const [introPreview, setIntroPreview] = useState<string>("");

  // Extract session info from URL (passed from dashboard for new interviews)
  const interviewIdParam = searchParams.get("interviewId");
  const sessionIdParam = searchParams.get("sessionId");
  const adkSessionIdParam = searchParams.get("adkSessionId");
  const hasSessionParams = !!(interviewIdParam && sessionIdParam && adkSessionIdParam);

  const [interviewSummary, setInterviewSummary] = useState<{
    agentName: string;
    userName: string;
    startedAt: string;
  } | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Session management
  // If session params are in URL (new interview from dashboard), use them directly
  // Otherwise, call hook to create new session (backward compatibility)
  const {
    session: hookSession,
    isLoading: isSessionLoading,
    error: sessionError,
  } = useInterviewSession(hasSessionParams ? null : user?.id ?? null);

  // Create session object from URL params if available
  const [session, setSession] = useState(
    hasSessionParams
      ? {
          sessionId: sessionIdParam,
          adkSessionId: adkSessionIdParam,
          interviewId: interviewIdParam,
        }
      : null
  );

  // Use hook session if no URL params
  useEffect(() => {
    if (!hasSessionParams && hookSession) {
      setSession(hookSession);
    }
  }, [hasSessionParams, hookSession]);

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
      if (!session?.interviewId) return;

      try {
        setSummaryError(null);
        const response = await fetch(`/api/interviews/summary?interviewId=${session.interviewId}`);
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          const message = payload?.error ?? response.statusText;
          throw new Error(message);
        }
        const payload = (await response.json().catch(() => null)) as
          | {
              agent?: { agent_name?: string };
              user?: { name?: string };
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
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("[Interview] Failed to load summary:", errorMessage);
        setSummaryError(`Failed to load interview summary: ${errorMessage}`);
      }
    }

    loadSummary();
  }, [session?.interviewId]);

  // Chat state
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [messagesContainerRef, setMessagesContainerRef] = useState<HTMLDivElement | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingGoogleDocs, setIsExportingGoogleDocs] = useState(false);
  const [interviewStats, setInterviewStats] = useState({
    answeredQuestions: 0,
    inputTokens: 0,
    outputTokens: 0,
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
    let isMounted = true;

    async function loadIntro() {
      try {
        const response = await fetch("/docs/guide_entretien_court.md");
        if (!response.ok) {
          throw new Error("Failed to load interview guide");
        }
        const markdown = await response.text();
        if (isMounted) {
          const lines = markdown.split(/\r?\n/);
          const firstLineIndex = lines.findIndex((line) => line.trim().length > 0);
          const previewLine = firstLineIndex >= 0 ? lines[firstLineIndex].trim() : "";
          const remainingLines =
            firstLineIndex >= 0 ? lines.slice(firstLineIndex + 1) : [];
          if (remainingLines[0]?.trim() === "") {
            remainingLines.shift();
          }
          const remainingMarkdown = remainingLines.join("\n");
          const parsed = remainingMarkdown.trim()
            ? await marked.parse(remainingMarkdown)
            : "";
          setIntroPreview(previewLine);
          setIntroHtml(parsed);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("[Interview] Failed to load guide:", errorMessage);
        if (isMounted) {
          setIntroPreview("");
          setIntroHtml("");
        }
      }
    }

    loadIntro();

    return () => {
      isMounted = false;
    };
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesContainerRef) {
      messagesContainerRef.scrollTop = messagesContainerRef.scrollHeight;
    }
  }, [messages, messagesContainerRef]);

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
                setInterviewStats((prev) => ({
                  answeredQuestions: prev.answeredQuestions + 1,
                  inputTokens: data.event.total_input_tokens ?? prev.inputTokens,
                  outputTokens: data.event.total_output_tokens ?? prev.outputTokens,
                }));
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
    if (!session?.interviewId || !interviewSummary || !user) return;
    setIsExporting(true);
    try {
      const response = await fetch(`/api/interviews/export?interviewId=${session.interviewId}`);
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

  const handleExportGoogleDocs = async () => {
    if (!session?.interviewId || !interviewSummary || !user) return;
    setIsExportingGoogleDocs(true);
    setSummaryError(null);
    try {
      const response = await fetch("/api/interviews/export-google-docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interviewId: session.interviewId }),
      });

      if (response.status === 401) {
        const payload = await response.json().catch(() => null);
        if (payload?.requiresAuth) {
          window.location.href = `/api/auth/google/authorize?interviewId=${encodeURIComponent(
            session.interviewId
          )}`;
          return;
        }
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const message = payload?.error ?? "Impossible d'exporter vers Google Docs.";
        throw new Error(message);
      }

      const payload = (await response.json().catch(() => null)) as
        | { documentUrl?: string }
        | null;
      if (!payload?.documentUrl) {
        throw new Error("Lien du document Google Docs manquant.");
      }

      window.open(payload.documentUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("[Interview] Google Docs export error:", message);
      setSummaryError("Impossible d'exporter vers Google Docs.");
    } finally {
      setIsExportingGoogleDocs(false);
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

  // Main interview interface
  return (
    <Box
      flex={1}
      minHeight="100vh"
      display="flex"
      flexDirection={{ base: "column", lg: "row" }}
      backgroundColor="bg.surface"
    >
      {/* Interview sidebar */}
      <InterviewSidebar
        agentDisplayName={agentDisplayName}
        userName={interviewSummary?.userName}
        dateDisplay={dateDisplay}
        error={summaryError}
        stats={interviewStats}
        onExportPdf={handleExportPdf}
        onExportGoogleDocs={handleExportGoogleDocs}
        isExportingPdf={isExporting}
        isExportingGoogleDocs={isExportingGoogleDocs}
        disableExport={!interviewSummary || !user || !session?.interviewId}
        helpSlot={(
          <Dialog.Root>
            <Dialog.Trigger asChild>
              <Button
                variant="plain"
                size="sm"
                colorPalette="blue"
                textDecoration="underline"
              >
                Aide pour l&apos;entretien
              </Button>
            </Dialog.Trigger>
            <Portal>
              <Dialog.Backdrop />
              <Dialog.Positioner>
                <Dialog.Content padding={8}>
                  <Dialog.Header>
                    <Dialog.Title>Guide d&apos;entretien</Dialog.Title>
                  </Dialog.Header>
                  <Dialog.Body>
                    <VStack align="stretch" gap={3}>
                      {introPreview ? (
                        <Text fontWeight="600">{introPreview}</Text>
                      ) : null}
                      {introHtml ? (
                        <Box
                          css={{
                            "& h2": { marginTop: "1.5rem", fontWeight: "600", color: "fg.default" },
                            "& h3": { marginTop: "1rem", fontWeight: "600", color: "fg.default" },
                            "& ul": { paddingLeft: "1.25rem", marginTop: "0.75rem" },
                            "& li": { marginBottom: "0.5rem" },
                            "& p": { marginBottom: "0.75rem" },
                            "& strong": { color: "fg.default" },
                          }}
                          dangerouslySetInnerHTML={{ __html: introHtml }}
                        />
                      ) : (
                        <Text color="fg.muted">Chargement du guide d&apos;entretien...</Text>
                      )}
                    </VStack>
                  </Dialog.Body>
                  <Dialog.Footer>
                    <Dialog.ActionTrigger asChild>
                      <Button variant="outline">Fermer</Button>
                    </Dialog.ActionTrigger>
                  </Dialog.Footer>
                </Dialog.Content>
              </Dialog.Positioner>
            </Portal>
          </Dialog.Root>
        )}
      />

      {/* Messages + Input */}
      <Box display="flex" flexDirection="column" flex={1} minHeight={0}>
        <Box
          ref={setMessagesContainerRef}
          flex={1}
          overflowY="auto"
          backgroundColor="bg.surface"
          paddingX={4}
          paddingY={4}
          marginX="auto"
          width="100%"
        >
          {messages.length === 0 ? (
            <VStack align="center" justify="center" height="100%" gap={4}>
              <Text color="fg.muted">
                Posez votre première question pour commencer l&apos;entretien.
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
        <MessageInput
          onSendMessage={handleSendMessage}
          isLoading={isStreaming}
          placeholder="Tapez votre message..."
        />
      </Box>

    </Box>
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
