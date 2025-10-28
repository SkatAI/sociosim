import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabaseServiceClient";

const MIN_PASSWORD_LENGTH = 8;

export async function POST(req: NextRequest) {
  try {
    const { token, password } = (await req.json()) as {
      token?: string;
      password?: string;
    };

    if (!token || !password) {
      return NextResponse.json(
        { error: "Le lien de validation ou le mot de passe est manquant." },
        { status: 400 }
      );
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        {
          error: `Votre mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`,
        },
        { status: 400 }
      );
    }

    const supabase = createServiceSupabaseClient();

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("id, email")
      .eq("password_setup_token", token)
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Ce lien de validation n'est plus valide." },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(
      profile.id,
      {
        password,
      }
    );

    if (updateError) {
      console.error("Erreur lors de la mise à jour du mot de passe:", {
        userId: profile.id,
        email: profile.email,
        errorMessage: updateError.message,
      });
      return NextResponse.json(
        {
          error:
            updateError.message ??
            "Impossible de mettre à jour votre mot de passe.",
        },
        { status: 400 }
      );
    }

    const { error: clearTokenError } = await supabase
      .from("users")
      .update({ password_setup_token: null })
      .eq("id", profile.id);

    if (clearTokenError) {
      console.error("Erreur lors de la suppression du token:", {
        userId: profile.id,
        errorMessage: clearTokenError.message,
      });
      return NextResponse.json(
        {
          error:
            "Mot de passe réinitialisé, mais impossible de finaliser l'opération.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur lors de la réinitialisation du mot de passe:", error);
    return NextResponse.json(
      { error: "Une erreur inattendue est survenue." },
      { status: 500 }
    );
  }
}
