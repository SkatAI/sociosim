import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabaseServiceClient";

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
      .select("id, agent_name")
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
    const { id: agentId } = await params;
    if (!agentId) {
      return NextResponse.json({ error: "Missing agent id" }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const systemPrompt = body?.system_prompt?.trim();
    const editedBy = body?.edited_by;

    if (!systemPrompt || !editedBy) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createServiceSupabaseClient();

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
      edited_by: editedBy,
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
