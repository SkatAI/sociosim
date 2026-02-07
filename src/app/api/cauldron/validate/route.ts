import { NextRequest, NextResponse } from "next/server";
import { withTimeout } from "@/lib/withTimeout";

const DEFAULT_BASE_URL = "http://localhost:8088";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const content = body?.content?.trim();

    if (!content) {
      return NextResponse.json(
        { error: "Missing content" },
        { status: 400 }
      );
    }

    const baseUrl = process.env.CAULDRON_BASE_URL || DEFAULT_BASE_URL;

    const response = await withTimeout(
      "cauldronValidate",
      fetch(`${baseUrl}/v1/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      }),
      30000
    );

    if (!response.ok) {
      const payload = await response.text().catch(() => "");
      console.error("[/api/cauldron/validate POST] Error:", payload || response.statusText);
      return NextResponse.json(
        { error: "Cauldron validation failed" },
        { status: 502 }
      );
    }

    const payload = await response.json().catch(() => null);
    if (!payload?.status) {
      console.error("[/api/cauldron/validate POST] Error: invalid response");
      return NextResponse.json(
        { error: "Invalid cauldron response" },
        { status: 502 }
      );
    }

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[/api/cauldron/validate POST] Error:", message);
    return NextResponse.json(
      { error: `Failed to validate prompt: ${message}` },
      { status: 500 }
    );
  }
}
