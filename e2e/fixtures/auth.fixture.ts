import { test as base, Page, expect } from "@playwright/test";
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

type TestUser = keyof typeof TEST_USERS;

/**
 * Custom Playwright fixtures for authentication
 *
 * Usage in tests:
 *   test("should access dashboard", async ({ authenticatedPage }) => {
 *     await authenticatedPage.goto("/dashboard");
 *     // User already authenticated as student
 *   });
 */
export const test = base.extend<{
  authenticateAs: (userType: TestUser) => Promise<{ userId: string }>;
  authenticatedPage: Page;
}>({
  authenticateAs: async ({ page }, use) => {
    const authenticate = async (
      userType: TestUser
    ): Promise<{ userId: string }> => {
      const user = TEST_USERS[userType];

      // Use Supabase client to sign in and get session
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      // Sign in to get valid session
      const { data, error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: user.password,
      });

      if (error) {
        throw new Error(`Authentication failed for ${user.email}: ${error.message}`);
      }

      if (!data.session) {
        throw new Error(`No session returned for ${user.email}`);
      }

      // Navigate to page to initialize browser context
      await page.goto("/");

      // Inject session into browser storage
      await page.evaluate((session) => {
        // Store in localStorage for Supabase JS client to pick up
        localStorage.setItem(
          `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL!.split("://")[1]}-auth-token`,
          JSON.stringify(session)
        );
      }, data.session);

      // Reload to apply session
      await page.reload();

      // Wait for authentication to be processed
      await page.waitForLoadState("networkidle");

      return { userId: data.user.id };
    };

    await use(authenticate);
  },

  authenticatedPage: async ({ page, authenticateAs }, use) => {
    // Default: authenticate as student
    await authenticateAs("student");
    await use(page);
  },
});

export { expect };
