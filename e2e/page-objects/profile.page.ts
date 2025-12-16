import { Page, Locator } from "@playwright/test";
import { BasePage } from "./base.page";

/**
 * Page Object for Profile Page (/profile)
 *
 * Profile page allows user to:
 * - Edit firstName, lastName, email
 * - Save changes
 * - See success/error messages
 */
export class ProfilePage extends BasePage {
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly emailInput: Locator;
  readonly saveButton: Locator;
  readonly successAlert: Locator;
  readonly errorAlert: Locator;
  readonly backToDashboardButton: Locator;

  constructor(page: Page) {
    super(page, "/profile");

    // Form inputs - may have labels
    this.firstNameInput = page
      .locator('input[placeholder*="Prénom"]')
      .or(page.locator('label:has-text("Prénom") ~ input'))
      .or(page.locator("input").first());

    this.lastNameInput = page
      .locator('input[placeholder*="Nom"]')
      .or(page.locator('label:has-text("Nom") ~ input'))
      .or(page.locator("input").nth(1));

    this.emailInput = page.locator('input[type="email"]');

    // Save button - may be disabled initially
    this.saveButton = page.getByRole("button", { name: /enregistrer|sauvegarder/i });

    // Alert messages
    this.successAlert = page.locator('[role="alert"]').filter({ has: page.locator("[data-status='success']") });
    this.errorAlert = page.locator('[role="alert"]').filter({ hasNot: page.locator("[data-status='success']") });

    // Navigation
    this.backToDashboardButton = page.getByRole("link", { name: /retour|tableau de bord|dashboard/i });
  }

  /**
   * Update first name
   */
  async updateFirstName(firstName: string): Promise<void> {
    await this.firstNameInput.clear();
    await this.firstNameInput.fill(firstName);
  }

  /**
   * Update last name
   */
  async updateLastName(lastName: string): Promise<void> {
    await this.lastNameInput.clear();
    await this.lastNameInput.fill(lastName);
  }

  /**
   * Update email
   */
  async updateEmail(email: string): Promise<void> {
    await this.emailInput.clear();
    await this.emailInput.fill(email);
  }

  /**
   * Update multiple fields at once
   */
  async updateProfile(updates: { firstName?: string; lastName?: string; email?: string }): Promise<void> {
    if (updates.firstName) await this.updateFirstName(updates.firstName);
    if (updates.lastName) await this.updateLastName(updates.lastName);
    if (updates.email) await this.updateEmail(updates.email);
  }

  /**
   * Save profile changes
   */
  async save(): Promise<void> {
    await this.saveButton.click();
  }

  /**
   * Save changes and wait for success message
   */
  async saveAndWaitForSuccess(): Promise<string> {
    await this.save();
    await this.successAlert.waitFor({ state: "visible", timeout: 10000 });
    return (await this.successAlert.textContent()) || "";
  }

  /**
   * Get success message
   */
  async getSuccessMessage(): Promise<string> {
    await this.successAlert.waitFor({ state: "visible", timeout: 10000 });
    return (await this.successAlert.textContent()) || "";
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
   * Check if save button is enabled
   */
  async isSaveButtonEnabled(): Promise<boolean> {
    return !(await this.saveButton.isDisabled());
  }

  /**
   * Get current form values
   */
  async getProfileData(): Promise<{ firstName: string; lastName: string; email: string }> {
    return {
      firstName: (await this.firstNameInput.inputValue()) || "",
      lastName: (await this.lastNameInput.inputValue()) || "",
      email: (await this.emailInput.inputValue()) || "",
    };
  }

  /**
   * Click back to dashboard link
   */
  async goBackToDashboard(): Promise<void> {
    await this.backToDashboardButton.click();
  }

  /**
   * Clear form completely
   */
  async clearForm(): Promise<void> {
    await this.firstNameInput.clear();
    await this.lastNameInput.clear();
    await this.emailInput.clear();
  }
}
