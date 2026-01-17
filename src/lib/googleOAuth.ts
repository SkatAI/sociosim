import crypto from "crypto";
import { google } from "googleapis";

const STATE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

type GoogleStatePayload = {
  interviewId: string;
  userId: string;
  issuedAt: number;
};

type GoogleStateValid = { valid: true; payload: GoogleStatePayload };
type GoogleStateInvalid = {
  valid: false;
  error: "state_invalid" | "state_expired";
};

const requireEnv = (key: string) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing ${key} environment variable`);
  }
  return value;
};

const base64UrlEncode = (value: string) =>
  Buffer.from(value).toString("base64url");

const base64UrlDecode = (value: string) =>
  Buffer.from(value, "base64url").toString("utf-8");

const signPayload = (payload: string) => {
  const secret = requireEnv("GOOGLE_OAUTH_STATE_SECRET");
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
};

const safeTimingEqual = (a: string, b: string) => {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

export const GOOGLE_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/documents",
  "https://www.googleapis.com/auth/drive.file",
];

export function createGoogleOAuthClient() {
  const clientId = requireEnv("GOOGLE_CLIENT_ID");
  const clientSecret = requireEnv("GOOGLE_CLIENT_SECRET");
  const redirectUri = requireEnv("GOOGLE_REDIRECT_URI");
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function createGoogleOAuthState(payload: {
  interviewId: string;
  userId: string;
  issuedAt?: number;
}) {
  const issuedAt = payload.issuedAt ?? Date.now();
  const packed: GoogleStatePayload = {
    interviewId: payload.interviewId,
    userId: payload.userId,
    issuedAt,
  };
  const encoded = base64UrlEncode(JSON.stringify(packed));
  const signature = signPayload(encoded);
  return `${encoded}.${signature}`;
}

export function verifyGoogleOAuthState(
  state: string
): GoogleStateValid | GoogleStateInvalid {
  const [payload, signature] = state.split(".");
  if (!payload || !signature) {
    return { valid: false, error: "state_invalid" as const };
  }

  const expected = signPayload(payload);
  if (!safeTimingEqual(expected, signature)) {
    return { valid: false, error: "state_invalid" as const };
  }

  let decoded: GoogleStatePayload | null = null;
  try {
    decoded = JSON.parse(base64UrlDecode(payload)) as GoogleStatePayload;
  } catch {
    return { valid: false, error: "state_invalid" as const };
  }

  if (!decoded?.interviewId || !decoded?.userId || !decoded?.issuedAt) {
    return { valid: false, error: "state_invalid" as const };
  }

  const age = Date.now() - decoded.issuedAt;
  if (age < 0 || age > STATE_MAX_AGE_MS) {
    return { valid: false, error: "state_expired" as const };
  }

  return { valid: true, payload: decoded };
}
