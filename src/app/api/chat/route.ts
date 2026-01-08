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
import { messages, usage } from "@/lib/data";
import { getInterviewWithAgent } from "@/lib/data/agents";

const adkClient = new AdkClient();

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const { message, userId, sessionId, adkSessionId, interviewId, streaming } = await req.json();

    console.log("[/api/chat POST] Received:", { message: message?.substring(0, 20), userId, sessionId, adkSessionId, interviewId, streaming });

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

    if (!adkSessionId || typeof adkSessionId !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'adkSessionId' field (must be string)" },
        { status: 400 }
      );
    }

    if (!interviewId || typeof interviewId !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'interviewId' field (must be string)" },
        { status: 400 }
      );
    }

    // Load interview with agent from database
    const interview = await getInterviewWithAgent(interviewId);
    const agentId = interview.agent_id;
    if (!agentId) {
      return NextResponse.json(
        { error: "Interview has no agent assigned" },
        { status: 500 }
      );
    }
    console.log("[/api/chat POST] Loaded agent from DB:", agentId);

    // Determine if streaming or not (default: streaming)
    const shouldStream = streaming !== false;

    // Handle streaming response
    if (shouldStream) {
      return handleStreamingResponse(message, userId, sessionId, adkSessionId, agentId, interviewId);
    }

    // Handle batch response
    return handleBatchResponse(message, userId, sessionId, adkSessionId, agentId, interviewId);
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
  adkSessionId: string,
  agentId: string,
  interviewId?: string
) {
  console.log("[/api/chat] Starting stream:", { message, userId, sessionId, adkSessionId });

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let assistantResponse = "";
      let tokenUsage: { input: number; output: number } | null = null;

      try {
        console.log("[/api/chat] Creating ADK request...");

        // Call ADK service with streaming
        const adkRequest = {
          app_name: "app",
          user_id: userId,
          session_id: adkSessionId,  // Use ADK session ID for ADK calls
          agent_id: agentId,      // Selected agent
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
          const eventTyped = event as Record<string, unknown>;
          const hasTokens = event.hasOwnProperty("total_input_tokens");

          console.log(`[/api/chat] Received event ${eventCount}:`, {
            hasContent: !!eventTyped.content,
            hasTokens,
            eventKeys: Object.keys(eventTyped).slice(0, 5),
          });

          // Accumulate assistant response
          if (eventTyped.content && typeof eventTyped.content === "object") {
            const content = eventTyped.content as Record<string, unknown>;
            if (Array.isArray(content.parts)) {
              for (const part of content.parts) {
                if (typeof part === "object" && part !== null && "text" in part && typeof (part as Record<string, unknown>).text === "string") {
                  assistantResponse += (part as Record<string, unknown>).text as string;
                }
              }
            }
          }

          // Extract token usage from event
          if (eventTyped.usageMetadata && typeof eventTyped.usageMetadata === "object") {
            const usageMetadata = eventTyped.usageMetadata as Record<string, unknown>;

            // ADK returns: promptTokenCount (input) and candidatesTokenCount (output)
            const promptTokenCount = usageMetadata.promptTokenCount as number | undefined;
            const candidatesTokenCount = usageMetadata.candidatesTokenCount as number | undefined;

            // Also support older format with input/output tokens
            const inputTokens =
              promptTokenCount ||
              (usageMetadata.inputTokens as number | undefined) ||
              (usageMetadata.input_tokens as number | undefined) ||
              (usageMetadata.total_input_tokens as number | undefined);

            const outputTokens =
              candidatesTokenCount ||
              (usageMetadata.outputTokens as number | undefined) ||
              (usageMetadata.output_tokens as number | undefined) ||
              (usageMetadata.total_output_tokens as number | undefined);

            if (inputTokens && outputTokens) {
              tokenUsage = {
                input: inputTokens,
                output: outputTokens,
              };
              console.log("[/api/chat] Token usage extracted:", tokenUsage);
            }
          } else if (event.hasOwnProperty("total_input_tokens") && event.hasOwnProperty("total_output_tokens")) {
            // Old format fallback
            tokenUsage = {
              input: (event as Record<string, unknown>).total_input_tokens as number,
              output: (event as Record<string, unknown>).total_output_tokens as number,
            };
            console.log("[/api/chat] Token usage extracted from direct properties:", tokenUsage);
          }

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

        // Store messages in database after streaming completes
        console.log("[/api/chat] Checking database storage...", { interviewId, hasTokenUsage: !!tokenUsage });

        if (interviewId && tokenUsage) {
          try {
            console.log("[/api/chat] Storing messages in database...", { interviewId, sessionId, tokens: tokenUsage });

            // Store user message
            await messages.storeMessage(sessionId, "user", message);
            console.log("[/api/chat] User message stored");

            // Store assistant message with tokens
            await messages.storeMessage(sessionId, "assistant", assistantResponse, tokenUsage);
            console.log("[/api/chat] Assistant message stored");

            // Update usage
            await usage.updateInterviewUsage(
              interviewId,
              tokenUsage.input,
              tokenUsage.output
            );
            console.log("[/api/chat] Usage updated");

            console.log("[/api/chat] Messages stored successfully");
          } catch (dbError) {
            const dbErrorMessage = dbError instanceof Error ? dbError.message : "Unknown error";
            console.error("[/api/chat] Failed to store messages:", dbErrorMessage, dbError);

            // Send error event to client
            const errorEvent = `data: ${JSON.stringify({
              type: "error",
              error: "Session is no longer being saved. Please refresh the page.",
            })}\n\n`;
            controller.enqueue(encoder.encode(errorEvent));
          }
        } else {
          console.log("[/api/chat] Skipping database storage - missing interviewId or tokenUsage");
        }

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
          controller.enqueue(encoder.encode(errorEvent));
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
  adkSessionId: string,
  agentId: string,
  interviewId?: string
) {
  try {
    const adkRequest = {
      app_name: "app",
      user_id: userId,
      session_id: adkSessionId,  // Use ADK session ID for ADK calls
      agent_id: agentId,      // Selected agent
      new_message: {
        role: "user" as const,
        parts: [{ text: message }],
      },
    };

    const events = await adkClient.sendMessage(adkRequest);
    const textResponse = adkClient.extractTextResponse(events);
    const tokenUsage = adkClient.getTokenUsage(events);

    // Store messages in database
    if (interviewId && tokenUsage) {
      try {
        console.log("[/api/chat] Storing messages in database...", { interviewId, sessionId });

        // Store user message
        await messages.storeMessage(sessionId, "user", message);

        // Store assistant message with tokens
        await messages.storeMessage(sessionId, "assistant", textResponse, tokenUsage);

        // Update usage
        await usage.updateInterviewUsage(
          interviewId,
          tokenUsage.input,
          tokenUsage.output
        );

        console.log("[/api/chat] Messages stored successfully");
      } catch (dbError) {
        const dbErrorMessage = dbError instanceof Error ? dbError.message : "Unknown error";
        console.error("[/api/chat] Failed to store messages:", dbErrorMessage);

        return NextResponse.json(
          { error: "Session is no longer being saved. Please refresh the page." },
          { status: 500 }
        );
      }
    }

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
