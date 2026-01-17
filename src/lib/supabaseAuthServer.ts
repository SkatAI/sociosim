import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";

export async function getAuthenticatedUser(req: NextRequest) {
  const supabaseUrl =
    process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase public configuration");
  }

  const cookieStore = req.cookies;
  const localhostAuthCookie = cookieStore.get("sb-localhost-auth-token");

  const supabaseAuth = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        if (name.startsWith("sb-host-auth-token") && localhostAuthCookie?.value) {
          return localhostAuthCookie.value;
        }
        return cookieStore.get(name)?.value;
      },
      set() {
        // No-op: we only need to read auth cookies in API routes.
      },
    },
  });

  const { data, error } = await supabaseAuth.auth.getUser();
  if (error || !data?.user) {
    return { user: null, error };
  }

  return { user: data.user, error: null };
}
