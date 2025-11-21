/**
 * Chat API Route
 *
 * Handles streaming chat completions via the ADK Agent Service.
 * BFF endpoint that proxies requests to the ADK service and re-streams responses.
 *
 * POST /api/chat
 * Body: { message: string; userId: string; sessionId: string; interviewId?: string }
 * Response: Server-Sent Events (SSE) stream or JSON array
 *
 * See: ../../lib/adkClient.ts and ../../../types/adk.ts
 */

import { NextRequest, NextResponse } from "next/server";
import { AdkClient } from "@/lib/adkClient";

const adkClient = new AdkClient();

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const { message, userId, sessionId, interviewId, streaming } = await req.json();

    // Validate required fields
    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'message' field (must be string)" },
        { status: 400 }
      );
    }

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'userId' field (must be string)" },
        { status: 400 }
      );
    }

    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'sessionId' field (must be string)" },
        { status: 400 }
      );
    }

    // Determine if streaming or not (default: streaming)
    const shouldStream = streaming !== false;

    // Handle streaming response
    if (shouldStream) {
      return handleStreamingResponse(message, userId, sessionId, interviewId);
    }

    // Handle batch response
    return handleBatchResponse(message, userId, sessionId, interviewId);
  } catch (error) {
    console.error("[/api/chat] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to process chat request: ${errorMessage}` },
      { status: 500 }
    );
  }
}

/**
 * Handle streaming response using Server-Sent Events (SSE)
 */
function handleStreamingResponse(
  message: string,
  userId: string,
  sessionId: string,
  interviewId?: string
) {
  console.log("[/api/chat] Starting stream:", { message, userId, sessionId });

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      try {
        console.log("[/api/chat] Creating ADK request...");

        // Call ADK service with streaming
        const adkRequest = {
          app_name: "app",
          user_id: userId,
          session_id: sessionId,
          new_message: {
            role: "user" as const,
            parts: [{ text: message }],
          },
        };

        console.log("[/api/chat] Calling ADK streamMessage...");
        let eventCount = 0;

        // Stream events from ADK
        for await (const event of adkClient.streamMessage(adkRequest)) {
          eventCount++;
          console.log(`[/api/chat] Received event ${eventCount}:`, {
            hasContent: !!event.content,
            hasTokens: event.hasOwnProperty("total_input_tokens"),
          });

          try {
            // Send event as SSE
            const sseData = `data: ${JSON.stringify({
              type: event.hasOwnProperty("total_input_tokens") ? "done" : "message",
              event,
              interviewId,
            })}\n\n`;

            controller.enqueue(encoder.encode(sseData));
          } catch (e) {
            console.error("[/api/chat] Failed to encode event:", e);
          }
        }

        console.log(`[/api/chat] Finished streaming ${eventCount} events`);

        // Close stream
        controller.close();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("[/api/chat] Stream error:", errorMessage, error);

        try {
          const errorEvent = `data: ${JSON.stringify({
            type: "error",
            error: errorMessage,
          })}\n\n`;
          controller.enqueue(new TextEncoder().encode(errorEvent));
        } catch (e) {
          console.error("[/api/chat] Failed to send error event:", e);
        }

        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      // Allow CORS if needed
      "Access-Control-Allow-Origin": "*",
    },
  });
}

/**
 * Handle batch response - wait for all events then return as JSON
 */
async function handleBatchResponse(
  message: string,
  userId: string,
  sessionId: string,
  interviewId?: string
) {
  try {
    const adkRequest = {
      app_name: "app",
      user_id: userId,
      session_id: sessionId,
      new_message: {
        role: "user" as const,
        parts: [{ text: message }],
      },
    };

    const events = await adkClient.sendMessage(adkRequest);
    const textResponse = adkClient.extractTextResponse(events);
    const tokenUsage = adkClient.getTokenUsage(events);

    return NextResponse.json({
      success: true,
      response: textResponse,
      tokens: tokenUsage,
      interviewId,
      events, // Return raw events for debugging if needed
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[/api/chat] Batch error:", errorMessage);

    return NextResponse.json(
      { error: `Failed to send message: ${errorMessage}` },
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
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
