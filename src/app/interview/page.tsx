"use client";

import { Box, Container, Heading, Spinner, Stack, Text, VStack } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChatMessage } from "@/components/ChatMessage";
import { MessageInput } from "@/components/MessageInput";
import { useInterviewSession } from "@/hooks/useInterviewSession";
import { supabase } from "@/lib/supabaseClient";

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: string;
}

/**
 * Interview Page
 * Real-time chat interface for conducting interviews with Oriane AI agent
 * - Requires authentication
 * - Creates session on mount, deletes on unmount
 * - Streams responses from ADK Agent Service
 */
export default function InterviewPage() {
  const router = useRouter();

  // Auth state
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Session management
  const { session, isLoading: isSessionLoading, error: sessionError } = useInterviewSession(userId);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
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

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesContainerRef) {
      messagesContainerRef.scrollTop = messagesContainerRef.scrollHeight;
    }
  }, [messages, messagesContainerRef]);

  const handleSendMessage = async (message: string) => {
    if (!session || !userId) {
      console.error("[Interview] No session or user ID");
      return;
    }

    // Add user message to display
    const userMessage: Message = {
      id: `user-${Date.now()}`,
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
          sessionId: session.sessionId,
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
      const assistantMessageId = `assistant-${Date.now()}`;
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
                        role: "assistant",
                        text: assistantText,
                        timestamp: new Date().toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        }),
                      },
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
          id: `error-${Date.now()}`,
          role: "assistant",
          text: `Erreur: ${errorMessage}`,
          timestamp: new Date().toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
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
    <Box height="100vh" display="flex" flexDirection="column" backgroundColor="white">
      {/* Header */}
      <Box padding={4} borderBottom="1px solid" borderBottomColor="gray.200" backgroundColor="white">
        <Heading as="h1" size="lg">
          Entretien avec Oriane
        </Heading>
        <Text fontSize="sm" color="gray.600" marginTop={1}>
          Session: {session?.sessionId}
        </Text>
      </Box>

      {/* Messages */}
      <Box
        ref={setMessagesContainerRef}
        flex={1}
        overflowY="auto"
        backgroundColor="white"
      >
        {messages.length === 0 ? (
          <VStack
            height="100%"
            justifyContent="center"
            alignItems="center"
            gap={4}
            padding={4}
          >
            <Text color="gray.500">Bonjour! Cliquez ci-dessous pour commencer.</Text>
          </VStack>
        ) : (
          <Stack gap={0} padding={4}>
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

      {/* Input */}
      <MessageInput
        onSendMessage={handleSendMessage}
        isLoading={isStreaming}
        placeholder="Tapez votre message..."
      />
    </Box>
  );
}
