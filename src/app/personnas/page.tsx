"use client";

import {
  Box,
  Button,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Spinner,
  Grid,
  Card,
  Avatar,
} from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { type Agent } from "@/lib/agents";
import { supabase } from "@/lib/supabaseClient";

interface InterviewWithDetails {
  agents?: {
    agent_name?: string;
  };
  messages?: Array<{
    content: string;
  }>;
}

export default function PersonnasPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuthUser();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interactedAgents, setInteractedAgents] = useState<string[]>([]);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!user) {
      setIsLoading(false);
      router.push("/login");
      return;
    }

    const loadData = async () => {
      try {
        const [agentsResult, interviewsResult] = await Promise.allSettled([
          supabase
            .from("agents")
            .select("id, agent_name, description, agent_prompts!inner(published)")
            .eq("agent_prompts.published", true)
            .order("agent_name"),
          fetch(`/api/user/interviews?userId=${user.id}`),
        ]);

        if (agentsResult.status === "fulfilled") {
          const { data: agentsData, error: agentsError } = agentsResult.value;
          if (agentsError) {
            console.error("Error fetching agents:", agentsError);
            setError("Impossible de charger les agents");
          } else {
            const uniqueAgents = new Map<string, Agent>();
            (agentsData || []).forEach((agent) => {
              uniqueAgents.set(agent.id, agent as Agent);
            });
            setAgents(Array.from(uniqueAgents.values()));
          }
        } else {
          console.error("Error fetching agents:", agentsResult.reason);
          setError("Impossible de charger les agents");
        }

        if (interviewsResult.status === "fulfilled") {
          const response = interviewsResult.value;
          if (response.ok) {
            const data = await response.json();
            const agentNames = new Set<string>();
            (data.interviews || [])
              .filter((interview: InterviewWithDetails) => interview.messages?.length)
              .forEach((interview: InterviewWithDetails) => {
                const name = interview.agents?.agent_name;
                if (name) agentNames.add(name);
              });
            setInteractedAgents(Array.from(agentNames));
          } else {
            console.error("Error fetching interviews for history:", response.statusText);
          }
        } else {
          console.error("Error fetching interviews for history:", interviewsResult.reason);
        }
      } catch (err) {
        console.error("Error fetching personnas data:", err);
        setError("Une erreur est survenue");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [isAuthLoading, user, router]);

  const handleSelectAgent = async (agentName: string) => {
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

  if (isLoading) {
    return (
      <Container maxWidth="4xl" height="100vh" display="flex" alignItems="center" justifyContent="center">
        <VStack gap={4}>
          <Spinner size="lg" color="blue.500" />
          <Text color="fg.muted">Chargement des personnas...</Text>
        </VStack>
      </Container>
    );
  }

  return (
    <Container maxWidth="4xl" py={8} px={{ base: 4, md: 6 }}>
      <VStack gap={8} alignItems="stretch">
        <Heading size="lg" marginBottom={0}>
          Choisissez un personnage
        </Heading>

        {/* Error State */}
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

        {/* Empty State */}
        {agents.length === 0 && !error && (
          <VStack
            gap={4}
            alignItems="center"
            paddingY={12}
            borderRadius="md"
            backgroundColor="bg.subtle"
          >
            <Text color="fg.muted" fontSize="lg">
              Aucun personna disponible
            </Text>
            <Text color="fg.subtle" fontSize="sm">
              Revenez plus tard pour démarrer une simulation.
            </Text>
          </VStack>
        )}

        {/* Agent Selection Cards */}
        {agents.length > 0 && (
          <Grid
            gridTemplateColumns={{ base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }}
            gap={6}
          >
            {agents.map((agent) => (
              <Card.Root key={agent.id}>
                <Card.Body display="flex" flexDirection="column" alignItems="center" gap={4} py={6} px={4}>
                  <Avatar.Root size="lg">
                    <Avatar.Fallback>{agent.agent_name.charAt(0)}</Avatar.Fallback>
                  </Avatar.Root>
                  <VStack gap={2} alignItems="center">
                    <Text fontWeight="semibold" fontSize="md">
                      {agent.agent_name}
                    </Text>
                    <Text
                      fontSize="sm"
                      color="fg.muted"
                      textAlign="center"
                      lineHeight="1.4"
                      whiteSpace="pre-line"
                    >
                      {(agent.description || "").replace(/\\n/g, "\n")}
                    </Text>
                  </VStack>
                  <HStack gap={3}>
                    <Button
                      onClick={() => handleSelectAgent(agent.agent_name)}
                      colorPalette="blue"
                      size="sm"
                      padding={4}
                      disabled={isCreatingSession}
                    >
                      {isCreatingSession ? "Création..." : "Nouvel entretien"}
                    </Button>
                    {interactedAgents.includes(agent.agent_name) && (
                      <Button
                        onClick={() =>
                          router.push(`/dashboard?agent=${encodeURIComponent(agent.agent_name)}`)
                        }
                        colorPalette="blue"
                        size="sm"
                        padding={4}
                      >
                        Historique
                      </Button>
                    )}
                  </HStack>
                </Card.Body>
              </Card.Root>
            ))}
          </Grid>
        )}
      </VStack>
    </Container>
  );
}
