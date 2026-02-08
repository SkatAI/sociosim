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
} from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { type Agent } from "@/lib/agents";
import { isAdminLike } from "@/lib/agentPolicy";
import { toaster } from "@/components/ui/toaster";
import { AgentCard } from "./components/AgentCard";
import { groupAgentsByCreator } from "./groupAgents";

interface InterviewWithDetails {
  agent_id?: string;
  message_count?: number;
  agents?: {
    agent_name?: string;
  };
  messages?: Array<{
    content: string;
  }>;
}

const GRID_COLUMNS = { base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" };

function AgentGrid({
  agents,
  isCreatingSession,
  togglingAgentId,
  interactedAgents,
  userAdmin,
  onSelectAgent,
  onToggleAgent,
  onNavigateHistory,
  onNavigatePrompt,
}: {
  agents: Agent[];
  isCreatingSession: boolean;
  togglingAgentId: string | null;
  interactedAgents: string[];
  userAdmin: boolean;
  onSelectAgent: (agentId: string) => void;
  onToggleAgent: (agent: Agent) => void;
  onNavigateHistory: (agentId: string) => void;
  onNavigatePrompt: (agentId: string) => void;
}) {
  if (agents.length === 0) return null;
  return (
    <Grid gridTemplateColumns={GRID_COLUMNS} gap={6}>
      {agents.map((agent) => (
        <AgentCard
          key={agent.id}
          agent={agent}
          isCreatingSession={isCreatingSession}
          togglingAgentId={togglingAgentId}
          hasInteracted={interactedAgents.includes(agent.id)}
          userAdmin={userAdmin}
          onSelectAgent={onSelectAgent}
          onToggleAgent={onToggleAgent}
          onNavigateHistory={onNavigateHistory}
          onNavigatePrompt={onNavigatePrompt}
        />
      ))}
    </Grid>
  );
}

export default function PersonnasPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading, user_admin } = useAuthUser();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interactedAgents, setInteractedAgents] = useState<string[]>([]);
  const [togglingAgentId, setTogglingAgentId] = useState<string | null>(null);

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
          fetch("/api/agents?template=false"),
          fetch(`/api/user/interviews?userId=${user.id}`),
        ]);

        if (agentsResult.status === "fulfilled") {
          const response = agentsResult.value;
          if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            const message = data.error || "Impossible de charger les agents";
            console.error("Error fetching agents:", message);
            setError(message);
          } else {
            const data = await response.json();
            const uniqueAgents = new Map<string, Agent>();
            (data.agents || []).forEach((agent: Agent) => {
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
            const agentIds = new Set<string>();
            (data.interviews || []).forEach((interview: InterviewWithDetails) => {
              if (interview.message_count && interview.message_count > 0 && interview.agent_id) {
                agentIds.add(interview.agent_id);
              }
            });
            setInteractedAgents(Array.from(agentIds));
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

  const handleSelectAgent = async (agentId: string) => {
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
          agent_id: agentId,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const message = data.error || "Impossible de cr\u00e9er une nouvelle session";
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
      setError("Une erreur est survenue lors de la cr\u00e9ation de la session");
    } finally {
      setIsCreatingSession(false);
    }
  };

  const handleToggleAgent = async (agent: Agent) => {
    setTogglingAgentId(agent.id);
    setError(null);
    try {
      const nextActive = !agent.active;
      const response = await fetch(`/api/agents/${agent.id}/active`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: nextActive }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const message = data.error || "Impossible de mettre \u00e0 jour le personna";
        console.error("Error updating agent status:", message);
        setError(message);
        return;
      }

      setAgents((prev) =>
        prev.map((item) =>
          item.id === agent.id ? { ...item, active: nextActive } : item
        )
      );
      toaster.create({
        type: "success",
        description: nextActive ? "L'agent est activ\u00e9" : "L'agent est d\u00e9sactiv\u00e9",
        duration: 6000,
        closable: true,
      });
    } catch (err) {
      console.error("Error updating agent status:", err);
      setError("Une erreur est survenue lors de la mise \u00e0 jour du personna");
    } finally {
      setTogglingAgentId(null);
    }
  };

  const handleNavigateHistory = (agentId: string) => {
    router.push(`/interviews?agent=${encodeURIComponent(agentId)}`);
  };

  const handleNavigatePrompt = (agentId: string) => {
    router.push(`/personnas/${agentId}/edit`);
  };

  // Admin view: group by creator
  const groups = useMemo(() => groupAgentsByCreator(agents), [agents]);
  const staffGroup = useMemo(() => groups.find((g) => g.isStaff), [groups]);
  const studentGroups = useMemo(() => groups.filter((g) => !g.isStaff), [groups]);
  const allStudentActive = useMemo(
    () => studentGroups.flatMap((g) => g.activeAgents),
    [studentGroups]
  );
  const allStudentInactive = useMemo(
    () => studentGroups.flatMap((g) => g.inactiveAgents),
    [studentGroups]
  );

  // Student view: staff public active + own agents
  const staffPublicActive = useMemo(
    () => agents.filter((a) => isAdminLike(a.creator_role) && a.active && a.is_public),
    [agents]
  );
  const myAgents = useMemo(
    () => (user ? agents.filter((a) => a.created_by === user.id) : []),
    [agents, user]
  );
  const myActiveAgents = useMemo(() => myAgents.filter((a) => a.active), [myAgents]);
  const myInactiveAgents = useMemo(() => myAgents.filter((a) => !a.active), [myAgents]);

  const gridProps = {
    isCreatingSession,
    togglingAgentId,
    interactedAgents,
    userAdmin: user_admin,
    onSelectAgent: handleSelectAgent,
    onToggleAgent: handleToggleAgent,
    onNavigateHistory: handleNavigateHistory,
    onNavigatePrompt: handleNavigatePrompt,
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
        <HStack justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={3}>
          <Heading size="lg" marginBottom={0}>
            Personnas publiques
          </Heading>
          <Button variant="solid" colorPalette="blue" size="sm" onClick={() => router.push("/personnas/new")} paddingInline={5}>
            Créer une nouvelle personna
          </Button>
        </HStack>

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
              Revenez plus tard pour d\u00e9marrer une simulation.
            </Text>
          </VStack>
        )}

        {/* Admin/Teacher view: grouped by creator */}
        {agents.length > 0 && user_admin && (
          <VStack gap={8} alignItems="stretch">
            {staffGroup && (
              <VStack gap={4} alignItems="stretch">
                <AgentGrid agents={staffGroup.activeAgents} {...gridProps} />
                {staffGroup.inactiveAgents.length > 0 && (
                  <AgentGrid agents={staffGroup.inactiveAgents} {...gridProps} />
                )}
              </VStack>
            )}
            {(allStudentActive.length > 0 || allStudentInactive.length > 0) && (
              <VStack gap={4} alignItems="stretch">
                <Heading size="md">Personnas des étudiants</Heading>
                <AgentGrid agents={allStudentActive} {...gridProps} />
                {allStudentInactive.length > 0 && (
                  <AgentGrid agents={allStudentInactive} {...gridProps} />
                )}
              </VStack>
            )}
          </VStack>
        )}

        {/* Student view: public staff agents + own agents */}
        {agents.length > 0 && !user_admin && (
          <VStack gap={8} alignItems="stretch">
            {staffPublicActive.length > 0 && (
              <AgentGrid agents={staffPublicActive} {...gridProps} />
            )}
            {myAgents.length > 0 && (
              <VStack gap={4} alignItems="stretch">
                <Heading size="md">Mes personnages</Heading>
                <AgentGrid agents={myActiveAgents} {...gridProps} />
                {myInactiveAgents.length > 0 && (
                  <AgentGrid agents={myInactiveAgents} {...gridProps} />
                )}
              </VStack>
            )}
          </VStack>
        )}
      </VStack>
    </Container>
  );
}
