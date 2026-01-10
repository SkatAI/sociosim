import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabaseServiceClient";

type UserRole = "student" | "teacher" | "admin";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET() {
  try {
    const supabase = createServiceSupabaseClient();
    const { data: profiles, error: profileError } = await supabase
      .from("users")
      .select("id, name, email, role, is_banned");

    if (profileError) {
      console.error("[/api/users GET] Failed to load profiles:", profileError.message);
      return NextResponse.json(
        { error: "Impossible de charger les utilisateurs." },
        { status: 500 }
      );
    }

    const users = (profiles ?? [])
      .map((profile) => ({
        id: profile.id,
        name: profile.name,
        email: profile.email ?? "",
        role: profile.role as UserRole,
        is_banned: profile.is_banned ?? false,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "fr"));

    return NextResponse.json({ users }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[/api/users GET] Error:", message);
    return NextResponse.json(
      { error: "Une erreur est survenue lors du chargement des utilisateurs." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { email, name, isAdmin } = (await req.json()) as {
      email?: string;
      name?: string;
      isAdmin?: boolean;
    };

    if (!email?.trim() || !name?.trim()) {
      return NextResponse.json(
        { error: "Merci de renseigner un e-mail et un nom." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json(
        { error: "Le format de l'adresse e-mail est invalide." },
        { status: 400 }
      );
    }

    const supabase = createServiceSupabaseClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const { data: inviteData, error: inviteError } =
      await supabase.auth.admin.inviteUserByEmail(normalizedEmail, {
        redirectTo: `${siteUrl}/reset-password/confirm`,
        data: {
          name: trimmedName,
        },
      });

    if (inviteError || !inviteData?.user) {
      console.error("[/api/users POST] Invite failed:", inviteError?.message);
      return NextResponse.json(
        {
          error:
            inviteError?.message === "User already registered"
              ? "Cette adresse e-mail est déjà utilisée."
              : "Impossible d'inviter cet utilisateur.",
        },
        { status: 400 }
      );
    }

    const role: UserRole = isAdmin ? "admin" : "student";
    const { error: insertError } = await supabase
      .from("users")
      .upsert(
        [
          {
            id: inviteData.user.id,
            name: trimmedName,
            email: normalizedEmail,
            role,
            password_setup_token: null,
            is_banned: false,
          },
        ],
        { onConflict: "id" }
      );

    if (insertError) {
      console.error("[/api/users POST] Profile upsert failed:", insertError.message);
      return NextResponse.json(
        { error: "Invitation envoyée, mais le profil n'a pas pu être créé." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        user: {
          id: inviteData.user.id,
          name: trimmedName,
          email: normalizedEmail,
          role,
          is_banned: false,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[/api/users POST] Error:", message);
    return NextResponse.json(
      { error: "Une erreur est survenue lors de l'invitation." },
      { status: 500 }
    );
  }
}
