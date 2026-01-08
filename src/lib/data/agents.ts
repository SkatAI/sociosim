import { createServiceSupabaseClient } from "@/lib/supabaseServiceClient";
import { throwIfError, ensureRecordFound } from "./errors";

/**
 * Agent lookup and retrieval functions.
 * Maps between agent names (oriane, theo, jade) and their database UUIDs.
 */

export interface AgentRecord {
  id: string;
  agent_name: string;
  description: string | null;
}

/**
 * Fetch all agents with display data.
 */
export async function getAgents(): Promise<AgentRecord[]> {
  const supabase = createServiceSupabaseClient();

  const { data, error } = await supabase
    .from("agents")
    .select("id, agent_name, description")
    .order("agent_name");

  throwIfError(error, "Failed to load agents");

  return (data || []) as AgentRecord[];
}

/**
 * Look up agent by name (oriane, theo, jade)
 */
export async function getAgentByName(name: string): Promise<AgentRecord | null> {
  const supabase = createServiceSupabaseClient();

  const { data, error } = await supabase
    .from("agents")
    .select("id, agent_name, description")
    .eq("agent_name", name)
    .maybeSingle();

  throwIfError(error, `Failed to load agent with name: ${name}`);

  return data as AgentRecord | null;
}

/**
 * Look up agent by id (UUID)
 */
export async function getAgentById(agentId: string): Promise<AgentRecord | null> {
  const supabase = createServiceSupabaseClient();

  const { data, error } = await supabase
    .from("agents")
    .select("id, agent_name, description")
    .eq("id", agentId)
    .maybeSingle();

  throwIfError(error, `Failed to load agent with id: ${agentId}`);

  return data as AgentRecord | null;
}

/**
 * Look up agent UUID by name (oriane, theo, jade)
 */
export async function getAgentIdByName(name: string): Promise<string> {
  const agent = await getAgentByName(name);

  return ensureRecordFound(agent, `Agent not found: ${name}`).id;
}

/**
 * Get agent name by UUID
 */
export async function getAgentNameById(agentId: string): Promise<string> {
  const agent = await getAgentById(agentId);

  return ensureRecordFound(agent, `Agent not found: ${agentId}`).agent_name;
}

/**
 * Get interview with joined agent data
 */
export async function getInterviewWithAgent(interviewId: string) {
  const supabase = createServiceSupabaseClient();

  const { data, error } = await supabase
    .from("interviews")
    .select(`
      *,
      agents (
        id,
        agent_name,
        description
      )
    `)
    .eq("id", interviewId)
    .single();

  throwIfError(error, `Failed to load interview with agent: ${interviewId}`);

  return ensureRecordFound(data, `Interview not found: ${interviewId}`);
}
