import { NextResponse } from "next/server";
import { getAgents, getPublishedAgents } from "@/lib/data/agents";

/**
 * GET /api/agents?published=true
 * Returns all agents, optionally filtered to published-only.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const publishedOnly = searchParams.get("published") === "true";

    const agents = publishedOnly ? await getPublishedAgents() : await getAgents();

    return NextResponse.json({ success: true, agents }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[/api/agents GET] Error:", message);

    return NextResponse.json(
      { error: `Failed to load agents: ${message}` },
      { status: 500 }
    );
  }
}
