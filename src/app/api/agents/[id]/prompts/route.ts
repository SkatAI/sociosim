import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabaseServiceClient";
import { getAuthenticatedUser } from "@/lib/supabaseAuthServer";
import { canEditPrompt } from "@/lib/agentPolicy";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: agentId } = await params;
    if (!agentId) {
      return NextResponse.json({ error: "Missing agent id" }, { status: 400 });
    }

    const supabase = createServiceSupabaseClient();

    const { data: agentData, error: agentError } = await supabase
      .from("agents")
      .select("id, agent_name, description, created_by")
      .eq("id", agentId)
      .single();

    if (agentError || !agentData) {
      const message = agentError?.message ?? "Failed to load agent";
      console.error("[/api/agents/:id/prompts GET] Error:", message);
      return NextResponse.json({ error: message }, { status: 404 });
    }

    const { data: promptData, error: promptError } = await supabase
      .from("agent_prompts")
      .select("id, system_prompt, version, last_edited, published, users(name)")
      .eq("agent_id", agentId)
      .order("last_edited", { ascending: false });

    if (promptError) {
      const message = promptError.message ?? "Failed to load prompts";
      console.error("[/api/agents/:id/prompts GET] Error:", message);
      return NextResponse.json({ error: message }, { status: 500 });
    }

    return NextResponse.json(
      { agent: agentData, prompts: promptData || [] },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[/api/agents/:id/prompts GET] Error:", message);
    return NextResponse.json(
      { error: `Failed to load prompts: ${message}` },
      { status: 500 }
    );
  }
}

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
    const systemPrompt = body?.system_prompt?.trim();

    if (!systemPrompt) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createServiceSupabaseClient();

    // Check permission: admin/teacher can edit any agent, others only their own
    const { data: userRecord, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (userError) {
      const message = userError.message ?? "Failed to load user role";
      console.error("[/api/agents/:id/prompts POST] Role error:", message);
      return NextResponse.json({ error: message }, { status: 500 });
    }

    const { data: agentData, error: agentError } = await supabase
      .from("agents")
      .select("created_by")
      .eq("id", agentId)
      .maybeSingle();

    if (agentError || !agentData) {
      const message = agentError?.message ?? "Agent not found";
      console.error("[/api/agents/:id/prompts POST] Agent error:", message);
      return NextResponse.json({ error: message }, { status: 404 });
    }

    if (!canEditPrompt(userRecord?.role, user.id, agentData.created_by)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: latestPrompt, error: latestError } = await supabase
      .from("agent_prompts")
      .select("version")
      .eq("agent_id", agentId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestError) {
      const message = latestError.message ?? "Failed to load latest version";
      console.error("[/api/agents/:id/prompts POST] Error:", message);
      return NextResponse.json({ error: message }, { status: 500 });
    }

    const nextVersion = (latestPrompt?.version ?? 0) + 1;
    const { error: insertError } = await supabase.from("agent_prompts").insert({
      agent_id: agentId,
      system_prompt: systemPrompt,
      edited_by: user.id,
      version: nextVersion,
      published: false,
    });

    if (insertError) {
      const message = insertError.message ?? "Failed to save prompt";
      console.error("[/api/agents/:id/prompts POST] Error:", message);
      return NextResponse.json({ error: message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[/api/agents/:id/prompts POST] Error:", message);
    return NextResponse.json(
      { error: `Failed to save prompt: ${message}` },
      { status: 500 }
    );
  }
}
