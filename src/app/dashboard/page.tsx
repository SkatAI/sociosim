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
} from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

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

const getLastAssistantMessage = (messages: Array<{ content: string; role: string }>): string => {
  const assistantMessages = messages.filter((msg) => msg.role === "assistant");
  if (assistantMessages.length === 0) return "";

  const lastMessage = assistantMessages[assistantMessages.length - 1];
  const maxLength = 100;
  return lastMessage.content.length > maxLength
    ? lastMessage.content.substring(0, maxLength) + "..."
    : lastMessage.content;
};

export default function DashboardPage() {
  const router = useRouter();
  const [interviews, setInterviews] = useState<InterviewWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

        // Fetch user's interviews
        const { data, error: fetchError } = await supabase
          .from("interviews")
          .select(`
            *,
            interview_usage(total_input_tokens, total_output_tokens),
            messages(content, role, created_at)
          `)
          .eq("user_id", authSession.user.id)
          .order("updated_at", { ascending: false });

        if (fetchError) {
          setError("Impossible de charger vos entretiens");
          console.error("Error fetching interviews:", fetchError);
        } else {
          setInterviews((data as InterviewWithDetails[]) || []);
        }
      } catch (err) {
        console.error("Error in dashboard:", err);
        setError("Une erreur est survenue");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [router]);

  const handleCreateInterview = () => {
    router.push("/interview");
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

        {/* Create Interview Button */}
        <Box>
          <Button
            onClick={handleCreateInterview}
            colorPalette="blue"
            size="lg"
            width="full"
            height="120px"
            fontSize="lg"
            fontWeight="semibold"
          >
            + Créer un nouvel entretien
          </Button>
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
              const lastMessage = getLastAssistantMessage(interview.messages || []);

              return (
                <Box
                  key={interview.id}
                  borderWidth="1px"
                  borderColor="gray.200"
                  borderRadius="md"
                  padding={4}
                  cursor="pointer"
                  _hover={{
                    borderColor: "blue.300",
                    backgroundColor: "blue.50",
                  }}
                  transition="all 0.2s"
                  onClick={() => {
                    // TODO: Navigate to interview details/resume
                  }}
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
                  {lastMessage && (
                    <Text
                      color="gray.700"
                      fontSize="sm"
                      marginBottom={3}
                      overflow="hidden"
                      textOverflow="ellipsis"
                      display="-webkit-box"
                      css={{
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      {lastMessage}
                    </Text>
                  )}

                  {/* Token Counts */}
                  {usage && (
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
                  )}
                </Box>
              );
            })}
          </Stack>
        )}
      </VStack>
    </Container>
  );
}
