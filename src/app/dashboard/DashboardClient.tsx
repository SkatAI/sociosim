"use client";

import {
  Box,
  Button,
  Container,
  Heading,
  Link,
  Text,
  VStack,
  HStack,
  Badge,
  Spinner,
  Card,
  NativeSelect,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuthUser } from "@/hooks/useAuthUser";

interface InterviewWithDetails {
  id: string;
  agent_id?: string;
  status: string;
  updated_at: string;
  agents?: {
    agent_name?: string;
  };
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
  return messages.find((msg) => msg.role === "assistant") || null;
};

export default function DashboardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: isAuthLoading } = useAuthUser();
  const [interviews, setInterviews] = useState<InterviewWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedInterviewId, setExpandedInterviewId] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState("Tous");
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const hasAppliedAgentParam = useRef(false);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }

    const loadData = async () => {
      try {
        console.log("[Dashboard] User logged in with ID:", user.id);
        console.log("[Dashboard] Fetching interviews from API...");

        const response = await fetch(`/api/user/interviews?userId=${user.id}`);
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          const message = data.error || "Impossible de charger vos entretiens";
          setError(message);
          console.error("Error fetching interviews:", message);
          setIsLoading(false);
          return;
        }

        const data = await response.json();
        console.log("[Dashboard] API response received:", {
          success: data.success,
          interviewCount: data.interviews?.length || 0,
        });

        const transformedInterviews =
          (data.interviews as InterviewWithDetails[] | undefined)?.filter(
            (interview) => interview.messages && interview.messages.length > 0
          ) || [];

        console.log(
          "[Dashboard] Filtered interviews with messages:",
          transformedInterviews.length
        );

        setInterviews(transformedInterviews);
      } catch (err) {
        console.error("Error in dashboard:", err);
        setError("Une erreur est survenue");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [isAuthLoading, user, router]);

  const toggleExpanded = (interviewId: string) => {
    setExpandedInterviewId((current) => (current === interviewId ? null : interviewId));
  };

  const handleNewInterview = async () => {
    if (selectedAgent === "Tous") {
      router.push("/personnas");
      return;
    }

    const selectedAgentId = interviews.find(
      (interview) => interview.agents?.agent_name === selectedAgent
    )?.agent_id;

    if (!selectedAgentId) {
      setError("Impossible de retrouver l'identifiant du personna");
      return;
    }

    try {
      setIsCreatingSession(true);

      if (!user?.id) {
        router.push("/login");
        return;
      }

      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          agent_id: selectedAgentId,
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

      router.push(
        `/interview?interviewId=${data.interviewId}&sessionId=${data.sessionId}&adkSessionId=${data.adkSessionId}`
      );
    } catch (err) {
      console.error("Error creating session:", err);
      setError("Une erreur est survenue lors de la création de la session");
    } finally {
      setIsCreatingSession(false);
    }
  };

  const agentNames = Array.from(
    new Set(
      interviews
        .map((interview) => interview.agents?.agent_name)
        .filter((name): name is string => Boolean(name))
    )
  );
  const hasMultipleAgents = agentNames.length > 1;
  const filteredInterviews =
    selectedAgent === "Tous"
      ? interviews
      : interviews.filter((interview) => interview.agents?.agent_name === selectedAgent);

  useEffect(() => {
    if (!hasMultipleAgents) {
      setSelectedAgent("Tous");
      return;
    }
    if (selectedAgent !== "Tous" && !agentNames.includes(selectedAgent)) {
      setSelectedAgent("Tous");
    }
  }, [agentNames, hasMultipleAgents, selectedAgent]);

  useEffect(() => {
    const agentParam = searchParams.get("agent");
    if (!agentParam || hasAppliedAgentParam.current || agentNames.length === 0) return;
    if (agentNames.includes(agentParam)) {
      setSelectedAgent(agentParam);
    }
    hasAppliedAgentParam.current = true;
  }, [agentNames, searchParams]);

  if (isLoading) {
    return (
      <Container maxWidth="4xl" height="100vh" display="flex" alignItems="center" justifyContent="center">
        <VStack gap={4}>
          <Spinner size="lg" color="blue.500" />
          <Text color="fg.muted">Chargement de vos entretiens...</Text>
        </VStack>
      </Container>
    );
  }

  return (
    <Container maxWidth="4xl" py={8} px={{ base: 4, md: 6 }}>
      <VStack gap={8} alignItems="stretch">
        <HStack align="center" justify="space-between" gap={6} width="full">
          <HStack align="center" gap={6}>
            <Heading size="lg" marginBottom={0}>
              Mes entretiens
            </Heading>
            {hasMultipleAgents && (
              <NativeSelect.Root>
                <NativeSelect.Field
                  value={selectedAgent}
                  onChange={(event) => setSelectedAgent(event.target.value)}
                  fontSize="sm"
                  borderWidth="1px"
                  borderColor="border.muted"
                  borderRadius="md"
                  backgroundColor="bg.surface"
                >
                  <option value="Tous">Tous</option>
                  {agentNames.map((agentName) => (
                    <option key={agentName} value={agentName}>
                      {agentName}
                    </option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            )}
          </HStack>
          <Button
            colorPalette="blue"
            size="sm"
            paddingInline={4}
            onClick={handleNewInterview}
            disabled={isCreatingSession}
          >
            {isCreatingSession ? "Création..." : "Nouvel entretien"}
          </Button>
        </HStack>

        {error && (
          <Box
            backgroundColor={{ base: "red.50", _dark: "red.900" }}
            borderRadius="md"
            padding={4}
            borderLeft="4px solid"
            borderLeftColor="red.500"
          >
            <Text color={{ base: "red.700", _dark: "red.200" }}>{error}</Text>
          </Box>
        )}

        {filteredInterviews.length === 0 && !error && (
          <VStack
            gap={4}
            alignItems="center"
            paddingY={12}
            borderRadius="md"
            backgroundColor="bg.subtle"
          >
            <Text color="fg.muted" fontSize="lg">
              {selectedAgent === "Tous"
                ? "Vous n&apos;avez pas encore d&apos;entretiens"
                : "Aucun entretien pour ce personna"}
            </Text>
            {selectedAgent === "Tous" && (
              <Text color="fg.subtle" fontSize="sm">
                Rendez-vous sur{" "}
                <Link as={NextLink} href="/personnas" color="accent.primary" fontWeight="semibold">
                  Personnas
                </Link>{" "}
                pour démarrer votre première simulation.
              </Text>
            )}
          </VStack>
        )}

        {filteredInterviews.length > 0 && (
          <Card.Root>
            <Card.Body display="flex" flexDirection="column" gap={4}>
              {filteredInterviews.map((interview) => {
                const usage = interview.interview_usage?.[0];
                const latestAssistant = getLatestAssistantMessage(interview.messages || []);
                const firstLine =
                  latestAssistant?.content?.split("\n")[0]?.trim() ?? "Aucun message assistant";
                const isExpanded = expandedInterviewId === interview.id;

                return (
                  <Box
                    key={interview.id}
                    borderWidth="1px"
                    borderColor="border.muted"
                    borderRadius="md"
                    padding={4}
                    transition="all 0.2s"
                  >
                    <HStack justify="space-between" marginBottom={3}>
                      <HStack gap={3}>
                        <Text fontWeight="semibold" fontSize="md">
                          {interview.agents?.agent_name || "Agent"}
                        </Text>
                        <Badge colorPalette={getStatusColor(interview.status)}>
                          {getStatusLabel(interview.status)}
                        </Badge>
                      </HStack>
                      <Text fontSize="sm" color="fg.muted">
                        {formatDate(interview.updated_at)}
                      </Text>
                    </HStack>

                    <VStack align="stretch" gap={2} marginBottom={3}>
                      <Box
                        as="button"
                        textAlign="left"
                        onClick={() => toggleExpanded(interview.id)}
                        paddingY={1}
                        paddingRight={2}
                        paddingLeft={2}
                        cursor="pointer"
                        _hover={{ color: "fg.default" }}
                      >
                        <Text
                          color="fg.muted"
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

                    <VStack align="stretch" gap={2}>
                      <HStack align="center" justify="space-between" gap={4}>
                        {usage ? (
                          <HStack justify="flex-start" gap={4}>
                            <Text fontSize="xs" color="fg.muted">
                              <Text as="span" fontWeight="semibold">
                                {usage.total_input_tokens}
                              </Text>{" "}
                              tokens entrée
                            </Text>
                            <Text fontSize="xs" color="fg.muted">
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
            </Card.Body>
          </Card.Root>
        )}
      </VStack>
    </Container>
  );
}
