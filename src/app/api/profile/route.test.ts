import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

const getUser = vi.fn();
const updateUser = vi.fn();
const updateProfile = vi.fn();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    getAll: () => [],
    get: () => undefined,
    set: vi.fn(),
  }),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: {
      getUser: (...args: unknown[]) => getUser(...args),
      updateUser: (...args: unknown[]) => updateUser(...args),
    },
  }),
}));

vi.mock("@/lib/supabaseServiceClient", () => ({
  createServiceSupabaseClient: () => ({
    from: () => ({
      update: () => ({
        eq: (...args: unknown[]) => updateProfile(...args),
      }),
    }),
  }),
}));

describe("POST /api/profile", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    getUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "user@example.com" } },
      error: null,
    });
    updateUser.mockResolvedValue({ error: null });
    updateProfile.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("rejects missing first or last name", async () => {
    const req = new NextRequest("http://localhost:3000/api/profile", {
      method: "POST",
      body: JSON.stringify({ firstName: "", lastName: "Doe" }),
    });

    const response = await POST(req);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({ error: "Merci de renseigner votre prénom et nom." });
  });

  it("rejects empty password when provided", async () => {
    const req = new NextRequest("http://localhost:3000/api/profile", {
      method: "POST",
      body: JSON.stringify({ firstName: "Jane", lastName: "Doe", password: " " }),
    });

    const response = await POST(req);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({ error: "Votre mot de passe est requis." });
  });

  it("rejects short password", async () => {
    const req = new NextRequest("http://localhost:3000/api/profile", {
      method: "POST",
      body: JSON.stringify({ firstName: "Jane", lastName: "Doe", password: "short" }),
    });

    const response = await POST(req);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({ error: "Votre mot de passe doit contenir au moins 8 caractères." });
  });

  it("updates supabase auth password when provided", async () => {
    const req = new NextRequest("http://localhost:3000/api/profile", {
      method: "POST",
      body: JSON.stringify({ firstName: "Jane", lastName: "Doe", password: "longenough" }),
    });

    const response = await POST(req);
    const payload = await response.json();

    expect(updateUser).toHaveBeenCalledWith(
      expect.objectContaining({
        password: "longenough",
        data: {
          firstName: "Jane",
          lastName: "Doe",
          name: "Jane Doe",
        },
      })
    );
    expect(response.status).toBe(200);
    expect(payload).toEqual({ success: true, message: "Profil mis à jour avec succès." });
  });
});
