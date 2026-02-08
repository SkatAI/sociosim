import { type Agent } from "@/lib/agents";
import { isAdminLike } from "@/lib/agentPolicy";

export interface AgentGroup {
  key: string;
  label: string;
  isStaff: boolean;
  activeAgents: Agent[];
  inactiveAgents: Agent[];
}

/**
 * Group agents by creator role for admin view:
 * - Staff group (admin/teacher creators) first
 * - Then one group per student, sorted alphabetically (French locale)
 */
export function groupAgentsByCreator(agents: Agent[]): AgentGroup[] {
  const staffAgents: Agent[] = [];
  const studentMap = new Map<string, { name: string; agents: Agent[] }>();

  for (const agent of agents) {
    if (isAdminLike(agent.creator_role)) {
      staffAgents.push(agent);
    } else {
      const creatorId = agent.created_by ?? "unknown";
      const creatorName = agent.creator_name ?? "Inconnu";
      if (!studentMap.has(creatorId)) {
        studentMap.set(creatorId, { name: creatorName, agents: [] });
      }
      studentMap.get(creatorId)!.agents.push(agent);
    }
  }

  const groups: AgentGroup[] = [];

  // Staff group
  if (staffAgents.length > 0) {
    groups.push({
      key: "staff",
      label: "Personnas publiques",
      isStaff: true,
      activeAgents: staffAgents.filter((a) => a.active),
      inactiveAgents: staffAgents.filter((a) => !a.active),
    });
  }

  // Student groups sorted alphabetically
  const studentEntries = Array.from(studentMap.entries()).sort((a, b) =>
    a[1].name.localeCompare(b[1].name, "fr")
  );

  for (const [creatorId, { name, agents: studentAgents }] of studentEntries) {
    groups.push({
      key: creatorId,
      label: name,
      isStaff: false,
      activeAgents: studentAgents.filter((a) => a.active),
      inactiveAgents: studentAgents.filter((a) => !a.active),
    });
  }

  return groups;
}
