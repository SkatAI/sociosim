"use client";

import {
  Button,
  Text,
  VStack,
  HStack,
  Card,
} from "@chakra-ui/react";
import { type Agent } from "@/lib/agents";
import NewInterviewButton from "@/app/components/NewInterviewButton";

interface AgentCardProps {
  agent: Agent;
  isCreatingSession: boolean;
  togglingAgentId: string | null;
  hasInteracted: boolean;
  userAdmin: boolean;
  onSelectAgent: (agentId: string) => void;
  onToggleAgent: (agent: Agent) => void;
  onNavigateHistory: (agentId: string) => void;
  onNavigatePrompt: (agentId: string) => void;
}

export function AgentCard({
  agent,
  isCreatingSession,
  togglingAgentId,
  hasInteracted,
  userAdmin,
  onSelectAgent,
  onToggleAgent,
  onNavigateHistory,
  onNavigatePrompt,
}: AgentCardProps) {
  return (
    <Card.Root backgroundColor={agent.active ? undefined : "bg.muted"}>
      <Card.Body display="flex" flexDirection="column" alignItems="stretch" gap={2} py={2} px={4}>
        <VStack gap={2} alignItems="flex-start">
          <HStack width="100%" justifyContent="space-between" alignItems="flex-start">
            <VStack gap={0} alignItems="flex-start">
              <Text fontWeight="semibold" fontSize="md" color={agent.active ? "blue.600" : "fg.subtle"}>
                {agent.agent_name.charAt(0).toUpperCase() + agent.agent_name.slice(1)}
              </Text>
              {agent.creator_name && (
                <Text fontSize="xs" color="fg.subtle">
                  {agent.creator_name}
                </Text>
              )}
            </VStack>
            {agent.active && (
              <NewInterviewButton
                onClick={() => onSelectAgent(agent.id)}
                loading={isCreatingSession}
                disabled={isCreatingSession || agent.has_published_prompt === false}
              />
            )}
          </HStack>
          <Text
            fontSize="sm"
            color="fg.muted"
            textAlign="left"
            lineHeight="1.4"
            whiteSpace="pre-line"
          >
            {(agent.description || "").replace(/\\n/g, "\n")}
          </Text>
        </VStack>
        <HStack gap={3} flexWrap="wrap" justifyContent="flex-start">
          {agent.active && agent.has_published_prompt === false && (
            <Text fontSize="xs" color="fg.muted">
              (N&apos;a pas de prompt publi&eacute;)
            </Text>
          )}
          {agent.active && hasInteracted && (
            <Button
              onClick={() => onNavigateHistory(agent.id)}
              variant="subtle"
              size="xs"
              paddingInline={2}
            >
              Historique
            </Button>
          )}
          <Button
            variant="subtle"
            size="xs"
            paddingInline={2}
            onClick={() => onNavigatePrompt(agent.id)}
            disabled={!agent.active}
          >
            Prompt
          </Button>
          {userAdmin && (
            <Button
              variant={agent.active ? "outline" : "subtle"}
              colorPalette={agent.active ? "red" : undefined}
              size="xs"
              paddingInline={2}
              onClick={() => onToggleAgent(agent)}
              loading={togglingAgentId === agent.id}
              disabled={togglingAgentId === agent.id}
            >
              {agent.active ? "D\u00e9sactiver" : "Activer"}
            </Button>
          )}
        </HStack>
      </Card.Body>
    </Card.Root>
  );
}
