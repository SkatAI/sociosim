import { NextRequest, NextResponse } from "next/server";
import { interviews } from "@/lib/data";

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

    console.log("[/api/user/interviews GET] Fetching interviews for user:", userId);
    const userInterviews = await interviews.getUserInterviewsWithMessages(userId);

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
