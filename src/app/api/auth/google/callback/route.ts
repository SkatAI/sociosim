import { NextRequest, NextResponse } from "next/server";
import {
  createGoogleOAuthClient,
  verifyGoogleOAuthState,
} from "@/lib/googleOAuth";
import { getAuthenticatedUser } from "@/lib/supabaseAuthServer";

const GOOGLE_TOKEN_COOKIE = "google_access_token";
const COOKIE_MAX_AGE = 60 * 60 * 24;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code || !state) {
      return NextResponse.json(
        { error: "Missing OAuth code or state" },
        { status: 400 }
      );
    }

    const stateCheck = verifyGoogleOAuthState(state);
    if (!stateCheck.valid) {
      return NextResponse.json(
        { error: "Invalid OAuth state" },
        { status: 400 }
      );
    }

    const { user } = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    if (user.id !== stateCheck.payload.userId) {
      return NextResponse.json(
        { error: "OAuth state does not match current user" },
        { status: 401 }
      );
    }

    const oauthClient = createGoogleOAuthClient();
    const { tokens } = await oauthClient.getToken(code);
    const accessToken = tokens.access_token;

    if (!accessToken) {
      return NextResponse.json(
        { error: "Google access token missing" },
        { status: 400 }
      );
    }

    const response = NextResponse.redirect(
      new URL(`/interview/${stateCheck.payload.interviewId}?oauth=success`, req.url)
    );
    response.cookies.set(GOOGLE_TOKEN_COOKIE, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[/api/auth/google/callback GET] Error:", message);
    return NextResponse.json(
      { error: "Impossible de finaliser l'authentification Google." },
      { status: 500 }
    );
  }
}
