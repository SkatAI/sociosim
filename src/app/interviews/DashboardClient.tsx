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
  ButtonGroup,
  Spinner,
  Card,
  NativeSelect,
  Pagination,
  IconButton,
  Icon,
  Tooltip,
} from "@chakra-ui/react";
import { LuChevronDown, LuChevronLeft, LuChevronRight, LuChevronUp } from "react-icons/lu";
import NextLink from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuthUser } from "@/hooks/useAuthUser";

interface InterviewWithDetails {
  id: string;
  agent_id?: string;
  status: string;
  updated_at: string;
  agents?: {
    agent_name?: string;
    active?: boolean;
  };
  starter_user_id?: string | null;
  starter_user_name?: string | null;
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

const formatAgentName = (name?: string): string => {
  if (!name) return "Agent";
  return name.charAt(0).toUpperCase() + name.slice(1);
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
  const { user, isLoading: isAuthLoading, user_admin } = useAuthUser();
  const userDisplayName = (() => {
    if (!user) return "Utilisateur";
    const metadata = user.user_metadata || {};
    const firstName = (metadata.firstName as string) || "";
    const lastName = (metadata.lastName as string) || "";
    const fullName = `${firstName} ${lastName}`.trim();
    if (fullName) return fullName;
    const metadataName = (metadata.name as string) || "";
    if (metadataName) return metadataName;
    return user.email?.split("@")[0] ?? "Utilisateur";
  })();
  const [interviews, setInterviews] = useState<InterviewWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedInterviewId, setExpandedInterviewId] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState("all");
  const [selectedUserId, setSelectedUserId] = useState("all");
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
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

