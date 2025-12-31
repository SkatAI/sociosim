"use client";

import { Box, Container, Heading, HStack, Spinner, Stack, Text, VStack } from "@chakra-ui/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { marked } from "marked";
import { ChevronDown, ChevronUp } from "lucide-react";
import { ChatMessage } from "@/components/ChatMessage";
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
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Extract session info from URL (passed from dashboard for new interviews)
  const interviewIdParam = searchParams.get("interviewId");
  const sessionIdParam = searchParams.get("sessionId");
  const adkSessionIdParam = searchParams.get("adkSessionId");
  const hasSessionParams = !!(interviewIdParam && sessionIdParam && adkSessionIdParam);

  // Agent state - loaded from database (stored in interview)
  const [agentInfo, setAgentInfo] = useState<{
    agent_name: string;
    description: string | null;
  } | null>(null);
  const [agentError, setAgentError] = useState<string | null>(null);

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

  // Load agent from database based on interview ID
  useEffect(() => {
    async function loadAgent() {
      if (!session?.interviewId) return;

      try {
        setAgentError(null);
        // Query interview to get agent info
        const { supabase: sb } = await import("@/lib/supabaseClient");
        const { data, error } = await sb
          .from("interviews")
          .select("agent_id, agents(agent_name, description)")
          .eq("id", session.interviewId)
          .single();

        if (error) throw error;
        const agentData = (data as { agents?: { agent_name?: string; description?: string | null } })?.agents;
        if (!agentData?.agent_name) {
          throw new Error("Agent information missing from interview");
        }
        setAgentInfo({
          agent_name: agentData.agent_name,
          description: agentData.description ?? null,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("[Interview] Failed to load agent:", errorMessage);
        setAgentError(`Failed to load agent: ${errorMessage}`);
      }
    }

    loadAgent();
  }, [session?.interviewId]);

  // Chat state
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [messagesContainerRef, setMessagesContainerRef] = useState<HTMLDivElement | null>(null);

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
    <Box flex={1} minHeight={0} display="flex" flexDirection="column" backgroundColor="bg.surface">
      {/* Interview header */}
      <Box
        padding={4}
        borderBottom="1px solid"
        borderBottomColor="border.muted"
        backgroundColor="bg.surface"
        zIndex={10}
      >
        {agentError ? (
          <Heading as="h1" size="lg" color="red.600">
            Erreur: {agentError}
          </Heading>
        ) : (
          <Heading as="h1" size="lg">
            {agentInfo ? `Entretien avec ${agentInfo.agent_name}` : "Chargement de l'agent..."}
          </Heading>
        )}
        <Text fontSize="sm" color="fg.muted" marginTop={1}>
          Session: {session?.sessionId}
        </Text>
      </Box>

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
              {introPreview ? (
                <>
                  <Box
                    width="100%"
                    maxWidth="3xl"
                    paddingX={3}
                    paddingY={2}
                    borderWidth="1px"
                    borderStyle="solid"
                    borderColor="border.muted"
                    borderRadius="md"
                    backgroundColor="bg.surface"
                    color="fg.muted"
                    textAlign="left"
                  >
                    <Box width="100%">
                      <button
                        type="button"
                        onClick={() => setIsGuideOpen((prev) => !prev)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setIsGuideOpen((prev) => !prev);
                          }
                        }}
                        aria-expanded={isGuideOpen}
                        aria-controls="interview-guide"
                        style={{
                          width: "100%",
                          textAlign: "left",
                          background: "transparent",
                          border: "none",
                          padding: 0,
                          margin: 0,
                          cursor: "pointer",
                          color: "inherit",
                          font: "inherit",
                        }}
                      >
                    <HStack
                      width="100%"
                      justifyContent="space-between"
                      alignItems="baseline"
                      fontWeight="500"
                        cursor="pointer"
                      >
                        <Text as="span">{introPreview}</Text>
                        {isGuideOpen ? (
                          <ChevronUp size={18} aria-hidden="true" />
                        ) : (
                          <ChevronDown size={18} aria-hidden="true" />
                        )}
                      </HStack>
                      </button>
                    </Box>
                    {isGuideOpen && introHtml && (
                    <Box
                      id="interview-guide"
                      paddingTop={2}
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
                    )}
                  </Box>
                </>
              ) : (
                <Text color="fg.muted">
                  Chargement du guide d&apos;entretien...
                </Text>
              )}
            </VStack>
          ) : (
            <Stack gap={0}>
              {messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  role={msg.role}
                  text={msg.text}
                  timestamp={msg.timestamp}
                />
              ))}
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
