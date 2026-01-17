import { describe, it, expect, beforeEach } from "vitest";
import { createGoogleOAuthState, verifyGoogleOAuthState } from "./googleOAuth";

describe("googleOAuth state helpers", () => {
  beforeEach(() => {
    process.env.GOOGLE_OAUTH_STATE_SECRET = "test-secret";
  });

  it("creates a state that validates successfully", () => {
    const state = createGoogleOAuthState({
      interviewId: "interview-123",
      userId: "user-456",
      issuedAt: Date.now(),
    });

    const result = verifyGoogleOAuthState(state);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.payload.interviewId).toBe("interview-123");
      expect(result.payload.userId).toBe("user-456");
    }
  });

  it("rejects tampered state", () => {
    const state = createGoogleOAuthState({
      interviewId: "interview-123",
      userId: "user-456",
      issuedAt: Date.now(),
    });

    const [payload, signature] = state.split(".");
    const tampered = `${payload}x.${signature}`;
    const result = verifyGoogleOAuthState(tampered);
    expect(result.valid).toBe(false);
  });

  it("rejects expired state", () => {
    const expiredAt = Date.now() - 25 * 60 * 60 * 1000;
    const state = createGoogleOAuthState({
      interviewId: "interview-123",
      userId: "user-456",
      issuedAt: expiredAt,
    });

    const result = verifyGoogleOAuthState(state);
    expect(result.valid).toBe(false);
  });

  it("rejects invalid format", () => {
    const result = verifyGoogleOAuthState("not-a-valid-state");
    expect(result.valid).toBe(false);
  });
});
