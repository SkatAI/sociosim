/**
 * Agent Configuration
 *
 * Defines available agents for interviews and their metadata.
 */

export type AgentName = "oriane" | "theo" | "jade";

export interface Agent {
  id: AgentName;
  name: string;
  description: string;
}

export const AGENTS: Agent[] = [
  {
    id: "oriane",
    name: "Oriane",
    description: "Experte en sociologie urbaine",
  },
  {
    id: "theo",
    name: "Théo",
    description: "Spécialiste des dynamiques familiales",
  },
  {
    id: "jade",
    name: "Jade",
    description: "Sociologue du travail et des organisations",
  },
];

/**
 * Validate if agent name is allowed
 */
export function isValidAgentName(name: unknown): name is AgentName {
  return typeof name === "string" && AGENTS.some((agent) => agent.id === name);
}

/**
 * Get agent by ID
 */
export function getAgentById(id: AgentName): Agent | undefined {
  return AGENTS.find((agent) => agent.id === id);
}
