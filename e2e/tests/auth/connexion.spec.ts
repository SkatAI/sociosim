import { test, expect } from "@/e2e/fixtures/auth.fixture";
import { LoginPage } from "@/e2e/page-objects/login.page";
import { TEST_USERS } from "@/e2e/fixtures/auth.fixture";

test.describe("Connexion - Authentication Flow", () => {
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

  test("should log in with valid credentials and redirect to dashboard", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Fill and submit login form
    await loginPage.login(TEST_USERS.student.email, TEST_USERS.student.password);

    // Should redirect to dashboard
    await loginPage.waitForURL("/dashboard");
    expect(loginPage.getURL()).toContain("/dashboard");
  });

  test("should display error with invalid credentials", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Attempt login with wrong password
    await loginPage.login(TEST_USERS.student.email, "WrongPassword123!");

    // Should see error message
    const errorMessage = await loginPage.getErrorMessage();
    expect(errorMessage).toBeTruthy();
    expect(errorMessage.toLowerCase()).toContain("incorrect");
  });

  test("should display success message after registration (?signup=success)", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.gotoWithParams({ signup: "success" });

    // Should see success message
    const successMessage = await loginPage.getSuccessMessage();
    expect(successMessage).toBeTruthy();
    expect(successMessage.toLowerCase()).toContain("créé");
  });

  test("should display success message after password reset (?password=reset)", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.gotoWithParams({ password: "reset" });

    // Should see success message
    const successMessage = await loginPage.getSuccessMessage();
    expect(successMessage).toBeTruthy();
    expect(successMessage.toLowerCase()).toContain("réinitialis");
  });

  test("should toggle password visibility", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Initial state should be password type
    let inputType = await loginPage.getPasswordInputType();
    expect(inputType).toBe("password");

    // Toggle visibility
    await loginPage.togglePasswordVisibility();

    // Should now be text type (visible)
    inputType = await loginPage.getPasswordInputType();
    expect(inputType).toBe("text");

    // Toggle back
    await loginPage.togglePasswordVisibility();

    // Should be password again
    inputType = await loginPage.getPasswordInputType();
    expect(inputType).toBe("password");
  });

  test("should have links to registration and password reset", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Check registration link exists
    const registerLink = loginPage.registerLink;
    await expect(registerLink).toBeVisible();

    // Check reset password link exists
    const resetLink = loginPage.resetPasswordLink;
    await expect(resetLink).toBeVisible();
  });

  test("should clear form on page reload", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Fill form
    await loginPage.fillEmail("test@example.com");
    await loginPage.fillPassword("testpassword");

    // Reload page
    await page.reload();

    // Form should be empty
    const emailValue = await loginPage.getEmailValue();
    const passwordValue = await loginPage.getPasswordValue();

    expect(emailValue).toBe("");
    expect(passwordValue).toBe("");
  });

  test("should disable submit button initially then enable when form is filled", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Check initial state
    let isEnabled = await loginPage.isSubmitButtonEnabled();
    expect(isEnabled).toBeFalsy();

    // Fill email
    await loginPage.fillEmail(TEST_USERS.student.email);

    // Should still be disabled (password missing)
    isEnabled = await loginPage.isSubmitButtonEnabled();
    expect(isEnabled).toBeFalsy();

    // Fill password
    await loginPage.fillPassword(TEST_USERS.student.password);

    // Should now be enabled
    isEnabled = await loginPage.isSubmitButtonEnabled();
    expect(isEnabled).toBeTruthy();
  });
});
