import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabaseServiceClient";

/**
 * GET /api/interviews/summary?interviewId=...
 * Returns the agent name, interview start date, and user who started the interview.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const interviewId = searchParams.get("interviewId");

    if (!interviewId) {
      return NextResponse.json(
        { error: "Missing 'interviewId' query parameter" },
        { status: 400 }
      );
    }

    const supabase = createServiceSupabaseClient();
    const { data: interview, error: interviewError } = await supabase
      .from("interviews")
      .select("id, started_at, created_at, agent_id, agents(agent_name), interview_usage(total_input_tokens, total_output_tokens)")
      .eq("id", interviewId)
      .single();

    if (interviewError || !interview) {
      const message = interviewError?.message ?? "Interview not found";
      console.error("[/api/interviews/summary GET] Interview error:", message);
      return NextResponse.json({ error: message }, { status: 404 });
    }

    const agent = (interview as { agents?: { agent_name?: string } }).agents;
    if (!agent?.agent_name) {
      return NextResponse.json(
        { error: "Agent information missing from interview" },
        { status: 404 }
      );
    }

    const { data: userLink, error: userLinkError } = await supabase
      .from("user_interview_session")
      .select("user_id, users(id, name, email), created_at")
      .eq("interview_id", interviewId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (userLinkError) {
      const message = userLinkError.message ?? "Failed to load interview user";
      console.error("[/api/interviews/summary GET] User error:", message);
      return NextResponse.json({ error: message }, { status: 500 });
    }

    const linkedUser = Array.isArray(userLink?.users) ? userLink?.users[0] : userLink?.users;
    const userName = linkedUser?.name ?? "";
    const userEmail = linkedUser?.email ?? "";
    const fallbackUserName = userName || (userEmail ? userEmail.split("@")[0] : "Utilisateur");
    const startedAt = interview.started_at ?? interview.created_at;
    const usageEntry = Array.isArray(interview.interview_usage)
      ? interview.interview_usage[0]
      : null;
    const totalInputTokens = usageEntry?.total_input_tokens ?? 0;
    const totalOutputTokens = usageEntry?.total_output_tokens ?? 0;

    return NextResponse.json(
      {
        agent: {
          agent_id: interview.agent_id,
          agent_name: agent.agent_name,
        },
        user: {
          id: linkedUser?.id ?? userLink?.user_id ?? null,
          name: fallbackUserName,
        },
        interview: {
          started_at: startedAt,
        },
        usage: {
          total_input_tokens: totalInputTokens,
          total_output_tokens: totalOutputTokens,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[/api/interviews/summary GET] Error:", message);
    return NextResponse.json(
      { error: `Failed to load interview summary: ${message}` },
      { status: 500 }
    );
  }
}
