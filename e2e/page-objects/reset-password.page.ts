import { Page, Locator } from "@playwright/test";
import { BasePage } from "./base.page";

/**
 * Page Object for Password Reset Request Page (/reset-password)
 */
export class ResetPasswordPage extends BasePage {
  readonly emailInput: Locator;
  readonly submitButton: Locator;
  readonly successAlert: Locator;
  readonly errorAlert: Locator;
  readonly loginLink: Locator;

  constructor(page: Page) {
    super(page, "/reset-password");

    this.emailInput = page.locator('input[type="email"]');
    this.submitButton = page.getByRole("button", { name: /demander|envoyer|réinitialiser/i });
    this.successAlert = page.locator('[role="alert"]').filter({ has: page.locator("[data-status='success']") });
    this.errorAlert = page.locator('[role="alert"]').filter({ hasNot: page.locator("[data-status='success']") });
    this.loginLink = page.getByRole("link", { name: /connexion|se connecter/i });
  }

  /**
   * Request password reset for an email
   */
  async requestReset(email: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.submitButton.click();
  }

  /**
   * Get success message
   */
  async getSuccessMessage(): Promise<string> {
    await this.successAlert.waitFor({ state: "visible", timeout: 10000 });
    return (await this.successAlert.textContent()) || "";
  }

  /**
   * Get error message
   */
  async getErrorMessage(): Promise<string> {
    await this.errorAlert.waitFor({ state: "visible", timeout: 10000 });
    return (await this.errorAlert.textContent()) || "";
  }

  /**
   * Check if success message exists
   */
  async hasSuccessMessage(): Promise<boolean> {
    try {
      await this.successAlert.waitFor({ state: "visible", timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if error message exists
   */
  async hasErrorMessage(): Promise<boolean> {
    try {
      await this.errorAlert.waitFor({ state: "visible", timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Click login link
   */
  async clickLoginLink(): Promise<void> {
    await this.loginLink.click();
  }
}

/**
 * Page Object for Password Reset Confirmation Page (/reset-password/confirm)
 */
export class ResetPasswordConfirmPage extends BasePage {
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly passwordToggle: Locator;
  readonly confirmPasswordToggle: Locator;
  readonly submitButton: Locator;
  readonly successAlert: Locator;
  readonly errorAlert: Locator;

  constructor(page: Page) {
    super(page, "/reset-password/confirm");

    this.passwordInput = page.locator('input[type="password"]').first();
    this.confirmPasswordInput = page.locator('input[type="password"]').last();

    const toggleButtons = page.getByRole("button").filter({ has: page.locator("svg") });
    this.passwordToggle = toggleButtons.nth(0);
    this.confirmPasswordToggle = toggleButtons.nth(1);

    this.submitButton = page.getByRole("button", { name: /réinitialiser|confirmer|envoyer/i });
    this.successAlert = page.locator('[role="alert"]').filter({ has: page.locator("[data-status='success']") });
    this.errorAlert = page.locator('[role="alert"]').filter({ hasNot: page.locator("[data-status='success']") });
  }

  /**
   * Navigate to confirm page with token
   */
  async gotoWithToken(token: string): Promise<void> {
    await this.page.goto(`/reset-password/confirm?token=${token}`);
  }

  /**
   * Set new password
   */
  async setNewPassword(password: string, confirmPassword: string): Promise<void> {
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(confirmPassword);
  }

  /**
   * Submit the form
   */
  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  /**
   * Set password and submit
   */
  async setPasswordAndSubmit(password: string, confirmPassword: string): Promise<void> {
    await this.setNewPassword(password, confirmPassword);
    await this.submit();
  }

  /**
   * Get success message
   */
  async getSuccessMessage(): Promise<string> {
    await this.successAlert.waitFor({ state: "visible", timeout: 10000 });
    return (await this.successAlert.textContent()) || "";
  }

  /**
   * Get error message
   */
  async getErrorMessage(): Promise<string> {
    await this.errorAlert.waitFor({ state: "visible", timeout: 10000 });
    return (await this.errorAlert.textContent()) || "";
  }

  /**
   * Check if error message exists (e.g., invalid/expired token)
   */
  async hasErrorMessage(): Promise<boolean> {
    try {
      await this.errorAlert.waitFor({ state: "visible", timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Toggle password visibility
   */
  async togglePasswordVisibility(): Promise<void> {
    await this.passwordToggle.click();
  }

  /**
   * Toggle confirm password visibility
   */
  async toggleConfirmPasswordVisibility(): Promise<void> {
    await this.confirmPasswordToggle.click();
  }
}
