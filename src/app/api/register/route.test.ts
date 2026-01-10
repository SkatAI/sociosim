import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { createPublicSupabaseClient } from "@/lib/supabasePublicClient";
import { createServiceSupabaseClient } from "@/lib/supabaseServiceClient";

vi.mock("@/lib/supabasePublicClient", () => ({
  createPublicSupabaseClient: vi.fn(),
}));

vi.mock("@/lib/supabaseServiceClient", () => ({
  createServiceSupabaseClient: vi.fn(),
}));

const mockCreatePublicSupabaseClient = vi.mocked(createPublicSupabaseClient);
const mockCreateServiceSupabaseClient = vi.mocked(createServiceSupabaseClient);

describe("POST /api/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks registration for a banned base email", async () => {
    const signUp = vi.fn();
    const maybeSingle = vi.fn().mockResolvedValueOnce({ data: { id: "banned-1" }, error: null });
    const builder = {
      eq: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle,
    };

    mockCreatePublicSupabaseClient.mockReturnValue({
      auth: { signUp },
    } as unknown as ReturnType<typeof mockCreatePublicSupabaseClient>);

    mockCreateServiceSupabaseClient.mockReturnValue({
      from: () => ({
        select: () => builder,
      }),
    } as unknown as ReturnType<typeof mockCreateServiceSupabaseClient>);

    const request = new NextRequest("http://localhost/api/register", {
      method: "POST",
      body: JSON.stringify({
        firstName: "Donald",
        lastName: "Duck",
        email: "donald+alias@duck.com",
        password: "longenough",
      }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.error).toBe(
      "Impossible de creer un compte avec cette adresse. Contactez un administrateur du site."
    );
    expect(signUp).not.toHaveBeenCalled();
  });

  it("blocks registration for a banned alias email", async () => {
    const signUp = vi.fn();
    const maybeSingle = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: { id: "banned-2" }, error: null });
    const builder = {
      eq: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle,
    };

    mockCreatePublicSupabaseClient.mockReturnValue({
      auth: { signUp },
    } as unknown as ReturnType<typeof mockCreatePublicSupabaseClient>);

    mockCreateServiceSupabaseClient.mockReturnValue({
      from: () => ({
        select: () => builder,
      }),
    } as unknown as ReturnType<typeof mockCreateServiceSupabaseClient>);

    const request = new NextRequest("http://localhost/api/register", {
      method: "POST",
      body: JSON.stringify({
        firstName: "Donald",
        lastName: "Duck",
        email: "donald@duck.com",
        password: "longenough",
      }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.error).toBe(
      "Impossible de creer un compte avec cette adresse. Contactez un administrateur du site."
    );
    expect(signUp).not.toHaveBeenCalled();
  });
});
