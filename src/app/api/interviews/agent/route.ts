import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabaseServiceClient";

/**
 * GET /api/interviews/agent?interviewId=...
 * Returns agent info for a given interview id.
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
    const { data, error } = await supabase
      .from("interviews")
      .select("agent_id, agents(agent_name, description)")
      .eq("id", interviewId)
      .single();

    if (error || !data) {
      const message = error?.message ?? "Failed to load interview agent";
      console.error("[/api/interviews/agent GET] Error:", message);
      return NextResponse.json({ error: message }, { status: 404 });
    }

    const agentData = (data as { agents?: { agent_name?: string; description?: string | null } })?.agents;
    if (!agentData?.agent_name) {
      return NextResponse.json(
        { error: "Agent information missing from interview" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        agent: {
          agent_name: agentData.agent_name,
          description: agentData.description ?? null,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[/api/interviews/agent GET] Error:", message);
    return NextResponse.json(
      { error: `Failed to load interview agent: ${message}` },
      { status: 500 }
    );
  }
}
