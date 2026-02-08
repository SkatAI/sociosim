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
import { interviews, sessions } from "@/lib/data";
import { getAgentById, getInterviewWithAgent } from "@/lib/data/agents";
import { getAuthenticatedUser } from "@/lib/supabaseAuthServer";
import { createServiceSupabaseClient } from "@/lib/supabaseServiceClient";
import { canStartInterview } from "@/lib/agentPolicy";

const adkClient = new AdkClient();

export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const userId = typeof body.userId === "string" ? body.userId : null;
    const interviewId =
      typeof body.interviewId === "string" && body.interviewId.trim().length > 0
        ? body.interviewId
        : null;
    const agentIdFromRequest = body.agent_id;

    console.log("--- api session routes interviewId:", interviewId);
    console.log("--- api session routes agentId (from request):", agentIdFromRequest);

    // Validate required fields
    if (!userId) {
      return NextResponse.json(
        { error: "Missing or invalid 'userId' field (must be string)" },
        { status: 400 }
      );
    }

    if (userId !== user.id) {
      return NextResponse.json(
        { error: "Forbidden: user mismatch" },
        { status: 403 }
      );
    }

    let finalInterviewId = interviewId;
    let isResume = false;
    let validAgentName: string;
    let agentId: string;

    const supabase = createServiceSupabaseClient();
    const { data: userRecord, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (userError) {
      const message = userError.message ?? "Failed to load user role";
      console.error("[/api/sessions POST] Role error:", message);
      return NextResponse.json({ error: message }, { status: 500 });
    }

    const role = userRecord?.role ?? null;

    // Check if this is a resume request (interviewId provided) or new interview
    if (interviewId) {
      console.log("--- RESUME MODE");
      // RESUME MODE: Load interview and get agent from database
      const interview = await interviews.getInterviewById(interviewId);
      if (!interview) {
        return NextResponse.json(
          { error: "Interview not found" },
          { status: 404 }
        );
      }

      // Verify interview has agent_id
      if (!interview.agent_id) {
        return NextResponse.json(
          { error: "Interview has no agent assigned" },
          { status: 500 }
        );
      }

      agentId = interview.agent_id;

      // Load agent name from database using the agent_id
      const agentInfo = await getInterviewWithAgent(interviewId);
      const agentNameFromDb = agentInfo.agents?.agent_name;

      if (!agentNameFromDb) {
        return NextResponse.json(
          { error: "Interview agent is invalid or missing" },
          { status: 500 }
        );
      }

      validAgentName = agentNameFromDb;
      isResume = true;
    } else {
      console.log("--- NEW MODE");
      // NEW MODE: Validate agent_id from request
      if (typeof agentIdFromRequest !== "string" || agentIdFromRequest.trim().length === 0) {
        return NextResponse.json(
          { error: "Missing or invalid 'agent_id' field" },
          { status: 400 }
        );
      }

      // Look up agent from database
      const agentRecord = await getAgentById(agentIdFromRequest);
      if (!agentRecord) {
        return NextResponse.json(
          { error: "Unknown agent_id" },
          { status: 400 }
        );
      }

      if (!canStartInterview(role, user.id, agentRecord)) {
        return NextResponse.json(
          { error: agentRecord.active ? "Agent not accessible" : "Agent is inactive" },
          { status: 403 }
        );
      }

      agentId = agentRecord.id;
      validAgentName = agentRecord.agent_name;
      console.log("--- api session routes agentId:", agentId);

      // Create new interview with agent_id
      const interview = await interviews.createInterview(agentId);
      finalInterviewId = interview.id;
    }

    // Create ADK session (let ADK generate its own session ID)
    const adkSession = await adkClient.createSession("app", userId, agentId);

    // Create sessions record
    const session = await sessions.createSession(adkSession.session_id);

    // Link user, interview, and session in junction table
    await sessions.linkUserInterviewSession(userId, finalInterviewId, session.id);

    return NextResponse.json(
      {
        success: true,
        sessionId: session.id,
        adkSessionId: adkSession.session_id,
        interviewId: finalInterviewId,
        agent_id: agentId,
        agent_name: validAgentName,
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
    const sessionId = searchParams.get("sessionId"); // Database session UUID
    const adkSessionId = searchParams.get("adkSessionId"); // ADK session ID

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

    // Delete ADK session (prefer ADK session ID, fall back to DB ID if missing)
    await adkClient.deleteSession("app", userId, adkSessionId || sessionId);

    // Update session status to 'ended' in database
    await sessions.updateSessionStatus(sessionId, "ended");

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
