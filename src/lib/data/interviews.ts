import { createServiceSupabaseClient } from "@/lib/supabaseServiceClient";
import {
  Interview,
  InterviewUsage,
  validateInterview,
  validateInterviewUsage,
} from "@/lib/schemas";
import { ensureRecordFound, throwIfError } from "./errors";

/**
 * Create a new interview record.
 */
export async function createInterview(): Promise<Interview> {
  const supabase = createServiceSupabaseClient();

  const { data, error } = await supabase
    .from("interviews")
    .insert({
      status: "in_progress",
      started_at: new Date().toISOString(),
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

  const { data, error } = await supabase
    .from("interviews")
    .select(
      `
        *,
        interview_usage(total_input_tokens, total_output_tokens),
        user_interview_session!inner(
          user_id,
          sessions(
            messages(content, role, created_at)
          )
        )
      `
    )
    .eq("user_interview_session.user_id", userId)
    .order("updated_at", { ascending: false });

  throwIfError(error, "Failed to load user interviews");

  return (data || []).map((raw) => {
    const interview = validateInterview(raw);
    const usage = (raw as any).interview_usage;
    const userInterviewSession = (raw as any).user_interview_session || [];

    const allMessages: Array<{ content: string; role: string; created_at: string }> = [];
    userInterviewSession.forEach((uis: any) => {
      if (uis.sessions?.messages) {
        allMessages.push(...uis.sessions.messages);
      }
    });

    allMessages.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return {
      ...interview,
      interview_usage: usage,
      messages: allMessages,
    };
  });
}
