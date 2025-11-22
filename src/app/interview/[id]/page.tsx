"use client";

import { Box, Container, Heading, Spinner, Stack, Text, VStack } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChatMessage } from "@/components/ChatMessage";
import { MessageInput } from "@/components/MessageInput";
import { useInterviewSession } from "@/hooks/useInterviewSession";
import { supabase } from "@/lib/supabaseClient";
import { generateUuid } from "@/lib/uuid";
import { Message } from "@/lib/schemas";
import { UIMessage } from "@/types/ui";

/**
 * Resume Interview Page
 * Real-time chat interface for resuming past interviews
 * - Requires authentication
 * - Loads existing messages from database
 * - Creates new session for continued conversation
 * - Streams responses from ADK Agent Service
 */
export default function ResumeInterviewPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const interviewId = params.id;

  // Auth state
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Session management
  const { session, messages: loadedMessages, isResume, isLoading: isSessionLoading, error: sessionError } = useInterviewSession(userId, interviewId);

  // Chat state
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [messagesContainerRef, setMessagesContainerRef] = useState<HTMLDivElement | null>(null);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { session: authSession },
        } = await supabase.auth.getSession();

        if (!authSession?.user?.id) {
          // Not authenticated, redirect to login
          router.push("/login");
          return;
        }

        setUserId(authSession.user.id);
      } catch (error) {
        console.error("[Interview] Auth check error:", error);
        router.push("/login");
      } finally {
        setIsAuthChecking(false);
      }
    };

    checkAuth();
  }, [router]);

  // Initialize messages from loaded data (resume mode)
  useEffect(() => {
    if (loadedMessages.length > 0) {
      const convertedMessages: UIMessage[] = loadedMessages.map((msg: Message) => ({
        id: msg.id,
        role: msg.role,
        text: msg.content,
        timestamp: new Date(msg.created_at).toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      }));
      setMessages(convertedMessages);
    }
  }, [loadedMessages]);

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
    if (!session || !userId) {
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
          userId,
          sessionId: session.sessionId,        // Database session UUID
          adkSessionId: session.adkSessionId,  // ADK session ID
          interviewId: session.interviewId,
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
  if (isAuthChecking) {
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
          <Text>Chargement de la session d&apos;entretien...</Text>
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
    <Box height="100vh" display="flex" flexDirection="column" backgroundColor="white">
      {/* Interview header */}
      <Box
        padding={4}
        borderBottom="1px solid"
        borderBottomColor="gray.200"
        backgroundColor="white"
        zIndex={10}
      >
        <Heading as="h1" size="lg">
          Entretien avec Oriane {isResume && <Text as="span" fontSize="sm" color="blue.600"> (reprise)</Text>}
        </Heading>
        <Text fontSize="sm" color="gray.600" marginTop={1}>
          Session: {session?.sessionId}
        </Text>
      </Box>

      {/* Messages Container */}
      {messages.length === 0 ? (
        // Empty state: centered layout with input in the middle
        <VStack
          flex={1}
          justifyContent="center"
          alignItems="center"
          gap={8}
          padding={4}
          backgroundColor="white"
          paddingBottom="120px"
        >
          <Text color="gray.500" fontSize="lg">
            {isResume ? "Continuer votre entretien" : "Bonjour! Cliquez ci-dessous pour commencer."}
          </Text>
          <Box width="100%" maxWidth="600px">
            <MessageInput
              onSendMessage={handleSendMessage}
              isLoading={isStreaming}
              placeholder="Tapez votre message..."
            />
          </Box>
        </VStack>
      ) : (
        // Active session: scrollable messages
        <Box
          ref={setMessagesContainerRef}
          flex={1}
          overflowY="auto"
          backgroundColor="white"
          paddingX={4}
          paddingBottom="120px"
        >
          <Stack gap={0} paddingY={4}>
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                role={msg.role}
                text={msg.text}
                timestamp={msg.timestamp}
              />
            ))}
          </Stack>
        </Box>
      )}

      {/* Fixed Input at Bottom - Only show when messages exist */}
      {messages.length > 0 && (
        <Box
          position="fixed"
          bottom={0}
          left={0}
          right={0}
          backgroundColor="white"
          borderTop="1px solid"
          borderTopColor="gray.200"
          zIndex={20}
          paddingX={4}
        >
          <MessageInput
            onSendMessage={handleSendMessage}
            isLoading={isStreaming}
            placeholder="Tapez votre message..."
          />
        </Box>
      )}
    </Box>
  );
}
