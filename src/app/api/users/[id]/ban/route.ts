import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabaseServiceClient";

type UserRole = "student" | "teacher" | "admin";

const BAN_DURATION = "100000h";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing user id" }, { status: 400 });
    }

    const { isBanned } = (await req.json()) as { isBanned?: boolean };
    if (typeof isBanned !== "boolean") {
      return NextResponse.json({ error: "Missing isBanned flag" }, { status: 400 });
    }

    const supabase = createServiceSupabaseClient();
    const { error: authError } = await supabase.auth.admin.updateUserById(id, {
      ban_duration: isBanned ? BAN_DURATION : "none",
    });

    if (authError) {
      console.error("[/api/users/[id]/ban PATCH] Auth update failed:", authError.message);
      return NextResponse.json(
        { error: "Impossible de mettre a jour ce compte." },
        { status: 500 }
      );
    }

    const { data: updatedProfile, error: profileError } = await supabase
      .from("users")
      .update({ is_banned: isBanned })
      .eq("id", id)
      .select("id, name, email, role, is_banned")
      .single();

    if (profileError || !updatedProfile) {
      console.error("[/api/users/[id]/ban PATCH] Profile update failed:", profileError?.message);
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
    console.error("[/api/users/[id]/ban PATCH] Error:", message);
    return NextResponse.json(
      { error: "Une erreur est survenue lors de la mise a jour." },
      { status: 500 }
    );
  }
}
