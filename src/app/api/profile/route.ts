import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createServiceSupabaseClient } from "@/lib/supabaseServiceClient";

export async function POST(req: NextRequest) {
  console.log("[profile] POST request received");

  try {
    const { firstName, lastName, password } = (await req.json()) as {
      firstName?: string;
      lastName?: string;
      password?: string;
    };

    console.log("[profile] Request body:", { firstName, lastName, hasPassword: Boolean(password) });

    if (!firstName?.trim() || !lastName?.trim()) {
      return NextResponse.json(
        { error: "Merci de renseigner votre prénom et nom." },
        { status: 400 }
      );
    }

    if (password !== undefined) {
      if (!password.trim()) {
        return NextResponse.json(
          { error: "Votre mot de passe est requis." },
          { status: 400 }
        );
      }
      if (password.length < 8) {
        return NextResponse.json(
          { error: "Votre mot de passe doit contenir au moins 8 caractères." },
          { status: 400 }
        );
      }
    }

    // Use SUPABASE_INTERNAL_URL for Docker networking
    // Auth tokens are JWTs and don't care about domain - they validate by signature
    const supabaseUrl = process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    console.log("[profile] Supabase URL:", supabaseUrl);

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("[profile] Missing Supabase public configuration");
      return NextResponse.json(
        { error: "Configuration Supabase manquante côté serveur." },
        { status: 500 }
      );
    }

    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    console.log("[profile] Available cookies:", allCookies.map(c => ({ name: c.name, hasValue: !!c.value })));

    // Extract the auth token from the browser-created cookie (sb-localhost-auth-token)
    // and map it to what Supabase expects when using host.docker.internal (sb-host-auth-token)
    const localhostAuthCookie = cookieStore.get('sb-localhost-auth-token');
    console.log("[profile] Found localhost auth cookie:", !!localhostAuthCookie);

    const supabaseAuth = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          get(name: string) {
            console.log("[profile] Cookie get requested:", name);
            // If Supabase asks for sb-host-auth-token*, give it the sb-localhost-auth-token value
            if (name.startsWith('sb-host-auth-token') && localhostAuthCookie?.value) {
              console.log("[profile] Mapping sb-localhost-auth-token to", name);
              return localhostAuthCookie.value;
            }
            const value = cookieStore.get(name)?.value;
            console.log("[profile] Cookie get:", name, "found:", !!value);
            return value;
          },
          set(name: string, value: string, options?: CookieOptions) {
            console.log("[profile] Cookie set:", name);
            cookieStore.set({ name, value, ...(options ?? {}) });
          },
        },
      }
    );

    console.log("[profile] Calling getUser...");
    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser();

    console.log("[profile] getUser result - user:", user?.id, "error:", userError?.message);

    // TEMPORARY: Log what we're doing for debugging
    if (userError || !user) {
      console.error("[profile] Authentication failed - userError:", userError, "user:", user);

      // TEMPORARY SECURITY BYPASS FOR DEBUGGING - Remove after fixing
      // Get user ID from request body as fallback (not secure - only for debugging)
      const DEV_MODE = process.env.NODE_ENV === "development";
      if (DEV_MODE) {
        console.warn("[profile] DEV MODE: Using fallback user ID from request");
        // For now, we'll still return 401 but with more logging
      }

      return NextResponse.json({ error: "Session invalide. Merci de vous reconnecter." }, { status: 401 });
    }

    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    const fullName = `${trimmedFirst} ${trimmedLast}`.trim();

    const { error: authError } = await supabaseAuth.auth.updateUser({
      ...(password ? { password } : {}),
      data: {
        firstName: trimmedFirst,
        lastName: trimmedLast,
        name: fullName,
      },
    });

    if (authError) {
      const normalizedMessage = authError.message.trim();
      let errorMessage = "Impossible de mettre à jour votre profil pour le moment.";

      if (normalizedMessage === "User already registered") {
        errorMessage = "Cette adresse email est déjà utilisée.";
      } else if (
        normalizedMessage === "New password should be different from the old password." ||
        normalizedMessage === "New password should be different from the old password"
      ) {
        errorMessage = "Le nouveau mot de passe doit être différent de l'ancien.";
      }

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    let supabaseService;
    try {
      supabaseService = createServiceSupabaseClient();
    } catch (error) {
      console.error("[profile] Failed to create service client", error);
      return NextResponse.json(
        { error: "Configuration Supabase manquante côté serveur." },
        { status: 500 }
      );
    }
    const { error: profileError } = await supabaseService
      .from("users")
      .update({ name: fullName })
      .eq("id", user.id);

    if (profileError) {
      console.error("[profile] Failed to update users table", profileError);
      return NextResponse.json(
        { error: "La mise à jour du profil a échoué. Merci de réessayer." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Profil mis à jour avec succès.",
    });
  } catch (error) {
    console.error("[profile] Unexpected error while updating profile:", error);
    return NextResponse.json(
      { error: "Une erreur inattendue est survenue." },
      { status: 500 }
    );
  }
}
