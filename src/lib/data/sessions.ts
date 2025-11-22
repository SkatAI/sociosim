import { createServiceSupabaseClient } from "@/lib/supabaseServiceClient";
import { Session, SessionStatus, SessionStatusSchema, validateSession } from "@/lib/schemas";
import { ensureRecordFound, throwIfError } from "./errors";

/**
 * Create a new session record (linked to an ADK session ID).
 */
export async function createSession(adkSessionId: string): Promise<Session> {
  const supabase = createServiceSupabaseClient();

  const { data, error } = await supabase
    .from("sessions")
    .insert({
      adk_session_id: adkSessionId,
      status: "active",
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  throwIfError(error, "Failed to create session");

  return validateSession(ensureRecordFound(data, "Failed to create session"));
}

/**
 * Link user, interview, and session in the junction table.
 */
export async function linkUserInterviewSession(
  userId: string,
  interviewId: string,
  sessionId: string
) {
  const supabase = createServiceSupabaseClient();

  const { data, error } = await supabase
    .from("user_interview_session")
    .insert({
      user_id: userId,
      interview_id: interviewId,
      session_id: sessionId,
    })
    .select()
    .single();

  throwIfError(error, "Failed to link user, interview, and session");
  return data;
}

/**
 * Update session status (optionally set ended_at when ending).
 */
export async function updateSessionStatus(sessionId: string, status: SessionStatus) {
  const supabase = createServiceSupabaseClient();
  const parsedStatus = SessionStatusSchema.parse(status);

  const updateData: Record<string, unknown> = { status: parsedStatus };
  if (parsedStatus === "ended") {
    updateData.ended_at = new Date().toISOString();
  }

  const { error } = await supabase.from("sessions").update(updateData).eq("id", sessionId);
  throwIfError(error, "Failed to update session status");
}

/**
 * Get all session IDs for a given interview (optionally scoped to a user).
 */
export async function getSessionIdsForInterview(
  interviewId: string,
  userId?: string
): Promise<string[]> {
  const supabase = createServiceSupabaseClient();
  const query = supabase
    .from("user_interview_session")
    .select("session_id")
    .eq("interview_id", interviewId);

  if (userId) {
    query.eq("user_id", userId);
  }

  const { data, error } = await query;
  throwIfError(error, "Failed to load sessions for interview");

  return (data || []).map((row) => row.session_id);
}
