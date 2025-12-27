import { createServiceSupabaseClient } from "@/lib/supabaseServiceClient";
import { throwIfError, ensureRecordFound } from "./errors";

/**
 * Agent lookup and retrieval functions.
 * Maps between agent names (oriane, theo, jade) and their database UUIDs.
 */

/**
 * Look up agent UUID by name (oriane, theo, jade)
 */
export async function getAgentIdByName(name: string): Promise<string> {
  const supabase = createServiceSupabaseClient();

  const { data, error } = await supabase
    .from("agents")
    .select("id")
    .eq("agent_name", name)
    .single();

  throwIfError(error, `Failed to load agent with name: ${name}`);

  return ensureRecordFound(data, `Agent not found: ${name}`).id;
}

/**
 * Get agent name by UUID
 */
export async function getAgentNameById(agentId: string): Promise<string> {
  const supabase = createServiceSupabaseClient();

  const { data, error } = await supabase
    .from("agents")
    .select("agent_name")
    .eq("id", agentId)
    .single();

  console.log("-----------------------");
  console.log("Data:", data);
  console.log("Error:", error);
  console.log("-----------------------");


  throwIfError(error, `Failed to load agent with id: ${agentId}`);

  return ensureRecordFound(data, `Agent not found: ${agentId}`).agent_name;
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
