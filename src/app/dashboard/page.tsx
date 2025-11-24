"use client";

import {
  Box,
  Button,
  Container,
  Heading,
  Stack,
  Text,
  VStack,
  HStack,
  Badge,
  Spinner,
  Grid,
  Card,
  Avatar,
} from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { AGENTS, type AgentName } from "@/lib/agents";

interface InterviewWithDetails {
  id: string;
  status: string;
  updated_at: string;
  interview_usage: Array<{
    total_input_tokens: number;
    total_output_tokens: number;
  }>;
  messages: Array<{
    content: string;
    role: string;
    created_at: string;
  }>;
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    in_progress: "blue",
    completed: "green",
    abandoned: "gray",
    error: "red",
    standby: "orange",
  };
  return colors[status] || "gray";
};

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    in_progress: "En cours",
    completed: "Complété",
    abandoned: "Abandonné",
    error: "Erreur",
    standby: "En pause",
  };
  return labels[status] || status;
};

const getLatestAssistantMessage = (
  messages: Array<{ content: string; role: string; created_at: string }>
) => {
  if (!messages?.length) return null;
  // Messages are sorted desc by created_at; first assistant is the latest
  return messages.find((msg) => msg.role === "assistant") || null;
};

export default function DashboardPage() {
  const router = useRouter();
  const [interviews, setInterviews] = useState<InterviewWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedInterviewId, setExpandedInterviewId] = useState<string | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  // Check authentication and fetch interviews
  useEffect(() => {
    const loadData = async () => {
      try {
        const {
          data: { session: authSession },
        } = await supabase.auth.getSession();

        if (!authSession?.user?.id) {
          router.push("/login");
          return;
        }

        const response = await fetch(`/api/user/interviews?userId=${authSession.user.id}`);
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          const message = data.error || "Impossible de charger vos entretiens";
          setError(message);
          console.error("Error fetching interviews:", message);
          setIsLoading(false);
          return;
        }

        const data = await response.json();
        const transformedInterviews =
          (data.interviews as InterviewWithDetails[] | undefined)?.filter(
            (interview) => interview.messages && interview.messages.length > 0
          ) || [];

        setInterviews(transformedInterviews);
      } catch (err) {
        console.error("Error in dashboard:", err);
        setError("Une erreur est survenue");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [router]);

  const handleSelectAgent = async (agentName: AgentName) => {
    try {
      setIsCreatingSession(true);

      console.log("--- handleSelectAgent:", agentName);

      const {
        data: { session: authSession },
      } = await supabase.auth.getSession();

      if (!authSession?.user?.id) {
        router.push("/login");
        return;
      }

      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: authSession.user.id,
          agent_name: agentName,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const message = data.error || "Impossible de créer une nouvelle session";
        setError(message);
        console.error("Error creating session:", message);
        return;
      }

      const data = await response.json();

      console.log("--- handleSelectAgent: data", data);

      // Redirect to new interview page with session info (avoid duplicate session creation)
      // Agent is now stored in database, no need to pass in URL
      router.push(
        `/interview?interviewId=${data.interviewId}&sessionId=${data.sessionId}&adkSessionId=${data.adkSessionId}`
      );
    } catch (err) {
      console.error("Error selecting agent:", err);
      setError("Une erreur est survenue lors de la création de la session");
    } finally {
      setIsCreatingSession(false);
    }
  };

  const toggleExpanded = (interviewId: string) => {
    setExpandedInterviewId((current) => (current === interviewId ? null : interviewId));
  };

  if (isLoading) {
    return (
      <Container maxWidth="4xl" height="100vh" display="flex" alignItems="center" justifyContent="center">
        <VStack gap={4}>
          <Spinner size="lg" color="blue.500" />
          <Text>Chargement de vos entretiens...</Text>
        </VStack>
      </Container>
    );
  }

  return (
    <Container maxWidth="4xl" py={8} px={{ base: 4, md: 6 }}>
      <VStack gap={8} alignItems="stretch">
        {/* Header */}
        <VStack gap={4} alignItems="start">
          <Heading size="xl">Mes entretiens</Heading>
          <Text color="gray.600">
            Gérez et consultez l&apos;historique de vos simulations d&apos;entretien.
          </Text>
        </VStack>

        {/* Agent Selection Cards */}
        <Box>
          <Heading size="sm" marginBottom={4}>
            Choisissez un agent pour commencer
          </Heading>
          <Grid gridTemplateColumns="repeat(3, 1fr)" gap={6}>
            {AGENTS.map((agent) => (
              <Card.Root key={agent.id}>
                <Card.Body display="flex" flexDirection="column" alignItems="center" gap={4} py={6}>
                  <Avatar.Root size="lg">
                    <Avatar.Fallback>{agent.name.charAt(0)}</Avatar.Fallback>
                  </Avatar.Root>
                  <VStack gap={2} alignItems="center">
                    <Text fontWeight="semibold" fontSize="md">
                      {agent.name}
                    </Text>
                    <Text fontSize="sm" color="gray.600" textAlign="center">
                      {agent.description}
                    </Text>
                  </VStack>
                  <Button
                    onClick={() => handleSelectAgent(agent.id)}
                    colorPalette="blue"
                    size="sm"
                    width="full"
                    disabled={isCreatingSession}
                  >
                    {isCreatingSession ? "Création..." : "Interviewer"}
                  </Button>
                </Card.Body>
              </Card.Root>
            ))}
          </Grid>
        </Box>

        {/* Error State */}
        {error && (
          <Box
            backgroundColor="red.50"
            borderRadius="md"
            padding={4}
            borderLeft="4px solid"
            borderLeftColor="red.500"
          >
            <Text color="red.700">{error}</Text>
          </Box>
        )}

        {/* Empty State */}
        {interviews.length === 0 && !error && (
          <VStack
            gap={4}
            alignItems="center"
            paddingY={12}
            borderRadius="md"
            backgroundColor="gray.50"
          >
            <Text color="gray.600" fontSize="lg">
              Vous n&apos;avez pas encore d&apos;entretiens
            </Text>
            <Text color="gray.500" fontSize="sm">
              Cliquez sur le bouton ci-dessus pour créer votre première simulation.
            </Text>
          </VStack>
        )}

        {/* Interviews List */}
        {interviews.length > 0 && (
          <Stack gap={4}>
            {interviews.map((interview) => {
              const usage = interview.interview_usage?.[0];
              const latestAssistant = getLatestAssistantMessage(interview.messages || []);
              const firstLine =
                latestAssistant?.content?.split("\n")[0]?.trim() ?? "Aucun message assistant";
              const isExpanded = expandedInterviewId === interview.id;

              return (
                <Box
                  key={interview.id}
                  borderWidth="1px"
                  borderColor="gray.200"
                  borderRadius="md"
                  padding={4}
                  transition="all 0.2s"
                >
                  {/* Top Row: Agent, Status, Date */}
                  <HStack justify="space-between" marginBottom={3}>
                    <HStack gap={3}>
                      <Text fontWeight="semibold" fontSize="md">
                        Oriane
                      </Text>
                      <Badge colorPalette={getStatusColor(interview.status)}>
                        {getStatusLabel(interview.status)}
                      </Badge>
                    </HStack>
                    <Text fontSize="sm" color="gray.600">
                      {formatDate(interview.updated_at)}
                    </Text>
                  </HStack>

                  {/* Last Message Preview */}
                  <VStack align="stretch" gap={2} marginBottom={3}>
                    <Box
                      as="button"
                      textAlign="left"
                      onClick={() => toggleExpanded(interview.id)}
                      paddingY={1}
                      paddingRight={2}
                      paddingLeft={2}
                      cursor="pointer"
                      _hover={{ color: "gray.800" }}
                    >
                      <Text
                        color="gray.700"
                        fontSize="sm"
                        flex="1"
                        whiteSpace={isExpanded ? "pre-wrap" : "nowrap"}
                        overflow="hidden"
                        textOverflow="ellipsis"
                      >
                        {isExpanded ? latestAssistant?.content : firstLine}
                      </Text>
                    </Box>
                  </VStack>

                  {/* Token Counts */}
                  <VStack align="stretch" gap={2}>
                    <HStack align="center" justify="space-between" gap={4}>
                      {usage ? (
                        <HStack justify="flex-start" gap={4}>
                          <Text fontSize="xs" color="gray.600">
                            <Text as="span" fontWeight="semibold">
                              {usage.total_input_tokens}
                            </Text>{" "}
                            tokens entrée
                          </Text>
                          <Text fontSize="xs" color="gray.600">
                            <Text as="span" fontWeight="semibold">
                              {usage.total_output_tokens}
                            </Text>{" "}
                            tokens sortie
                          </Text>
                        </HStack>
                      ) : (
                        <Box />
                      )}

                      <Button
                        colorPalette="blue"
                        size="xs"
                        paddingInline={4}
                        paddingBlock={2}
                        fontSize="xs"
                        onClick={() => router.push(`/interview/${interview.id}`)}
                      >
                        Continuer
                      </Button>
                    </HStack>
                  </VStack>
                </Box>
              );
            })}
          </Stack>
        )}
      </VStack>
    </Container>
  );
}
