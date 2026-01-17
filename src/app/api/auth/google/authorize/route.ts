import { NextRequest, NextResponse } from "next/server";
import {
  GOOGLE_OAUTH_SCOPES,
  createGoogleOAuthClient,
  createGoogleOAuthState,
} from "@/lib/googleOAuth";
import { getAuthenticatedUser } from "@/lib/supabaseAuthServer";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const interviewId = searchParams.get("interviewId");

    if (!interviewId) {
      return NextResponse.json(
        { error: "Missing 'interviewId' query parameter" },
        { status: 400 }
      );
    }

    const { user } = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    const state = createGoogleOAuthState({
      interviewId,
      userId: user.id,
    });

    const oauthClient = createGoogleOAuthClient();
    const authUrl = oauthClient.generateAuthUrl({
      access_type: "online",
      scope: GOOGLE_OAUTH_SCOPES,
      state,
    });

    return NextResponse.redirect(authUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[/api/auth/google/authorize GET] Error:", message);
    return NextResponse.json(
      { error: "Impossible de démarrer l'authentification Google." },
      { status: 500 }
    );
  }
}
