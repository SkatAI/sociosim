import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabaseServiceClient";

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
    const promptId = body?.promptId;
    if (!promptId) {
      return NextResponse.json({ error: "Missing prompt id" }, { status: 400 });
    }

    const supabase = createServiceSupabaseClient();

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
