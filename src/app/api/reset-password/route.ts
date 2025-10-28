import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabaseServiceClient";

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
    const supabase = createServiceSupabaseClient();

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (userError || !user) {
      console.warn(
        `[Sociosim] Tentative de réinitialisation pour e-mail inexistant: ${normalizedEmail}`
      );
      return NextResponse.json(
        { error: "Si cet e-mail existe, vous recevrez un lien de réinitialisation." },
        { status: 200 }
      );
    }

    const resetToken = randomBytes(24).toString("hex");

    const { error: updateError } = await supabase
      .from("users")
      .update({ password_setup_token: resetToken })
      .eq("id", user.id);

    if (updateError) {
      console.error("Erreur lors de la mise à jour du token de réinitialisation:", {
        email: normalizedEmail,
        errorMessage: updateError.message,
        errorCode: updateError.code,
      });
      return NextResponse.json(
        { error: "Impossible de traiter votre demande. Veuillez réessayer." },
        { status: 500 }
      );
    }

    const resetUrl = `http://localhost:3000/reset-password/confirm?token=${resetToken}`;
    console.log(
      `[Sociosim] Lien de réinitialisation pour ${normalizedEmail}: ${resetUrl}`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur lors de la demande de réinitialisation:", error);
    return NextResponse.json(
      { error: "Une erreur inattendue est survenue." },
      { status: 500 }
    );
  }
}
