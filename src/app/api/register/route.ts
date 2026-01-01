import { NextRequest, NextResponse } from "next/server";
import { createPublicSupabaseClient } from "@/lib/supabasePublicClient";
import { createServiceSupabaseClient } from "@/lib/supabaseServiceClient";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export async function POST(req: NextRequest) {
  try {
    console.log("[register] Incoming request");

    const { firstName, lastName, email, password } = (await req.json()) as {
      firstName?: string;
      lastName?: string;
      email?: string;
      password?: string;
    };

    if (!firstName?.trim() || !lastName?.trim() || !email?.trim() || !password) {
      return NextResponse.json(
        { error: "Merci de renseigner votre prénom, nom, adresse e-mail et mot de passe." },
        { status: 400 }
      );
    }

    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Le format de l'adresse e-mail est invalide." },
        { status: 400 }
      );
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `Votre mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.` },
        { status: 400 }
      );
    }

    const supabasePublic = createPublicSupabaseClient();
    const supabaseService = createServiceSupabaseClient();
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    console.log("[register] Creating auth user", { email: normalizedEmail });

    const { data: userData, error: createUserError } =
      await supabasePublic.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            name: fullName,
            passwordConfigured: true,
          },
          emailRedirectTo: `${siteUrl}/login?signup=success`,
        },
      });

    if (createUserError || !userData?.user) {
      if (createUserError) {
        console.error("Erreur lors de la création de l'utilisateur Supabase auth:", {
          email: normalizedEmail,
          errorMessage: createUserError.message,
          errorCode: createUserError.code,
          errorDetails: createUserError,
        });
      }
      return NextResponse.json(
        {
          error:
            createUserError?.message === "User already registered"
              ? "Cette adresse e-mail est déjà utilisée."
              : createUserError?.message ??
                "Impossible de créer le compte pour le moment.",
        },
        { status: 400 }
      );
    }

    const userId = userData.user.id;
    console.log("[register] Auth user created", { userId, email: normalizedEmail });

    const { error: upsertError } = await supabaseService
      .from("users")
      .upsert(
        [
          {
            id: userId,
            name: fullName,
            email: normalizedEmail,
            role: "student",
            password_setup_token: null,
          },
        ],
        { onConflict: "id" }
      );

    if (upsertError) {
      console.error("Erreur lors de l'upsert du profil utilisateur:", {
        userId,
        email: normalizedEmail,
        errorMessage: upsertError.message,
        errorCode: upsertError.code,
        errorDetails: upsertError,
      });
      return NextResponse.json(
        {
          error: "Compte créé, mais impossible de synchroniser le profil.",
        },
        { status: 500 }
      );
    }

    console.log("[register] Profile upserted", { userId });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur lors de la création de compte:", error);
    return NextResponse.json(
      { error: "Une erreur inattendue est survenue." },
      { status: 500 }
    );
  }
}
