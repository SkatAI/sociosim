import { NextRequest, NextResponse } from "next/server";
import { getAgentsWithPromptStatus, getPublishedAgents } from "@/lib/data/agents";
import { createServiceSupabaseClient } from "@/lib/supabaseServiceClient";
import { getAuthenticatedUser } from "@/lib/supabaseAuthServer";

const isAdminLike = (role?: string | null) => role === "admin" || role === "teacher";

/**
 * GET /api/agents?published=true&template=false
 * Returns all agents, optionally filtered to published-only and/or template filtering.
 */
export async function GET(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const publishedOnly = searchParams.get("published") === "true";
    const templateParam = searchParams.get("template");
    const templateFilter =
      templateParam === "true" ? "only" : templateParam === "false" ? "exclude" : undefined;

    const supabase = createServiceSupabaseClient();
    const { data: userRecord, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (userError) {
      const message = userError.message ?? "Failed to load user role";
      console.error("[/api/agents GET] Role error:", message);
      return NextResponse.json({ error: message }, { status: 500 });
    }

    const showAllAgents = isAdminLike(userRecord?.role);

    const agents = publishedOnly
      ? (await getPublishedAgents(templateFilter)).map((agent) => ({
          ...agent,
          has_published_prompt: true,
        }))
      : await getAgentsWithPromptStatus(templateFilter);

    const visibleAgents = showAllAgents
      ? agents
      : agents.filter((agent) => agent.is_public || agent.created_by === user.id);

    return NextResponse.json({ success: true, agents: visibleAgents }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[/api/agents GET] Error:", message);

    return NextResponse.json(
      { error: `Failed to load agents: ${message}` },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agents
 * Creates an agent and its initial prompt.
 */
export async function POST(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const agentName = body?.agent_name?.trim();
    const description = body?.description?.trim();
    const systemPrompt = body?.system_prompt?.trim();

    if (!agentName || !description || !systemPrompt) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createServiceSupabaseClient();
    const { data: agentData, error: agentError } = await supabase
      .from("agents")
      .insert({
        agent_name: agentName,
        description,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (agentError || !agentData?.id) {
      const message = agentError?.message ?? "Failed to create agent";
      console.error("[/api/agents POST] Error:", message);
      return NextResponse.json(
        { error: message },
        { status: 500 }
      );
    }

    const { error: promptError } = await supabase
      .from("agent_prompts")
      .insert({
        agent_id: agentData.id,
        system_prompt: systemPrompt,
        edited_by: user.id,
        version: 1,
        published: false,
      });

    if (promptError) {
      const message = promptError.message || "Failed to create agent prompt";
      console.error("[/api/agents POST] Error:", message);
      return NextResponse.json(
        { error: message },
        { status: 500 }
      );
    }

    return NextResponse.json({ id: agentData.id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[/api/agents POST] Error:", message);
    return NextResponse.json(
      { error: `Failed to create agent: ${message}` },
      { status: 500 }
    );
  }
}
