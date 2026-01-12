import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabaseServiceClient";

/**
 * PATCH /api/agents/:id/active
 * Toggle agent active status.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await request.json().catch(() => null)) as { active?: boolean } | null;

    if (!id) {
      return NextResponse.json({ error: "Missing agent id." }, { status: 400 });
    }

    if (typeof body?.active !== "boolean") {
      return NextResponse.json({ error: "Missing 'active' boolean." }, { status: 400 });
    }

    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from("agents")
      .update({ active: body.active })
      .eq("id", id)
      .select("id, active")
      .single();

    if (error || !data) {
      const message = error?.message ?? "Failed to update agent";
      console.error("[/api/agents/:id/active PATCH] Error:", message);
      return NextResponse.json({ error: message }, { status: 500 });
    }

    return NextResponse.json({ success: true, agent: data }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[/api/agents/:id/active PATCH] Error:", message);
    return NextResponse.json(
      { error: `Failed to update agent: ${message}` },
      { status: 500 }
    );
  }
}
