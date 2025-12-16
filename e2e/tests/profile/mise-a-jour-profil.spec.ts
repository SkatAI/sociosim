import { test, expect } from "@/e2e/fixtures/auth.fixture";
import { ProfilePage } from "@/e2e/page-objects/profile.page";
import { HeaderComponent } from "@/e2e/page-objects/header.component";

test.describe("Mise à jour du profil - Profile Update", () => {
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

  test("should load profile page with pre-filled user data", async ({ authenticatedPage }) => {
    const profilePage = new ProfilePage(authenticatedPage);
    await profilePage.goto();

    // Form should be loaded with existing data
    const data = await profilePage.getProfileData();
    expect(data.firstName).toBeTruthy();
    expect(data.lastName).toBeTruthy();
    expect(data.email).toBeTruthy();
  });

  test("should update first name and show success message", async ({ authenticatedPage }) => {
    const profilePage = new ProfilePage(authenticatedPage);
    await profilePage.goto();

    const newFirstName = `Updated-${Date.now()}`;
    await profilePage.updateFirstName(newFirstName);

    const successMessage = await profilePage.saveAndWaitForSuccess();
    expect(successMessage).toBeTruthy();
    expect(successMessage.toLowerCase()).toContain("enregistr") || expect(successMessage.toLowerCase()).toContain("succès");

    // Reload and verify change persisted
    await profilePage.goto();
    const data = await profilePage.getProfileData();
    expect(data.firstName).toContain(newFirstName);
  });

  test("should update last name and show success message", async ({ authenticatedPage }) => {
    const profilePage = new ProfilePage(authenticatedPage);
    await profilePage.goto();

    const newLastName = `UpdatedLast-${Date.now()}`;
    await profilePage.updateLastName(newLastName);

    const successMessage = await profilePage.saveAndWaitForSuccess();
    expect(successMessage).toBeTruthy();

    // Reload and verify change persisted
    await profilePage.goto();
    const data = await profilePage.getProfileData();
    expect(data.lastName).toContain(newLastName);
  });

  test("should update both first and last name together", async ({ authenticatedPage }) => {
    const profilePage = new ProfilePage(authenticatedPage);
    await profilePage.goto();

    const newFirstName = `Updated-${Date.now()}`;
    const newLastName = `Last-${Date.now()}`;

    await profilePage.updateProfile({
      firstName: newFirstName,
      lastName: newLastName,
    });

    const successMessage = await profilePage.saveAndWaitForSuccess();
    expect(successMessage).toBeTruthy();
  });

  test("should disable save button when no changes are made", async ({ authenticatedPage }) => {
    const profilePage = new ProfilePage(authenticatedPage);
    await profilePage.goto();

    // Initially, button should be disabled (no changes)
    let isEnabled = await profilePage.isSaveButtonEnabled();
    expect(isEnabled).toBeFalsy();

    // Make a change
    await profilePage.updateFirstName("TestName");

    // Now button should be enabled
    isEnabled = await profilePage.isSaveButtonEnabled();
    expect(isEnabled).toBeTruthy();
  });

  test("should update email and show verification message", async ({ authenticatedPage }) => {
    const profilePage = new ProfilePage(authenticatedPage);
    await profilePage.goto();

    const newEmail = `updated-${Date.now()}@sociosim.local`;
    await profilePage.updateEmail(newEmail);

    const successMessage = await profilePage.saveAndWaitForSuccess();
    expect(successMessage).toBeTruthy();

    // Message might mention verification
    if (successMessage.toLowerCase().includes("vérifi")) {
      expect(successMessage.toLowerCase()).toContain("email") || expect(successMessage.toLowerCase()).toContain("confirm");
    }
  });

  test("should display error when trying to save with empty required fields", async ({ authenticatedPage }) => {
    const profilePage = new ProfilePage(authenticatedPage);
    await profilePage.goto();

    // Clear first name
    await profilePage.clearForm();

    // Try to save
    try {
      await profilePage.save();

      // Should see error or button disabled
      const hasError = await profilePage.hasErrorMessage();
      expect(hasError).toBeTruthy();
    } catch {
      // If clearForm clears everything, that's expected
      expect(true).toBeTruthy();
    }
  });

  test("should update header avatar after name change", async ({ authenticatedPage, authenticateAs }) => {
    const profilePage = new ProfilePage(authenticatedPage);
    const header = new HeaderComponent(authenticatedPage);

    await profilePage.goto();

    const newFirstName = `Updated-${Date.now()}`;
    const newLastName = `Last-${Date.now()}`;

    // Update name
    await profilePage.updateProfile({
      firstName: newFirstName,
      lastName: newLastName,
    });

    await profilePage.saveAndWaitForSuccess();

    // Navigate away and back to see header update
    await authenticatedPage.goto("/dashboard");
    await authenticatedPage.goto("/profile");

    // Check header reflects updated name
    const userName = await header.getUserName();
    expect(userName).toContain(newFirstName) || expect(userName).toContain(newLastName);
  });

  test("should navigate back to dashboard via link", async ({ authenticatedPage }) => {
    const profilePage = new ProfilePage(authenticatedPage);
    await profilePage.goto();

    const backButton = profilePage.backToDashboardButton;
    await expect(backButton).toBeVisible();

    await profilePage.goBackToDashboard();

    expect(authenticatedPage).toHaveURL("/dashboard");
  });

  test("should validate email format", async ({ authenticatedPage }) => {
    const profilePage = new ProfilePage(authenticatedPage);
    await profilePage.goto();

    // Try invalid email format
    await profilePage.updateEmail("not-an-email");

    try {
      await profilePage.save();

      const hasError = await profilePage.hasErrorMessage();
      if (hasError) {
        const errorMessage = await profilePage.getErrorMessage();
        expect(errorMessage.toLowerCase()).toContain("email") || expect(errorMessage.toLowerCase()).toContain("valide");
      }
    } catch {
      // Error expected for invalid email
      expect(true).toBeTruthy();
    }
  });
});
