import { createServiceSupabaseClient } from "@/lib/supabaseServiceClient";
import { throwIfError } from "./errors";

/**
 * Update interview usage tokens (create or upsert).
 */
export async function updateInterviewUsage(
  interviewId: string,
  inputTokens: number,
  outputTokens: number
) {
  const supabase = createServiceSupabaseClient();

  const { data: existing, error: fetchError } = await supabase
    .from("interview_usage")
    .select("*")
    .eq("interview_id", interviewId)
    .single();

  if (fetchError && fetchError.code !== "PGRST116") {
    throwIfError(fetchError, "Failed to fetch interview usage");
  }

  if (existing) {
    const { error: updateError } = await supabase
      .from("interview_usage")
      .update({
        total_input_tokens: existing.total_input_tokens + inputTokens,
        total_output_tokens: existing.total_output_tokens + outputTokens,
        updated_at: new Date().toISOString(),
      })
      .eq("interview_id", interviewId);

    throwIfError(updateError, "Failed to update interview usage");
    return;
  }

  const { error: insertError } = await supabase
    .from("interview_usage")
    .insert({
      interview_id: interviewId,
      total_input_tokens: inputTokens,
      total_output_tokens: outputTokens,
      updated_at: new Date().toISOString(),
    });

  throwIfError(insertError, "Failed to create interview usage");
}
