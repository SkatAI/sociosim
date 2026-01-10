import { createServiceSupabaseClient } from "@/lib/supabaseServiceClient";
import {
  Interview,
  InterviewUsage,
  validateInterview,
  validateInterviewUsage,
} from "@/lib/schemas";
import { ensureRecordFound, throwIfError } from "./errors";

/**
 * Create a new interview record with an agent.
 */
export async function createInterview(agentId: string): Promise<Interview> {
  const supabase = createServiceSupabaseClient();

  const { data, error } = await supabase
    .from("interviews")
    .insert({
      status: "in_progress",
      started_at: new Date().toISOString(),
      agent_id: agentId,
    })
    .select()
    .single();

  throwIfError(error, "Failed to create interview");

  return validateInterview(ensureRecordFound(data, "Failed to create interview"));
}

/**
 * Fetch a single interview by id.
 */
export async function getInterviewById(id: string): Promise<Interview | null> {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase.from("interviews").select("*").eq("id", id).single();

  if (error && error.code !== "PGRST116") {
    throwIfError(error, "Failed to load interview");
  }

  if (!data) return null;
  return validateInterview(data);
}

/**
 * Get interview with usage data attached.
 */
export async function getInterviewWithUsage(
  interviewId: string
): Promise<{ interview: Interview; usage: InterviewUsage | null }> {
  const supabase = createServiceSupabaseClient();

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

  throwIfError(error, "Failed to load interview");

  const interview = validateInterview(ensureRecordFound(data, "Failed to load interview"));

  if (data.interview_usage?.[0]) {
    const usage = validateInterviewUsage(data.interview_usage[0]);
    return { interview, usage };
  }

  return { interview, usage: null };
}

/**
 * Fetch all interviews for a user with usage and messages summary.
 * This is used by the dashboard to avoid client-side SQL.
 */
export async function getUserInterviewsWithMessages(userId: string) {
  const supabase = createServiceSupabaseClient();

  console.log(
    "[getUserInterviewsWithMessages] Starting query for userId:",
    userId
  );

  // Step 1: First, get the user's interview IDs via user_interview_session
  const { data: userSessions, error: sessionError } = await supabase
    .from("user_interview_session")
    .select("interview_id, session_id, created_at")
    .eq("user_id", userId);

  console.log("-----------------------");
  console.log("Data:", userSessions);
  console.log("Error:", sessionError);
  console.log("-----------------------");

  console.log(
    "[getUserInterviewsWithMessages] Query user_interview_session - Found sessions:",
    userSessions?.length || 0
  );

  if (userSessions && userSessions.length > 0) {
    console.log(
      "[getUserInterviewsWithMessages] Session data:",
      JSON.stringify(userSessions, null, 2)
    );
  }

  throwIfError(sessionError, "Failed to load user interview sessions");

  // If no interviews, return empty array
  if (!userSessions || userSessions.length === 0) {
    return [];
  }

  const interviewIds = userSessions.map((us) => us.interview_id);
  const sessionIds = userSessions.map((us) => us.session_id);

  const sessionsByInterview = new Map<string, typeof userSessions>();
  userSessions.forEach((session) => {
    if (!sessionsByInterview.has(session.interview_id)) {
      sessionsByInterview.set(session.interview_id, []);
    }
    sessionsByInterview.get(session.interview_id)!.push(session);
  });

  // Step 2: Get full interview data with agent and usage
  const { data: interviews, error: interviewError } = await supabase
    .from("interviews")
    .select(
      `
      *,
      agents(agent_name),
      interview_usage(total_input_tokens, total_output_tokens)
    `
    )
    .in("id", interviewIds)
    .order("updated_at", { ascending: false });

  throwIfError(interviewError, "Failed to load interviews");

  console.log(
    "[getUserInterviewsWithMessages] Query interviews - Found interviews:",
    interviews?.length || 0
  );

  // Step 3: Get all messages for these sessions
  const { data: messages, error: messageError } = await supabase
    .from("messages")
    .select("session_id, content, role, created_at")
    .in("session_id", sessionIds);

  console.log(
    "[getUserInterviewsWithMessages] Query messages - Found messages:",
    messages?.length || 0
  );

  throwIfError(messageError, "Failed to load messages");

  // Step 4: Build a map of messages by session
  const messagesBySession = new Map<string, typeof messages>();
  (messages || []).forEach((msg) => {
    if (!messagesBySession.has(msg.session_id)) {
      messagesBySession.set(msg.session_id, []);
    }
    messagesBySession.get(msg.session_id)!.push(msg);
  });

  // Step 5: Combine data
  const result = (interviews || []).map((interview) => {
    const sessionsForInterview = sessionsByInterview.get(interview.id) || [];
    const msgs = sessionsForInterview.flatMap(
      (session) => messagesBySession.get(session.session_id) || []
    );

    // Sort messages by date descending
    msgs.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return {
      ...interview,
      interview_usage: interview.interview_usage,
      agents: interview.agents,
      messages: msgs,
    };
  });

  console.log(
    "[getUserInterviewsWithMessages] Final result: returning",
    result.length,
    "interviews with complete data"
  );

  return result;
}
