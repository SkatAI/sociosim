import { NextRequest, NextResponse } from "next/server";
import { interviews } from "@/lib/data";
import { createServiceSupabaseClient } from "@/lib/supabaseServiceClient";

/**
 * GET /api/user/interviews?userId=...
 * Returns the interviews (with usage + messages) for a given user.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    console.log("[/api/user/interviews GET] Received userId:", userId);

    if (!userId) {
      return NextResponse.json(
        { error: "Missing 'userId' query parameter" },
        { status: 400 }
      );
    }

    const supabase = createServiceSupabaseClient();
    const { data: userRecord, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (userError) {
      const message = userError.message ?? "Failed to load user role";
      console.error("[/api/user/interviews GET] User role error:", message);
      return NextResponse.json({ error: message }, { status: 500 });
    }

    const isAdmin = userRecord?.role === "admin";
    console.log(
      "[/api/user/interviews GET] Fetching interviews for:",
      isAdmin ? "admin" : "user",
      userId
    );

    const userInterviews = isAdmin
      ? await interviews.getAllInterviewsWithMessages()
      : await interviews.getUserInterviewsWithMessages(userId);

    console.log(
      "[/api/user/interviews GET] Successfully loaded",
      userInterviews.length,
      "interviews"
    );

    return NextResponse.json(
      { success: true, interviews: userInterviews },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[/api/user/interviews GET] Error:", message);

    return NextResponse.json(
      { error: `Failed to load interviews: ${message}` },
      { status: 500 }
    );
  }
}
