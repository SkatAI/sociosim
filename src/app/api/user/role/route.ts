import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabaseServiceClient";

/**
 * GET /api/user/role?userId=...
 * Returns the role for a given user id.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "Missing 'userId' query parameter" },
        { status: 400 }
      );
    }

    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("[/api/user/role GET] Error:", error.message);
      return NextResponse.json(
        { error: `Failed to load role: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ role: data?.role ?? null }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[/api/user/role GET] Error:", message);

    return NextResponse.json(
      { error: `Failed to load role: ${message}` },
      { status: 500 }
    );
  }
}
