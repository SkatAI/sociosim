import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabaseServiceClient";

type UserRole = "student" | "teacher" | "admin";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing user id" }, { status: 400 });
    }

    const { role } = (await req.json()) as { role?: UserRole };
    if (!role) {
      return NextResponse.json({ error: "Missing role" }, { status: 400 });
    }

    const supabase = createServiceSupabaseClient();
    const { data: updatedProfile, error: profileError } = await supabase
      .from("users")
      .update({ role })
      .eq("id", id)
      .select("id, name, email, role, is_banned")
      .single();

    if (profileError || !updatedProfile) {
      console.error("[/api/users/[id]/role PATCH] Profile update failed:", profileError?.message);
      return NextResponse.json(
        { error: "Impossible de mettre a jour ce compte." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        user: {
          id: updatedProfile.id,
          name: updatedProfile.name,
          email: updatedProfile.email ?? "",
          role: updatedProfile.role as UserRole,
          is_banned: updatedProfile.is_banned ?? false,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[/api/users/[id]/role PATCH] Error:", message);
    return NextResponse.json(
      { error: "Une erreur est survenue lors de la mise a jour." },
      { status: 500 }
    );
  }
}
