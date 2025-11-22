import { createServiceSupabaseClient } from "@/lib/supabaseServiceClient";
import { MessageInsert, validateMessages } from "@/lib/schemas";
import { throwIfError } from "./errors";
import { getSessionIdsForInterview } from "./sessions";

interface TokenUsage {
  input: number;
  output: number;
}

/**
 * Store a single message for a session.
 */
export async function storeMessage(
  sessionId: string,
  role: "user" | "assistant",
  content: string,
  tokens?: TokenUsage
) {
  const supabase = createServiceSupabaseClient();

  const insertData: MessageInsert = {
    session_id: sessionId,
    role,
    content,
    input_tokens: tokens?.input ?? null,
    output_tokens: tokens?.output ?? null,
  };

  const { error } = await supabase.from("messages").insert(insertData);
  throwIfError(error, `Failed to store ${role} message`);
}

/**
 * Load all messages for a session.
 */
export async function getSessionMessages(sessionId: string) {
  const supabase = createServiceSupabaseClient();

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  throwIfError(error, "Failed to load messages for session");
  return validateMessages(data || []);
}

/**
 * Load all messages for an interview across its sessions.
 * Optionally scopes to a user to prevent cross-account leakage.
 */
export async function getInterviewMessages(interviewId: string, userId?: string) {
  const sessionIds = await getSessionIdsForInterview(interviewId, userId);
  if (sessionIds.length === 0) {
    return [];
  }

  const supabase = createServiceSupabaseClient();

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .in("session_id", sessionIds)
    .order("created_at", { ascending: true });

  throwIfError(error, "Failed to load interview messages");
  return validateMessages(data || []);
}
