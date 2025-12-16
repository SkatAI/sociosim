import { test, expect } from "@playwright/test";
import { RegisterPage } from "@/e2e/page-objects/register.page";
import { LoginPage } from "@/e2e/page-objects/login.page";

test.describe("Inscription - User Registration Flow", () => {
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

  test("should create account with valid data and redirect to login", async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    // Create unique email to avoid conflicts
    const email = `test-${Date.now()}@sociosim.local`;

    // Register with valid data
    await registerPage.register("John", "Doe", email, "ValidPassword123!", "ValidPassword123!");

    // Should redirect to login with success message
    await registerPage.waitForURL(/\/login/);
    const loginPage = new LoginPage(page);
    const successMessage = await loginPage.getSuccessMessage();
    expect(successMessage.toLowerCase()).toContain("créé");
  });

  test("should display error when submitting with empty fields", async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    // Try to submit without filling form
    await registerPage.submit();

    // Should see validation errors
    const hasError = await registerPage.hasErrorMessage();
    expect(hasError).toBeTruthy();
  });

  test("should display error for invalid email format", async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    // Fill with invalid email
    await registerPage.register("John", "Doe", "not-an-email", "ValidPassword123!", "ValidPassword123!");

    // Should see email validation error
    const errorMessages = await registerPage.getErrorMessages();
    const hasEmailError = errorMessages.some((msg) => msg.toLowerCase().includes("email") || msg.toLowerCase().includes("valide"));
    expect(hasEmailError).toBeTruthy();
  });

  test("should display error for password too short", async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    // Fill with short password
    const email = `test-${Date.now()}@sociosim.local`;
    await registerPage.register("John", "Doe", email, "short", "short");

    // Should see password length error
    const errorMessages = await registerPage.getErrorMessages();
    const hasPasswordError = errorMessages.some((msg) => msg.toLowerCase().includes("minimum") || msg.toLowerCase().includes("caractères"));
    expect(hasPasswordError).toBeTruthy();
  });

  test("should display error when passwords do not match", async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    // Fill with mismatched passwords
    const email = `test-${Date.now()}@sociosim.local`;
    await registerPage.fillFirstName("John");
    await registerPage.fillLastName("Doe");
    await registerPage.fillEmail(email);
    await registerPage.fillPassword("ValidPassword123!");
    await registerPage.fillConfirmPassword("DifferentPassword123!");
    await registerPage.submit();

    // Should see password mismatch error
    const errorMessages = await registerPage.getErrorMessages();
    const hasMatchError = errorMessages.some((msg) => msg.toLowerCase().includes("correspond") || msg.toLowerCase().includes("match"));
    expect(hasMatchError).toBeTruthy();
  });

  test("should toggle password visibility for both fields", async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    // Check initial state
    let type = await page.locator('input[type="password"]').first().getAttribute("type");
    expect(type).toBe("password");

    // Toggle first password field
    await registerPage.togglePasswordVisibility();
    type = await page.locator('input[type="password"]').first().getAttribute("type");
    expect(type).toBe("text");

    // Toggle back
    await registerPage.togglePasswordVisibility();
    type = await page.locator('input[type="password"]').first().getAttribute("type");
    expect(type).toBe("password");
  });

  test("should have link to login page", async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    // Check login link exists
    const loginLink = registerPage.loginLink;
    await expect(loginLink).toBeVisible();

    // Click it
    await registerPage.clickLoginLink();
    await expect(page).toHaveURL(/\/login/);
  });

  test("should clear form on page reload", async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    // Fill form
    await registerPage.fillFirstName("John");
    await registerPage.fillLastName("Doe");
    await registerPage.fillEmail("test@example.com");
    await registerPage.fillPassword("password");
    await registerPage.fillConfirmPassword("password");

    // Reload
    await page.reload();

    // Form should be empty
    const data = await registerPage.getFormValues();
    expect(data.firstName).toBe("");
    expect(data.lastName).toBe("");
    expect(data.email).toBe("");
    expect(data.password).toBe("");
  });

  test("should disable submit button when form is invalid", async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    // Check initial state - should be disabled
    let isEnabled = await registerPage.isSubmitButtonEnabled();
    expect(isEnabled).toBeFalsy();

    // Fill only firstName - should still be disabled
    await registerPage.fillFirstName("John");
    isEnabled = await registerPage.isSubmitButtonEnabled();
    expect(isEnabled).toBeFalsy();

    // Fill all fields with valid data
    const email = `test-${Date.now()}@sociosim.local`;
    await registerPage.fillLastName("Doe");
    await registerPage.fillEmail(email);
    await registerPage.fillPassword("ValidPassword123!");
    await registerPage.fillConfirmPassword("ValidPassword123!");

    // Now should be enabled
    isEnabled = await registerPage.isSubmitButtonEnabled();
    expect(isEnabled).toBeTruthy();
  });
});
