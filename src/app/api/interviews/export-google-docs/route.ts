import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { buildGoogleDocsRequests } from "@/lib/googleDocs";
import {
  fetchInterviewExportData,
  InterviewExportError,
} from "@/lib/interviewExport";
import { createGoogleOAuthClient } from "@/lib/googleOAuth";

const GOOGLE_TOKEN_COOKIE = "google_access_token";

const isUnauthorizedError = (error: unknown) => {
  if (!error || typeof error !== "object") return false;
  const err = error as { code?: number; response?: { status?: number } };
  return err.code === 401 || err.response?.status === 401;
};

export async function POST(req: NextRequest) {
  try {
    const accessToken = req.cookies.get(GOOGLE_TOKEN_COOKIE)?.value;
    if (!accessToken) {
      return NextResponse.json(
        { error: "Authentification Google requise.", requiresAuth: true },
        { status: 401 }
      );
    }

    const body = (await req.json().catch(() => null)) as { interviewId?: string } | null;
    const interviewId = body?.interviewId;
    if (!interviewId) {
      return NextResponse.json(
        { error: "Missing 'interviewId' in request body" },
        { status: 400 }
      );
    }

    const exportData = await fetchInterviewExportData(interviewId);
    const oauthClient = createGoogleOAuthClient();
    oauthClient.setCredentials({ access_token: accessToken });

    const docs = google.docs({ version: "v1", auth: oauthClient });
    const docTitle = `Entretien avec ${exportData.agentName} - ${new Date()
      .toISOString()
      .slice(0, 10)}`;
    const doc = await docs.documents.create({
      requestBody: { title: docTitle },
    });

    if (!doc.data.documentId) {
      return NextResponse.json(
        { error: "Impossible de créer le document Google Docs." },
        { status: 500 }
      );
    }

    const requests = buildGoogleDocsRequests(exportData);
    await docs.documents.batchUpdate({
      documentId: doc.data.documentId,
      requestBody: { requests },
    });

    return NextResponse.json(
      {
        documentUrl: `https://docs.google.com/document/d/${doc.data.documentId}/edit`,
        documentId: doc.data.documentId,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof InterviewExportError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    if (isUnauthorizedError(error)) {
      const response = NextResponse.json(
        { error: "Session Google expirée.", requiresAuth: true },
        { status: 401 }
      );
      response.cookies.set(GOOGLE_TOKEN_COOKIE, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
      return response;
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[/api/interviews/export-google-docs POST] Error:", message);
    return NextResponse.json(
      { error: "Impossible d'exporter vers Google Docs." },
      { status: 500 }
    );
  }
}
