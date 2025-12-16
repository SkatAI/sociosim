import { Page, Locator } from "@playwright/test";
import { BasePage } from "./base.page";

/**
 * Page Object for Login Page (/login)
 *
 * Encapsulates all selectors and interactions for the login page.
 * This is the pattern used for all other page objects.
 */
export class LoginPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly passwordToggle: Locator;
  readonly submitButton: Locator;
  readonly errorAlert: Locator;
  readonly successAlert: Locator;
  readonly registerLink: Locator;
  readonly resetPasswordLink: Locator;

  constructor(page: Page) {
    super(page, "/login");

    // Locators for form inputs (using role and accessible attributes when possible)
    this.emailInput = page.locator('input[type="email"]').first();
    this.passwordInput = page.locator('input[type="password"]').first();

    // Password visibility toggle button
    this.passwordToggle = page.getByRole("button").filter({ has: page.locator("svg") }).first();

    // Login submit button - uses "Se connecter" text (French)
    this.submitButton = page.getByRole("button", { name: /se connecter/i });

    // Alert messages
    this.errorAlert = page.locator('[role="alert"]').filter({ hasNot: page.locator("[data-status='success']") });
    this.successAlert = page.locator('[role="alert"]').filter({ has: page.locator("[data-status='success']") });

    // Links on login page
    this.registerLink = page.getByRole("link", { name: /créer un compte/i });
    this.resetPasswordLink = page.getByRole("link", { name: /réinitialiser/i });
  }

  /**
   * Fill login form and submit
   */
  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  /**
   * Fill email field only
   */
  async fillEmail(email: string): Promise<void> {
    await this.emailInput.fill(email);
  }

  /**
   * Fill password field only
   */
  async fillPassword(password: string): Promise<void> {
    await this.passwordInput.fill(password);
  }

  /**
   * Click login button
   */
  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  /**
   * Toggle password visibility
   */
  async togglePasswordVisibility(): Promise<void> {
    await this.passwordToggle.click();
  }

  /**
   * Get the type attribute of password input (password or text)
   */
  async getPasswordInputType(): Promise<string | null> {
    return this.passwordInput.getAttribute("type");
  }

  /**
   * Check if error message is displayed and return text
   */
  async getErrorMessage(): Promise<string> {
    await this.errorAlert.waitFor({ state: "visible", timeout: 10000 });
    return (await this.errorAlert.textContent()) || "";
  }

  /**
   * Check if success message is displayed and return text
   */
  async getSuccessMessage(): Promise<string> {
    await this.successAlert.waitFor({ state: "visible", timeout: 10000 });
    return (await this.successAlert.textContent()) || "";
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
   * Click "Créer un compte" link
   */
  async clickRegisterLink(): Promise<void> {
    await this.registerLink.click();
  }

  /**
   * Click "Réinitialiser" link
   */
  async clickResetPasswordLink(): Promise<void> {
    await this.resetPasswordLink.click();
  }

  /**
   * Get password input value
   */
  async getPasswordValue(): Promise<string | null> {
    return this.passwordInput.inputValue();
  }

  /**
   * Get email input value
   */
  async getEmailValue(): Promise<string | null> {
    return this.emailInput.inputValue();
  }

  /**
   * Check if login button is enabled
   */
  async isSubmitButtonEnabled(): Promise<boolean> {
    return !(await this.submitButton.isDisabled());
  }
}
