/**
 * Sessions API Route
 *
 * Manages ADK Agent sessions for interviews.
 * Maps interview IDs to ADK session IDs.
 *
 * POST /api/sessions - Create a new session
 * DELETE /api/sessions/:id - Delete a session
 *
 * See: ../../lib/adkClient.ts
 */

import { NextRequest, NextResponse } from "next/server";
import { AdkClient } from "@/lib/adkClient";
import { createServiceSupabaseClient } from "@/lib/supabaseServiceClient";

const adkClient = new AdkClient();

export async function POST(req: NextRequest) {
  try {
    const { userId, interviewId } = await req.json();

    // Validate required fields
    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'userId' field (must be string)" },
        { status: 400 }
      );
    }

    if (!interviewId || typeof interviewId !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'interviewId' field (must be string)" },
        { status: 400 }
      );
    }

    // Create ADK session
    // ADK expects a UUID-like session ID, so we'll use the interviewId
    const adkSession = await adkClient.createSession("app", userId, interviewId);

    // Store interview in database
    const supabase = createServiceSupabaseClient();
    const { error: insertError } = await supabase
      .from("interviews")
      .insert([
        {
          id: interviewId,
          user_id: userId,
          adk_session_id: adkSession.session_id,
          status: "in_progress",
        },
      ]);

    if (insertError) {
      console.error("[/api/sessions POST] Failed to store interview record:", insertError);
      // Log but don't fail - ADK session is already created
    }

    return NextResponse.json(
      {
        success: true,
        sessionId: adkSession.session_id,
        interviewId,
        createdAt: adkSession.created_at,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[/api/sessions POST] Error:", error);

    if (error instanceof Error && error.message.includes("409")) {
      // Session already exists - return 409
      return NextResponse.json(
        { error: "Session already exists" },
        { status: 409 }
      );
    }

    if (error instanceof Error && error.message.includes("422")) {
      // Validation error
      return NextResponse.json(
        { error: "Invalid request format" },
        { status: 422 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to create session: ${errorMessage}` },
      { status: 500 }
    );
  }
}

/**
 * DELETE handler - delete a session
 * Called with query params: ?userId=xxx&sessionId=yyy
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const sessionId = searchParams.get("sessionId");

    // Validate required fields
    if (!userId) {
      return NextResponse.json(
        { error: "Missing 'userId' query parameter" },
        { status: 400 }
      );
    }

    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing 'sessionId' query parameter" },
        { status: 400 }
      );
    }

    // Delete ADK session
    await adkClient.deleteSession("app", userId, sessionId);

    // Update interview status to standby (user left but session can be resumed)
    const supabase = createServiceSupabaseClient();
    const { error: updateError } = await supabase
      .from("interviews")
      .update({ status: "standby" })
      .eq("adk_session_id", sessionId);

    if (updateError) {
      console.error("[/api/sessions DELETE] Failed to update interview status:", updateError);
      // Log but don't fail - ADK session is already deleted
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[/api/sessions DELETE] Error:", error);

    if (error instanceof Error && error.message.includes("404")) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to delete session: ${errorMessage}` },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
