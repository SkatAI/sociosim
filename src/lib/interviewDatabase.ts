import { createServiceSupabaseClient } from "./supabaseServiceClient";

interface TokenUsage {
  input: number;
  output: number;
}

/**
 * Store a single message in the database
 */
export async function storeMessage(
  interviewId: string,
  role: "user" | "assistant",
  content: string,
  tokens?: TokenUsage
) {
  const supabase = createServiceSupabaseClient();

  console.log(`[interviewDatabase] Storing ${role} message...`, { interviewId, contentLength: content.length, tokens });

  const { error } = await supabase.from("messages").insert({
    interview_id: interviewId,
    role,
    content,
    input_tokens: tokens?.input || null,
    output_tokens: tokens?.output || null,
  });

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
      });

    if (insertError) {
      throw new Error(`Failed to create interview usage: ${insertError.message}`);
    }
  }
}

/**
 * Update interview status
 */
export async function updateInterviewStatus(
  sessionId: string,
  status: "in_progress" | "standby" | "ended" | "abandoned" | "error"
) {
  const supabase = createServiceSupabaseClient();

  const updateData: Record<string, unknown> = { status };

  if (status === "ended") {
    updateData.completed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("interviews")
    .update(updateData)
    .eq("adk_session_id", sessionId);

  if (error) {
    throw new Error(`Failed to update interview status: ${error.message}`);
  }
}
