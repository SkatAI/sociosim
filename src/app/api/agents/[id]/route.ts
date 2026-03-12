import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabaseServiceClient";
import { getAuthenticatedUser } from "@/lib/supabaseAuthServer";
import { canEditPrompt } from "@/lib/agentPolicy";

export async function PATCH(
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
    const agentName = body?.agent_name?.trim();
    const description = body?.description?.trim();

    if (!agentName || !description) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
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
      console.error("[/api/agents/:id PATCH] Role error:", message);
      return NextResponse.json({ error: message }, { status: 500 });
    }

    const { data: agentRecord, error: agentLookupError } = await supabase
      .from("agents")
      .select("created_by")
      .eq("id", agentId)
      .maybeSingle();

    if (agentLookupError || !agentRecord) {
      const message = agentLookupError?.message ?? "Agent not found";
      console.error("[/api/agents/:id PATCH] Agent error:", message);
      return NextResponse.json({ error: message }, { status: 404 });
    }

    if (!canEditPrompt(userRecord?.role, user.id, agentRecord.created_by)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabase
      .from("agents")
      .update({ agent_name: agentName, description })
      .eq("id", agentId);

    if (error) {
      const message = error.message ?? "Failed to update agent";
      console.error("[/api/agents/:id PATCH] Error:", message);
      return NextResponse.json({ error: message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[/api/agents/:id PATCH] Error:", message);
    return NextResponse.json(
      { error: `Failed to update agent: ${message}` },
      { status: 500 }
    );
  }
}
