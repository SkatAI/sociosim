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
  active: boolean;
  is_template: boolean;
  is_public: boolean;
  created_by: string | null;
  creator_name: string | null;
  creator_role: string | null;
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
    .select("id, agent_name, description, active, is_template, is_public, created_by, users!agents_created_by_fkey(name, role)")
    .order("agent_name");

  throwIfError(error, "Failed to load agents");

  const agents = (data || []) as Array<
    Omit<AgentRecord, "creator_name" | "creator_role"> & {
      users?: { name?: string; role?: string } | null;
    }
  >;

  return agents.map((agent) => ({
    id: agent.id,
    agent_name: agent.agent_name,
    description: agent.description,
    active: agent.active,
    is_template: agent.is_template,
    is_public: agent.is_public,
    created_by: agent.created_by,
    creator_name: agent.users?.name ?? null,
    creator_role: agent.users?.role ?? null,
  }));
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
    .select(
      "id, agent_name, description, active, is_template, is_public, created_by, agent_prompts(published), users!agents_created_by_fkey(name, role)"
    )
    .order("agent_name");

  if (templateFilter === "only") {
    query = query.eq("is_template", true);
  } else if (templateFilter === "exclude") {
    query = query.eq("is_template", false);
  }

  const { data, error } = await query;

  throwIfError(error, "Failed to load agents with prompt status");

  const agents = (data || []) as Array<
    Omit<AgentRecord, "creator_name" | "creator_role"> & {
      agent_prompts?: Array<{ published?: boolean | null }> | null;
      users?: { name?: string; role?: string } | null;
    }
  >;

  return agents.map((agent) => ({
    id: agent.id,
    agent_name: agent.agent_name,
    description: agent.description,
    active: agent.active,
    is_template: agent.is_template,
    is_public: agent.is_public,
    created_by: agent.created_by,
    creator_name: agent.users?.name ?? null,
    creator_role: agent.users?.role ?? null,
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
    .select(
      "id, agent_name, description, active, is_template, is_public, created_by, agent_prompts!inner(published), users!agents_created_by_fkey(name, role)"
    )
    .eq("agent_prompts.published", true)
    .order("agent_name");

  if (templateFilter === "only") {
    query = query.eq("is_template", true);
  } else if (templateFilter === "exclude") {
    query = query.eq("is_template", false);
  }

  const { data, error } = await query;

  throwIfError(error, "Failed to load published agents");

  const agents = (data || []) as Array<
    Omit<AgentRecord, "creator_name" | "creator_role"> & {
      users?: { name?: string; role?: string } | null;
    }
  >;

  return agents.map((agent) => ({
    id: agent.id,
    agent_name: agent.agent_name,
    description: agent.description,
    active: agent.active,
    is_template: agent.is_template,
    is_public: agent.is_public,
    created_by: agent.created_by,
    creator_name: agent.users?.name ?? null,
    creator_role: agent.users?.role ?? null,
  }));
}

/**
 * Look up agent by name (oriane, theo, jade)
 */
export async function getAgentByName(name: string): Promise<AgentRecord | null> {
  const supabase = createServiceSupabaseClient();

  const { data, error } = await supabase
    .from("agents")
    .select("id, agent_name, description, active, is_template, is_public, created_by, users!agents_created_by_fkey(name, role)")
    .eq("agent_name", name)
    .maybeSingle();

  throwIfError(error, `Failed to load agent with name: ${name}`);

  if (!data) return null;

  const row = data as typeof data & { users?: { name?: string; role?: string } | null };
  return {
    id: row.id,
    agent_name: row.agent_name,
    description: row.description,
    active: row.active,
    is_template: row.is_template,
    is_public: row.is_public,
    created_by: row.created_by,
    creator_name: row.users?.name ?? null,
    creator_role: row.users?.role ?? null,
  };
}

/**
 * Look up agent by id (UUID)
 */
export async function getAgentById(agentId: string): Promise<AgentRecord | null> {
  const supabase = createServiceSupabaseClient();

  const { data, error } = await supabase
    .from("agents")
    .select("id, agent_name, description, active, is_template, is_public, created_by, users!agents_created_by_fkey(name, role)")
    .eq("id", agentId)
    .maybeSingle();

  throwIfError(error, `Failed to load agent with id: ${agentId}`);

  if (!data) return null;

  const row = data as typeof data & { users?: { name?: string; role?: string } | null };
  return {
    id: row.id,
    agent_name: row.agent_name,
    description: row.description,
    active: row.active,
    is_template: row.is_template,
    is_public: row.is_public,
    created_by: row.created_by,
    creator_name: row.users?.name ?? null,
    creator_role: row.users?.role ?? null,
  };
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
