import { createServiceSupabaseClient } from "./supabaseServiceClient";
import {
  MessageInsert,
  validateMessages,
  validateSession,
  validateInterview,
  validateInterviewUsage,
} from "./schemas";

/**
 * Database operations for interviews, sessions, and messages
 * Works with the many-to-many schema using user_interview_session junction table
 */

interface TokenUsage {
  input: number;
  output: number;
}

/**
 * Create a new interview record
 */
export async function createInterview() {
  const supabase = createServiceSupabaseClient();

  console.log("[interviewDatabase] Creating interview...");

  const { data, error } = await supabase
    .from("interviews")
    .insert({
      status: "in_progress",
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("[interviewDatabase] Error creating interview:", error);
    throw new Error(`Failed to create interview: ${error.message}`);
  }

  const interview = validateInterview(data);
  console.log("[interviewDatabase] Interview created:", { id: interview.id });
  return interview;
}

/**
 * Create a new session record
 */
export async function createSession(adkSessionId: string) {
  const supabase = createServiceSupabaseClient();

  console.log("[interviewDatabase] Creating session...", { adkSessionId });

  const { data, error } = await supabase
    .from("sessions")
    .insert({
      adk_session_id: adkSessionId,
      status: "active",
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("[interviewDatabase] Error creating session:", error);
    throw new Error(`Failed to create session: ${error.message}`);
  }

  const session = validateSession(data);
  console.log("[interviewDatabase] Session created:", { id: session.id });
  return session;
}

/**
 * Link user, interview, and session in the junction table
 */
export async function linkUserInterviewSession(userId: string, interviewId: string, sessionId: string) {
  const supabase = createServiceSupabaseClient();

  console.log("[interviewDatabase] Linking user-interview-session...", { userId, interviewId, sessionId });

  const { data, error } = await supabase
    .from("user_interview_session")
    .insert({
      user_id: userId,
      interview_id: interviewId,
      session_id: sessionId,
    })
    .select()
    .single();

  if (error) {
    console.error("[interviewDatabase] Error linking user-interview-session:", error);
    throw new Error(`Failed to link user-interview-session: ${error.message}`);
  }

  console.log("[interviewDatabase] User-interview-session linked");
  return data;
}

/**
 * Store a single message in the database
 */
export async function storeMessage(
  sessionId: string,
  role: "user" | "assistant",
  content: string,
  tokens?: TokenUsage
) {
  const supabase = createServiceSupabaseClient();

  console.log(`[interviewDatabase] Storing ${role} message...`, {
    sessionId,
    contentLength: content.length,
    tokens,
  });

  const insertData: MessageInsert = {
    session_id: sessionId,
    role,
    content,
    input_tokens: tokens?.input || null,
    output_tokens: tokens?.output || null,
  };

  const { error } = await supabase.from("messages").insert(insertData);

  if (error) {
    console.error(`[interviewDatabase] Error storing ${role} message:`, error);
    throw new Error(`Failed to store ${role} message: ${error.message}`);
  }

  console.log(`[interviewDatabase] ${role} message stored successfully`);
}

/**
 * Update interview usage tokens (create or upsert)
 */
export async function updateInterviewUsage(
  interviewId: string,
  inputTokens: number,
  outputTokens: number
) {
  const supabase = createServiceSupabaseClient();

  // Try to get existing usage
  const { data: existing, error: fetchError } = await supabase
    .from("interview_usage")
    .select("*")
    .eq("interview_id", interviewId)
    .single();

  if (fetchError && fetchError.code !== "PGRST116") {
    // PGRST116 = "no rows found"
    throw new Error(`Failed to fetch interview usage: ${fetchError.message}`);
  }

  if (existing) {
    // Update existing record
    const { error: updateError } = await supabase
      .from("interview_usage")
      .update({
        total_input_tokens: existing.total_input_tokens + inputTokens,
        total_output_tokens: existing.total_output_tokens + outputTokens,
      })
      .eq("interview_id", interviewId);

    if (updateError) {
      throw new Error(`Failed to update interview usage: ${updateError.message}`);
    }
  } else {
    // Create new record
    const { error: insertError } = await supabase
      .from("interview_usage")
      .insert({
        interview_id: interviewId,
        total_input_tokens: inputTokens,
        total_output_tokens: outputTokens,
        updated_at: new Date().toISOString(),
      });

    if (insertError) {
      throw new Error(`Failed to create interview usage: ${insertError.message}`);
    }
  }
}

/**
 * Update session status (mark as ended/abandoned)
 */
export async function updateSessionStatus(sessionId: string, status: "active" | "ended" | "abandoned" | "error") {
  const supabase = createServiceSupabaseClient();

  console.log("[interviewDatabase] Updating session status...", { sessionId, status });

  const updateData: Record<string, unknown> = { status };

  if (status === "ended") {
    updateData.ended_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("sessions")
    .update(updateData)
    .eq("id", sessionId);

  if (error) {
    console.error("[interviewDatabase] Error updating session status:", error);
    throw new Error(`Failed to update session status: ${error.message}`);
  }

  console.log("[interviewDatabase] Session status updated successfully");
}

/**
 * Load all messages for a session
 */
export async function getSessionMessages(sessionId: string) {
  const supabase = createServiceSupabaseClient();

  console.log("[interviewDatabase] Loading messages for session...", { sessionId });

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[interviewDatabase] Error loading messages:", error);
    throw new Error(`Failed to load messages: ${error.message}`);
  }

  const messages = validateMessages(data || []);
  console.log("[interviewDatabase] Loaded", messages.length, "messages");
  return messages;
}

/**
 * Load all messages for an interview (across all sessions)
 */
export async function getInterviewMessages(interviewId: string) {
  const supabase = createServiceSupabaseClient();

  console.log("[interviewDatabase] Loading all messages for interview...", { interviewId });

  // First get all session IDs for this interview
  const { data: sessionData, error: sessionError } = await supabase
    .from("user_interview_session")
    .select("session_id")
    .eq("interview_id", interviewId);

  if (sessionError) {
    console.error("[interviewDatabase] Error loading sessions:", sessionError);
    throw new Error(`Failed to load sessions: ${sessionError.message}`);
  }

  const sessionIds = (sessionData || []).map((row) => row.session_id);

  if (sessionIds.length === 0) {
    console.log("[interviewDatabase] No sessions found for interview");
    return [];
  }

  // Then get all messages for these sessions
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .in("session_id", sessionIds)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[interviewDatabase] Error loading interview messages:", error);
    throw new Error(`Failed to load messages: ${error.message}`);
  }

  const messages = validateMessages(data || []);
  console.log("[interviewDatabase] Loaded", messages.length, "messages for interview");
  return messages;
}

/**
 * Get interview with usage data
 */
export async function getInterviewWithUsage(interviewId: string) {
  const supabase = createServiceSupabaseClient();

  console.log("[interviewDatabase] Loading interview with usage...", { interviewId });

  const { data, error } = await supabase
    .from("interviews")
    .select(
      `
      *,
      interview_usage(*)
    `
    )
    .eq("id", interviewId)
    .single();

  if (error) {
    console.error("[interviewDatabase] Error loading interview:", error);
    throw new Error(`Failed to load interview: ${error.message}`);
  }

  const interview = validateInterview(data);
  if (data.interview_usage?.[0]) {
    const usage = validateInterviewUsage(data.interview_usage[0]);
    return { interview, usage };
  }

  return { interview, usage: null };
}
