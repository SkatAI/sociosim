import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "../../../lib/supabaseServiceClient";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const { firstName, lastName, email } = (await req.json()) as {
      firstName?: string;
      lastName?: string;
      email?: string;
    };

    if (!firstName?.trim() || !lastName?.trim() || !email?.trim()) {
      return NextResponse.json(
        { error: "Merci de renseigner votre prénom, nom et adresse e-mail." },
        { status: 400 }
      );
    }

    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Le format de l'adresse e-mail est invalide." },
        { status: 400 }
      );
    }

    const supabase = createServiceSupabaseClient();
    const generatedPassword = randomBytes(16).toString("base64url");
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    const normalizedEmail = email.trim().toLowerCase();

    const { data: userData, error: createUserError } =
      await supabase.auth.admin.createUser({
        email: normalizedEmail,
        password: generatedPassword,
        email_confirm: true,
        user_metadata: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          name: fullName,
        },
      });

    if (createUserError || !userData?.user) {
      return NextResponse.json(
        {
          error:
            createUserError?.message ??
            "Impossible de créer le compte pour le moment.",
        },
        { status: 400 }
      );
    }

    const userId = userData.user.id;

    const { error: upsertError } = await supabase
      .from("users")
      .upsert(
        [
          {
            id: userId,
            name: fullName,
            email: normalizedEmail,
            role: "student",
          },
        ],
        { onConflict: "id" }
      );

    if (upsertError) {
      return NextResponse.json(
        {
          error: "Compte créé, mais impossible de synchroniser le profil.",
        },
        { status: 500 }
      );
    }

    const fakeToken = randomBytes(16).toString("hex");
    const confirmationUrl = `http://localhost:3000/enregistrement/confirmation?token=${fakeToken}`;
    // Simulate sending email by logging the confirmation URL.
    console.log(
      `[Sociosim] Lien de validation pour ${normalizedEmail}: ${confirmationUrl}`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur lors de la création de compte:", error);
    return NextResponse.json(
      { error: "Une erreur inattendue est survenue." },
      { status: 500 }
    );
  }
}
