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

export interface AgentRecordWithPromptStatus extends AgentRecord {
  has_published_prompt: boolean;
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
 * Fetch all agents with published prompt status.
 */
export async function getAgentsWithPromptStatus(
  templateFilter?: "exclude" | "only"
): Promise<AgentRecordWithPromptStatus[]> {
  const supabase = createServiceSupabaseClient();

  let query = supabase
    .from("agents")
    .select("id, agent_name, description, agent_prompts(published)")
    .order("agent_name");

  if (templateFilter === "only") {
    query = query.eq("is_template", true);
  } else if (templateFilter === "exclude") {
    query = query.eq("is_template", false);
  }

  const { data, error } = await query;

  throwIfError(error, "Failed to load agents with prompt status");

  const agents = (data || []) as Array<
    AgentRecord & { agent_prompts?: Array<{ published?: boolean | null }> | null }
  >;

  return agents.map((agent) => ({
    id: agent.id,
    agent_name: agent.agent_name,
    description: agent.description,
    has_published_prompt: (agent.agent_prompts || []).some((prompt) => prompt.published),
  }));
}

/**
 * Fetch published agents (with at least one published prompt).
 */
export async function getPublishedAgents(
  templateFilter?: "exclude" | "only"
): Promise<AgentRecord[]> {
  const supabase = createServiceSupabaseClient();

  let query = supabase
    .from("agents")
    .select("id, agent_name, description, agent_prompts!inner(published)")
    .eq("agent_prompts.published", true)
    .order("agent_name");

  if (templateFilter === "only") {
    query = query.eq("is_template", true);
  } else if (templateFilter === "exclude") {
    query = query.eq("is_template", false);
  }

  const { data, error } = await query;

  throwIfError(error, "Failed to load published agents");

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