        const response = await fetch(`/api/user/interviews?userId=${user.id}`, {
          cache: "no-store",
        });
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
    if (selectedAgentId === "all") {
      router.push("/personnas");
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

  const agentOptions = Array.from(
    interviews.reduce((map, interview) => {
      if (interview.agent_id) {
        map.set(interview.agent_id, {
          id: interview.agent_id,
          name: formatAgentName(interview.agents?.agent_name),
        });
      }
      return map;
    }, new Map<string, { id: string; name: string }>())
  ).map(([, option]) => option);
  const hasMultipleAgents = agentOptions.length > 1;
  const userOptions = useMemo(() => {
    if (!user_admin) return [];
    return Array.from(
      interviews.reduce((map, interview) => {
        if (interview.starter_user_id) {
          map.set(interview.starter_user_id, {
            id: interview.starter_user_id,
            name: interview.starter_user_name || "Utilisateur",
          });
        }
        return map;
      }, new Map<string, { id: string; name: string }>())
    ).map(([, option]) => option);
  }, [interviews, user_admin]);
  const filteredByAgent =
    selectedAgentId === "all"
      ? interviews
      : interviews.filter((interview) => interview.agent_id === selectedAgentId);
  const filteredInterviews =
    !user_admin || selectedUserId === "all"
      ? filteredByAgent
      : filteredByAgent.filter((interview) => interview.starter_user_id === selectedUserId);
  const totalPages = Math.max(1, Math.ceil(filteredInterviews.length / pageSize));
  const paginatedInterviews = filteredInterviews.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  useEffect(() => {
    if (!hasMultipleAgents) {
      setSelectedAgentId("all");
      return;
    }
    if (selectedAgentId !== "all" && !agentOptions.some((option) => option.id === selectedAgentId)) {
      setSelectedAgentId("all");
    }
  }, [agentOptions, hasMultipleAgents, selectedAgentId]);

  useEffect(() => {
    if (!user_admin) {
      setSelectedUserId("all");
      return;
    }
    if (selectedUserId !== "all" && !userOptions.some((option) => option.id === selectedUserId)) {
      setSelectedUserId("all");
    }
  }, [selectedUserId, userOptions, user_admin]);

  useEffect(() => {
    const agentParam = searchParams.get("agent");
    if (!agentParam || hasAppliedAgentParam.current || agentOptions.length === 0) return;
    const matchedById = agentOptions.find((option) => option.id === agentParam);
    const matchedByName = agentOptions.find((option) => option.name === agentParam);
    if (matchedById) {
      setSelectedAgentId(matchedById.id);
    } else if (matchedByName) {
      setSelectedAgentId(matchedByName.id);
    }
    hasAppliedAgentParam.current = true;
  }, [agentOptions, searchParams]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedAgentId, selectedUserId, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

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
              {user_admin ? "Tous les entretiens" : "Mes entretiens"}
            </Heading>
            {hasMultipleAgents && (
              <NativeSelect.Root>
                <NativeSelect.Field
                  aria-label="Filtrer par agent"
                  value={selectedAgentId}
                  onChange={(event) => setSelectedAgentId(event.target.value)}
                  fontSize="sm"
                  borderWidth="1px"
                  borderColor="border.muted"
                  borderRadius="md"
                  backgroundColor="bg.surface"
                >
                  <option value="all">Tous</option>
                  {agentOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            )}
            {user_admin && userOptions.length > 0 && (
              <NativeSelect.Root>
                <NativeSelect.Field
                  aria-label="Filtrer par utilisateur"
                  value={selectedUserId}
                  onChange={(event) => setSelectedUserId(event.target.value)}
                  fontSize="sm"
                  borderWidth="1px"
                  borderColor="border.muted"
                  borderRadius="md"
                  backgroundColor="bg.surface"
                >
                  <option value="all">Tous les utilisateurs</option>
                  {userOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            )}
          </HStack>
          <Button
            variant="subtle"
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
              {selectedAgentId === "all"
                ? "Vous n'avez pas encore d'entretiens"
                : "Aucun entretien pour ce personna"}
            </Text>
            {selectedAgentId === "all" && (
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
          <Card.Root backgroundColor="bg.muted" borderWidth="0">
            <Card.Body display="flex" flexDirection="column" gap={4}>
              {paginatedInterviews.map((interview) => {
                const latestAssistant = getLatestAssistantMessage(interview.messages || []);
                const collapsedPreview = latestAssistant?.content
                  ? latestAssistant.content
                      .split("\n")
                      .map((line) => line.trim())
                      .filter((line) => line.length > 0)
                      .join("\n")
                  : "Aucun message assistant";
                const isExpanded = expandedInterviewId === interview.id;
                const isOwner = Boolean(
                  interview.starter_user_id && user?.id && interview.starter_user_id === user.id
                );
                const actionLabel =
                  user_admin && !isOwner ? "Voir l'interview" : "Continuer";

                return (
                  <Box
                    key={interview.id}
                    borderWidth="1px"
                    borderColor="border.muted"
                    borderRadius="md"
                    backgroundColor="bg.surface"
                    padding={4}
                    transition="all 0.2s"
                  >
                    <HStack justify="space-between" marginBottom={3}>
                      <HStack gap={3}>
                        <Text fontWeight="semibold" fontSize="md">
                          {formatAgentName(interview.agents?.agent_name)}
                        </Text>
                      </HStack>
                      <HStack gap={3}>
                        <Text fontSize="sm" color="fg.muted">
                          {user_admin
                            ? interview.starter_user_name || "Utilisateur"
                            : userDisplayName}
                        </Text>
                        <Text fontSize="sm" color="fg.muted">
                          {formatDate(interview.updated_at)}
                        </Text>
                      </HStack>
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
                        position="relative"
                      >
                        <Text
                          color="fg.muted"
                          fontSize="sm"
                          flex="1"
                          whiteSpace={isExpanded ? "pre-wrap" : "normal"}
                          css={
                            isExpanded
                              ? undefined
                              : {
                                  display: "-webkit-box",
                                  WebkitLineClamp: 3,
                                  WebkitBoxOrient: "vertical",
                                  overflow: "hidden",
                                }
                          }
                        >
                          {isExpanded ? latestAssistant?.content : collapsedPreview}
                        </Text>
                        <Icon
                          as={isExpanded ? LuChevronUp : LuChevronDown}
                          position="absolute"
                          bottom="2px"
                          right="2px"
                          color="fg.subtle"
                        />
                      </Box>
                    </VStack>

                    <VStack align="stretch" gap={2}>
                      <HStack align="center" justify="space-between" gap={4}>
                        <Box />

                        <Button
                          variant="subtle"
                          size="xs"
                          paddingInline={4}
                          paddingBlock={2}
                          fontSize="xs"
                          onClick={() => router.push(`/interview/${interview.id}`)}
                        >
                          {actionLabel}
                        </Button>
                      </HStack>
                    </VStack>
                  </Box>
                );
              })}
            </Card.Body>
          </Card.Root>
        )}

        {filteredInterviews.length > 0 && (
          <HStack justify="space-between" align="center" flexWrap="wrap" gap={4}>
            <HStack align="center" gap={3}>
              <Text fontSize="sm" color="fg.muted">
                Entretiens par page
              </Text>
              <NativeSelect.Root>
                <NativeSelect.Field
                  aria-label="Entretiens par page"
                  value={String(pageSize)}
                  onChange={(event) => setPageSize(Number(event.target.value))}
                  fontSize="sm"
                  borderWidth="1px"
                  borderColor="border.muted"
                  borderRadius="md"
                  backgroundColor="bg.surface"
                >
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="20">20</option>
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </HStack>

            <Pagination.Root
              count={filteredInterviews.length}
              pageSize={pageSize}
              page={currentPage}
              onPageChange={(details) => setCurrentPage(details.page)}
            >
              <ButtonGroup variant="subtle" size="sm">
                <Tooltip.Root openDelay={150}>
                  <Tooltip.Trigger asChild>
                    <Pagination.PrevTrigger asChild>
                      <IconButton aria-label="Page précédente">
                        <LuChevronLeft />
                      </IconButton>
                    </Pagination.PrevTrigger>
                  </Tooltip.Trigger>
                  <Tooltip.Positioner>
                    <Tooltip.Content px={3} py={2}>
                      Page précédente
                    </Tooltip.Content>
                  </Tooltip.Positioner>
                </Tooltip.Root>

                <Pagination.Items
                  render={(page) => (
                    <Tooltip.Root openDelay={150}>
                      <Tooltip.Trigger asChild>
                        <IconButton
                          aria-label={`Page ${page.value}`}
                          variant={{ base: "subtle", _selected: "solid" }}
                        >
                          {page.value}
                        </IconButton>
                      </Tooltip.Trigger>
                      <Tooltip.Positioner>
                        <Tooltip.Content px={3} py={2}>
                          Page {page.value}
                        </Tooltip.Content>
                      </Tooltip.Positioner>
                    </Tooltip.Root>
                  )}
                />

                <Tooltip.Root openDelay={150}>
                  <Tooltip.Trigger asChild>
                    <Pagination.NextTrigger asChild>
                      <IconButton aria-label="Page suivante">
                        <LuChevronRight />
                      </IconButton>
                    </Pagination.NextTrigger>
                  </Tooltip.Trigger>
                  <Tooltip.Positioner>
                    <Tooltip.Content px={3} py={2}>
                      Page suivante
                    </Tooltip.Content>
                  </Tooltip.Positioner>
                </Tooltip.Root>
              </ButtonGroup>
            </Pagination.Root>
          </HStack>
        )}
      </VStack>
    </Container>
  );
}
