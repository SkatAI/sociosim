import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabaseServiceClient";
import { getAuthenticatedUser } from "@/lib/supabaseAuthServer";
import { canToggleActive } from "@/lib/agentPolicy";

/**
 * PATCH /api/agents/:id/active
 * Toggle agent active status. Admin/teacher only.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = (await request.json().catch(() => null)) as { active?: boolean } | null;

    if (!id) {
      return NextResponse.json({ error: "Missing agent id." }, { status: 400 });
    }

    if (typeof body?.active !== "boolean") {
      return NextResponse.json({ error: "Missing 'active' boolean." }, { status: 400 });
    }

    const supabase = createServiceSupabaseClient();

    const { data: userRecord, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (userError) {
      const message = userError.message ?? "Failed to load user role";
      console.error("[/api/agents/:id/active PATCH] Role error:", message);
      return NextResponse.json({ error: message }, { status: 500 });
    }

    if (!canToggleActive(userRecord?.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
