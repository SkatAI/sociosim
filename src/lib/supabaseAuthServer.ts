import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";

/**
 * Build a custom fetch that rewrites requests from the public Supabase URL
 * to the internal URL. This is needed when the Next.js server runs inside
 * Docker where localhost is unreachable but host.docker.internal is.
 * The public URL is still used for cookie-name derivation so that cookies
 * set by the browser client are read correctly.
 */
function makeInternalFetch(publicUrl: string) {
  const internalUrl = process.env.SUPABASE_INTERNAL_URL;
  if (!internalUrl || internalUrl === publicUrl) return undefined;

  return (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    const rewritten = url.replace(publicUrl, internalUrl);
    return fetch(rewritten, init);
  };
}

export async function getAuthenticatedUser(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase public configuration");
  }

  const customFetch = makeInternalFetch(supabaseUrl);

  const supabaseAuth = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll() {
        // No-op: we only need to read auth cookies in API routes.
      },
    },
    ...(customFetch && { global: { fetch: customFetch } }),
  });

  const { data, error } = await supabaseAuth.auth.getUser();
  if (error || !data?.user) {
    return { user: null, error };
  }

  return { user: data.user, error: null };
}
