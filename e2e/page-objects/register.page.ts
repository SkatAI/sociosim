import { Page, Locator } from "@playwright/test";
import { BasePage } from "./base.page";

/**
 * Page Object for Registration Page (/register)
 */
export class RegisterPage extends BasePage {
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly passwordToggle: Locator;
  readonly confirmPasswordToggle: Locator;
  readonly submitButton: Locator;
  readonly errorAlert: Locator;
  readonly successAlert: Locator;
  readonly loginLink: Locator;

  constructor(page: Page) {
    super(page, "/register");

    // Form inputs
    this.firstNameInput = page.locator('input[placeholder*="Prénom"]').or(page.locator("input").nth(0));
    this.lastNameInput = page.locator('input[placeholder*="Nom"]').or(page.locator("input").nth(1));
    this.emailInput = page.locator('input[type="email"]');
    this.passwordInput = page.locator('input[type="password"]').first();
    this.confirmPasswordInput = page.locator('input[type="password"]').last();

    // Password visibility toggles
    const toggleButtons = page.getByRole("button").filter({ has: page.locator("svg") });
    this.passwordToggle = toggleButtons.nth(0);
    this.confirmPasswordToggle = toggleButtons.nth(1);

    // Submit and error/success alerts
    this.submitButton = page.getByRole("button", { name: /créer un compte|s'enregistrer/i });
    this.errorAlert = page.locator('[role="alert"]').filter({ hasNot: page.locator("[data-status='success']") });
    this.successAlert = page.locator('[role="alert"]').filter({ has: page.locator("[data-status='success']") });

    // Navigation link
    this.loginLink = page.getByRole("link", { name: /se connecter|connexion/i });
  }

  /**
   * Fill the entire registration form and submit
   */
  async register(firstName: string, lastName: string, email: string, password: string, confirmPassword: string): Promise<void> {
    await this.fillFirstName(firstName);
    await this.fillLastName(lastName);
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.fillConfirmPassword(confirmPassword);
    await this.submit();
  }

  /**
   * Fill first name field
   */
  async fillFirstName(firstName: string): Promise<void> {
    await this.firstNameInput.fill(firstName);
  }

  /**
   * Fill last name field
   */
  async fillLastName(lastName: string): Promise<void> {
    await this.lastNameInput.fill(lastName);
  }

  /**
   * Fill email field
   */
  async fillEmail(email: string): Promise<void> {
    await this.emailInput.fill(email);
  }

  /**
   * Fill password field
   */
  async fillPassword(password: string): Promise<void> {
    await this.passwordInput.fill(password);
  }

  /**
   * Fill confirm password field
   */
  async fillConfirmPassword(password: string): Promise<void> {
    await this.confirmPasswordInput.fill(password);
  }

  /**
   * Submit the registration form
   */
  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  /**
   * Get error message
   */
  async getErrorMessage(): Promise<string> {
    await this.errorAlert.waitFor({ state: "visible", timeout: 10000 });
    return (await this.errorAlert.textContent()) || "";
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
   * Get all error messages (may be multiple for different fields)
   */
  async getErrorMessages(): Promise<string[]> {
    const alerts = this.page.locator('[role="alert"]').filter({ hasNot: this.page.locator("[data-status='success']") });
    return (await alerts.allTextContents()).filter((text) => text.trim().length > 0);
  }

  /**
   * Click the login link
   */
  async clickLoginLink(): Promise<void> {
    await this.loginLink.click();
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

  /**
   * Check if submit button is enabled
   */
  async isSubmitButtonEnabled(): Promise<boolean> {
    return !(await this.submitButton.isDisabled());
  }

  /**
   * Get form input values
   */
  async getFormValues(): Promise<{
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }> {
    return {
      firstName: (await this.firstNameInput.inputValue()) || "",
      lastName: (await this.lastNameInput.inputValue()) || "",
      email: (await this.emailInput.inputValue()) || "",
      password: (await this.passwordInput.inputValue()) || "",
    };
  }
}
