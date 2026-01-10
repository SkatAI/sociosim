import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabaseServiceClient";

type UserRole = "student" | "teacher" | "admin";

export async function GET() {
  try {
    const supabase = createServiceSupabaseClient();
    const { data: profiles, error: profileError } = await supabase
      .from("users")
      .select("id, name, email, role");

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
