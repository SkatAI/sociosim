/**
 * Get all messages for an interview
 * GET /api/interviews/[id]/messages
 *
 * Returns all messages for an interview across all sessions,
 * ordered chronologically.
 */

import { NextRequest, NextResponse } from "next/server";
import { getInterviewMessages } from "@/lib/interviewDatabase";
import { createServiceSupabaseClient } from "@/lib/supabaseServiceClient";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: interviewId } = await params;

    if (!interviewId) {
      return NextResponse.json(
        { error: "Missing interview ID" },
        { status: 400 }
      );
    }

    // Verify interview exists (could add user_id check for security if needed)
    const supabase = createServiceSupabaseClient();
    const { data: interview, error: checkError } = await supabase
      .from("interviews")
      .select("id")
      .eq("id", interviewId)
      .single();

    if (checkError || !interview) {
      return NextResponse.json(
        { error: "Interview not found" },
        { status: 404 }
      );
    }

    // Load all messages
    const messages = await getInterviewMessages(interviewId);

    return NextResponse.json(
      {
        success: true,
        messages,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[/api/interviews/[id]/messages GET] Error:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to load messages: ${errorMessage}` },
      { status: 500 }
    );
  }
}
