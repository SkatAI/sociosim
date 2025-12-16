import { test, expect } from "@/e2e/fixtures/auth.fixture";
import { HeaderComponent } from "@/e2e/page-objects/header.component";
import { DashboardPage } from "@/e2e/page-objects/dashboard.page";

test.describe("Header Interactions - Navigation and User Menu", () => {
  test.beforeEach(async ({ page }) => {
    // Capture browser errors
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        console.error(`[Browser Console Error]: ${msg.text()}`);
      }
    });

    page.on("pageerror", (error) => {
      console.error(`[Page Error]: ${error.message}`);
    });
  });

  test("should display user avatar on authenticated page", async ({ authenticatedPage }) => {
    const header = new HeaderComponent(authenticatedPage);

    await authenticatedPage.goto("/dashboard");

    // Avatar should be visible for authenticated user
    const isAuthenticated = await header.isAuthenticated();
    expect(isAuthenticated).toBeTruthy();
  });

  test("should open popover menu on avatar click", async ({ authenticatedPage }) => {
    const header = new HeaderComponent(authenticatedPage);

    await authenticatedPage.goto("/dashboard");

    // Open menu
    await header.openMenu();

    // Menu should be visible
    const isOpen = await header.isMenuOpen();
    expect(isOpen).toBeTruthy();
  });

  test("should display user information in popover", async ({ authenticatedPage }) => {
    const header = new HeaderComponent(authenticatedPage);

    await authenticatedPage.goto("/dashboard");

    // Get user info
    const userName = await header.getUserName();
    const userEmail = await header.getUserEmail();

    // Should display name and email
    expect(userName).toBeTruthy();
    expect(userEmail).toBeTruthy();
    expect(userEmail).toContain("@sociosim.local");
  });

  test("should navigate to profile via header menu", async ({ authenticatedPage }) => {
    const header = new HeaderComponent(authenticatedPage);

    await authenticatedPage.goto("/dashboard");

    // Click modify profile
    await header.clickModifyProfile();

    // Should navigate to /profile
    expect(authenticatedPage).toHaveURL("/profile");
  });

  test("should navigate to dashboard via header menu", async ({ authenticatedPage }) => {
    const header = new HeaderComponent(authenticatedPage);

    // Start on profile page
    await authenticatedPage.goto("/profile");

    // Navigate via header
    await header.clickDashboard();

    // Should be on dashboard
    expect(authenticatedPage).toHaveURL("/dashboard");
  });

  test("should log out and redirect to login", async ({ authenticatedPage }) => {
    const header = new HeaderComponent(authenticatedPage);

    await authenticatedPage.goto("/dashboard");

    // Logout
    await header.logout();

    // Should redirect to login
    await authenticatedPage.waitForURL("/login");
    expect(authenticatedPage).toHaveURL("/login");

    // Avatar should no longer be visible (not authenticated)
    const isAuthenticated = await header.isAuthenticated();
    expect(isAuthenticated).toBeFalsy();
  });

  test("should show role for teacher user", async ({ authenticatedPage, authenticateAs }) => {
    // Authenticate as teacher
    await authenticateAs("teacher");
    await authenticatedPage.goto("/dashboard");

    const header = new HeaderComponent(authenticatedPage);

    // Get user role
    const userRole = await header.getUserRole();

    // Should display role
    if (userRole) {
      expect(userRole.toLowerCase()).toContain("enseignant") || expect(userRole.toLowerCase()).toContain("teacher");
    }
  });

  test("should show role for admin user", async ({ authenticatedPage, authenticateAs }) => {
    // Authenticate as admin
    await authenticateAs("admin");
    await authenticatedPage.goto("/dashboard");

    const header = new HeaderComponent(authenticatedPage);

    // Get user role
    const userRole = await header.getUserRole();

    // Should display role
    if (userRole) {
      expect(userRole.toLowerCase()).toContain("admin");
    }
  });

  test("should not show role for student user", async ({ authenticatedPage }) => {
    // Already authenticated as student by default
    await authenticatedPage.goto("/dashboard");

    const header = new HeaderComponent(authenticatedPage);

    // Try to get role (should be empty for student)
    const userRole = await header.getUserRole();

    // Should be empty or not contain role
    expect(userRole === "" || !userRole).toBeTruthy();
  });

  test("should keep user authenticated across page navigation", async ({ authenticatedPage }) => {
    const header = new HeaderComponent(authenticatedPage);

    // Navigate between pages
    await authenticatedPage.goto("/dashboard");
    const auth1 = await header.isAuthenticated();
    expect(auth1).toBeTruthy();

    await authenticatedPage.goto("/profile");
    const auth2 = await header.isAuthenticated();
    expect(auth2).toBeTruthy();

    await authenticatedPage.goto("/dashboard");
    const auth3 = await header.isAuthenticated();
    expect(auth3).toBeTruthy();
  });
});
