/**
 * Sessions API Route
 *
 * Manages ADK Agent sessions for interviews.
 * Works with the many-to-many schema using user_interview_session junction table.
 *
 * POST /api/sessions - Create a new session (new or resume interview)
 * DELETE /api/sessions - End a session
 */

import { NextRequest, NextResponse } from "next/server";
import { AdkClient } from "@/lib/adkClient";
import { createServiceSupabaseClient } from "@/lib/supabaseServiceClient";
import * as interviewDb from "@/lib/interviewDatabase";

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

    const supabase = createServiceSupabaseClient();
    let finalInterviewId = interviewId;
    let isResume = false;

    // Check if this is a resume request (interviewId provided) or new interview
    if (interviewId && typeof interviewId === "string") {
      // RESUME MODE: Verify interview exists
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

      isResume = true;
    } else {
      // NEW MODE: Create new interview
      const interview = await interviewDb.createInterview();
      finalInterviewId = interview.id;
    }

    // Create ADK session (let ADK generate its own session ID)
    const adkSession = await adkClient.createSession("app", userId);

    // Create sessions record
    const session = await interviewDb.createSession(adkSession.session_id);

    // Link user, interview, and session in junction table
    await interviewDb.linkUserInterviewSession(userId, finalInterviewId, session.id);

    return NextResponse.json(
      {
        success: true,
        sessionId: session.id,
        adkSessionId: adkSession.session_id,
        interviewId: finalInterviewId,
        isResume,
        createdAt: adkSession.created_at,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[/api/sessions POST] Error:", error);

    if (error instanceof Error && error.message.includes("409")) {
      // Session already exists
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
 * DELETE handler - end a session
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

    // Update session status to 'ended'
    await interviewDb.updateSessionStatus(sessionId, "ended");

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
