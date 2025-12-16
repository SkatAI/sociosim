import { chromium, FullConfig } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * Test User Credentials
 */
export const TEST_USERS = {
  student: {
    email: "student.test@sociosim.local",
    password: "TestPassword123!",
    firstName: "Test",
    lastName: "Student",
    role: "student" as const,
  },
  teacher: {
    email: "teacher.test@sociosim.local",
    password: "TestPassword123!",
    firstName: "Test",
    lastName: "Teacher",
    role: "teacher" as const,
  },
  admin: {
    email: "admin.test@sociosim.local",
    password: "TestPassword123!",
    firstName: "Test",
    lastName: "Admin",
    role: "admin" as const,
  },
};

/**
 * Global Setup - Runs once before all tests
 *
 * Responsibilities:
 * - Ensure Supabase is running
 * - Create test users if they don't exist
 * - Clean database of test data
 */
async function globalSetup(config: FullConfig) {
  console.log("🚀 [Global Setup] Initializing test environment...\n");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase environment variables. Ensure .env.test is configured."
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Create test users (idempotent)
  for (const [key, user] of Object.entries(TEST_USERS)) {
    console.log(`  Creating test user: ${user.email}...`);

    // Check if user exists
    const { data: existingUser, error: selectError } = await supabase
      .from("users")
      .select("id")
      .eq("email", user.email)
      .maybeSingle();

    if (existingUser) {
      console.log(`    ✓ User already exists`);
      continue;
    }

    if (selectError && selectError.code !== "PGRST116") {
      console.error(`    ✗ Error checking user: ${selectError.message}`);
      continue;
    }

    // Create user via Supabase Admin API
    const { data: authUser, error: authError } =
      await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          firstName: user.firstName,
          lastName: user.lastName,
        },
      });

    if (authError) {
      // If user already exists via auth, that's fine
      if (authError.message.includes("already registered")) {
        console.log(`    ✓ User already registered in auth`);

        // Still need to ensure users table entry
        const { data: authUsers, error: listError } =
          await supabase.auth.admin.listUsers();

        if (!listError) {
          const authUser = authUsers.users.find((u) => u.email === user.email);
          if (authUser) {
            const { error: upsertError } = await supabase
              .from("users")
              .upsert({
                id: authUser.id,
                email: user.email,
                role: user.role,
              })
              .eq("id", authUser.id);

            if (upsertError) {
              console.error(
                `    ✗ Failed to create users table entry: ${upsertError.message}`
              );
            }
          }
        }
        continue;
      }

      console.error(`    ✗ Failed to create user: ${authError.message}`);
      continue;
    }

    // Update user role in custom users table
    if (authUser?.user?.id) {
      const { error: roleError } = await supabase
        .from("users")
        .update({ role: user.role })
        .eq("id", authUser.user.id);

      if (roleError) {
        console.error(`    ✗ Failed to set role: ${roleError.message}`);
      } else {
        console.log(`    ✓ User created with role: ${user.role}`);
      }
    }
  }

  // Clean up test data
  console.log("\n  Cleaning up existing test data...");
  const testEmails = Object.values(TEST_USERS).map((u) => u.email);

  const { data: testUserIds, error: selectUsersError } = await supabase
    .from("users")
    .select("id")
    .in("email", testEmails);

  if (!selectUsersError && testUserIds && testUserIds.length > 0) {
    const userIds = testUserIds.map((u) => u.id);

    // Delete in correct order to respect foreign keys
    await supabase.from("messages").delete().in("user_id", userIds);
    await supabase.from("interviews").delete().in("user_id", userIds);
    await supabase.from("sessions").delete().in("user_id", userIds);

    console.log("  ✓ Test data cleaned up");
  }

  console.log("\n✅ [Global Setup] Test environment ready\n");
}

export default globalSetup;
