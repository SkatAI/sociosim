import { NextRequest, NextResponse } from "next/server";
import { createPublicSupabaseClient } from "@/lib/supabasePublicClient";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const { email } = (await req.json()) as {
      email?: string;
    };

    if (!email?.trim()) {
      return NextResponse.json(
        { error: "Merci de fournir une adresse e-mail." },
        { status: 400 }
      );
    }

    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Le format de l'adresse e-mail est invalide." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const supabase = createPublicSupabaseClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      normalizedEmail,
      {
        redirectTo: `${siteUrl}/reset-password/confirm`,
      }
    );

    if (resetError) {
      console.error("Erreur lors de l'envoi de l'email de réinitialisation:", {
        email: normalizedEmail,
        errorMessage: resetError.message,
      });
      return NextResponse.json(
        { error: "Impossible d'envoyer l'e-mail de réinitialisation." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur lors de la demande de réinitialisation:", error);
    return NextResponse.json(
      { error: "Une erreur inattendue est survenue." },
      { status: 500 }
    );
  }
}
