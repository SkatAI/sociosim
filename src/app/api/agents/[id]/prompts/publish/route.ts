import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabaseServiceClient";
import { getAuthenticatedUser } from "@/lib/supabaseAuthServer";
import { canEditPrompt } from "@/lib/agentPolicy";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: agentId } = await params;
    if (!agentId) {
      return NextResponse.json({ error: "Missing agent id" }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const promptId = body?.promptId;
    if (!promptId) {
      return NextResponse.json({ error: "Missing prompt id" }, { status: 400 });
    }

    const supabase = createServiceSupabaseClient();

    // Check permission
    const { data: userRecord, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (userError) {
      const message = userError.message ?? "Failed to load user role";
      console.error("[/api/agents/:id/prompts/publish POST] Role error:", message);
      return NextResponse.json({ error: message }, { status: 500 });
    }

    const { data: agentData, error: agentError } = await supabase
      .from("agents")
      .select("created_by")
      .eq("id", agentId)
      .maybeSingle();

    if (agentError || !agentData) {
      const message = agentError?.message ?? "Agent not found";
      console.error("[/api/agents/:id/prompts/publish POST] Agent error:", message);
      return NextResponse.json({ error: message }, { status: 404 });
    }

    if (!canEditPrompt(userRecord?.role, user.id, agentData.created_by)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error: clearError } = await supabase
      .from("agent_prompts")
      .update({ published: false })
      .eq("agent_id", agentId);

    if (clearError) {
      const message = clearError.message ?? "Failed to unpublish prompts";
      console.error("[/api/agents/:id/prompts/publish POST] Error:", message);
      return NextResponse.json({ error: message }, { status: 500 });
    }

    const { error: publishError } = await supabase
      .from("agent_prompts")
      .update({ published: true })
      .eq("id", promptId);

    if (publishError) {
      const message = publishError.message ?? "Failed to publish prompt";
      console.error("[/api/agents/:id/prompts/publish POST] Error:", message);
      return NextResponse.json({ error: message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[/api/agents/:id/prompts/publish POST] Error:", message);
    return NextResponse.json(
      { error: `Failed to publish prompt: ${message}` },
      { status: 500 }
    );
  }
}
