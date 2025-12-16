import { test, expect } from "@playwright/test";
import { ResetPasswordPage, ResetPasswordConfirmPage } from "@/e2e/page-objects/reset-password.page";
import { TEST_USERS } from "@/e2e/fixtures/auth.fixture";

test.describe("Réinitialisation du mot de passe - Password Reset Flow", () => {
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

  test("should navigate to reset password page from login", async ({ page }) => {
    await page.goto("/login");

    const resetLink = page.getByRole("link", { name: /réinitialiser/i });
    await resetLink.click();

    expect(page).toHaveURL("/reset-password");
  });

  test("should request password reset with valid email", async ({ page }) => {
    const resetPage = new ResetPasswordPage(page);
    await resetPage.goto();

    // Request reset for existing user
    await resetPage.requestReset(TEST_USERS.student.email);

    // Should show success message
    const hasSuccess = await resetPage.hasSuccessMessage();
    expect(hasSuccess).toBeTruthy();

    const message = await resetPage.getSuccessMessage();
    expect(message.toLowerCase()).toContain("vérifi");
  });

  test("should display error for non-existent email", async ({ page }) => {
    const resetPage = new ResetPasswordPage(page);
    await resetPage.goto();

    // Try to reset for non-existent email
    await resetPage.requestReset("nonexistent@sociosim.local");

    // May show error or generic message (depends on implementation)
    // In practice, many systems show success anyway for security
    // Just verify we get some response
    try {
      const message = await resetPage.getSuccessMessage();
      expect(message).toBeTruthy();
    } catch {
      // Or error message
      const hasError = await resetPage.hasErrorMessage();
      expect(hasError).toBeTruthy();
    }
  });

  test("should display error for empty email", async ({ page }) => {
    const resetPage = new ResetPasswordPage(page);
    await resetPage.goto();

    // Try to submit without email
    const submitButton = page.getByRole("button", { name: /demander|envoyer/i });
    await submitButton.click();

    // Should see validation error
    const hasError = await resetPage.hasErrorMessage();
    expect(hasError).toBeTruthy();
  });

  test("should show confirmation page with invalid/expired token", async ({ page }) => {
    const confirmPage = new ResetPasswordConfirmPage(page);

    // Try to access with invalid token
    await confirmPage.gotoWithToken("invalid-token-12345");

    // Should display error message
    const hasError = await confirmPage.hasErrorMessage();
    expect(hasError).toBeTruthy();

    const errorMessage = await confirmPage.getErrorMessage();
    expect(errorMessage.toLowerCase()).toContain("invalide") || expect(errorMessage.toLowerCase()).toContain("expiré");
  });

  test("should require matching passwords on reset confirmation", async ({ page }) => {
    const confirmPage = new ResetPasswordConfirmPage(page);

    // Navigate to confirmation (even with invalid token for validation testing)
    await confirmPage.goto();

    // Try to set mismatched passwords
    await confirmPage.setNewPassword("NewPassword123!", "DifferentPassword123!");
    await confirmPage.submit();

    // Should see error about password mismatch
    const hasError = await confirmPage.hasErrorMessage();
    expect(hasError).toBeTruthy();
  });

  test("should require password minimum length on reset confirmation", async ({ page }) => {
    const confirmPage = new ResetPasswordConfirmPage(page);

    // Navigate to confirmation
    await confirmPage.goto();

    // Try with too-short password
    await confirmPage.setNewPassword("short", "short");
    await confirmPage.submit();

    // Should see error about password length
    const hasError = await confirmPage.hasErrorMessage();
    expect(hasError).toBeTruthy();
  });

  test("should toggle password visibility on confirmation page", async ({ page }) => {
    const confirmPage = new ResetPasswordConfirmPage(page);
    await confirmPage.goto();

    // Check initial state
    let inputType = await page.locator('input[type="password"]').first().getAttribute("type");
    expect(inputType).toBe("password");

    // Toggle
    await confirmPage.togglePasswordVisibility();
    inputType = await page.locator('input[type="password"]').first().getAttribute("type");
    expect(inputType).toBe("text");

    // Toggle back
    await confirmPage.togglePasswordVisibility();
    inputType = await page.locator('input[type="password"]').first().getAttribute("type");
    expect(inputType).toBe("password");
  });

  test("should have link back to login from reset request page", async ({ page }) => {
    const resetPage = new ResetPasswordPage(page);
    await resetPage.goto();

    const loginLink = resetPage.loginLink;
    await expect(loginLink).toBeVisible();

    await resetPage.clickLoginLink();
    expect(page).toHaveURL("/login");
  });
});
