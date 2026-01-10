import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

const resetPasswordForEmail = vi.fn();

vi.mock("@/lib/supabasePublicClient", () => ({
  createPublicSupabaseClient: () => ({
    auth: {
      resetPasswordForEmail: (...args: unknown[]) => resetPasswordForEmail(...args),
    },
  }),
}));

describe("POST /api/reset-password", () => {
  const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  beforeEach(() => {
    vi.clearAllMocks();
    resetPasswordForEmail.mockResolvedValue({ error: null });
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
  });

  it("sends a reset email with redirect", async () => {
    const req = new NextRequest("http://localhost:3000/api/reset-password", {
      method: "POST",
      body: JSON.stringify({ email: "user@example.com" }),
    });

    const response = await POST(req);
    const payload = await response.json();

    expect(resetPasswordForEmail).toHaveBeenCalledWith("user@example.com", {
      redirectTo: "http://localhost:3000/reset-password/confirm",
    });
    expect(response.status).toBe(200);
    expect(payload).toEqual({ success: true });
  });

  it("rejects missing email", async () => {
    const req = new NextRequest("http://localhost:3000/api/reset-password", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = await POST(req);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({ error: "Merci de fournir une adresse e-mail." });
    expect(resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("rejects invalid email", async () => {
    const req = new NextRequest("http://localhost:3000/api/reset-password", {
      method: "POST",
      body: JSON.stringify({ email: "not-an-email" }),
    });

    const response = await POST(req);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({ error: "Le format de l'adresse emailest invalide." });
    expect(resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("returns 500 when email dispatch fails", async () => {
    resetPasswordForEmail.mockResolvedValue({ error: { message: "SMTP down" } });
    const req = new NextRequest("http://localhost:3000/api/reset-password", {
      method: "POST",
      body: JSON.stringify({ email: "user@example.com" }),
    });

    const response = await POST(req);
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toEqual({ error: "Impossible d'envoyer l'emailde réinitialisation." });
  });
});
