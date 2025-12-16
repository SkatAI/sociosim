import { Page, Locator } from "@playwright/test";

/**
 * Component Page Object for Header
 *
 * The header is used across multiple pages and contains:
 * - User avatar with initials
 * - Popover menu with profile options
 * - Logout button
 */
export class HeaderComponent {
  readonly avatar: Locator;
  readonly popover: Locator;
  readonly profileLink: Locator;
  readonly dashboardLink: Locator;
  readonly logoutButton: Locator;
  readonly userName: Locator;
  readonly userEmail: Locator;
  readonly userRole: Locator;

  constructor(page: Page) {
    this.avatar = page.locator("button").filter({ has: page.locator("span") }).first(); // Avatar button with initials

    // Popover menu - appears on avatar click
    this.popover = page.locator('[role="dialog"]').or(page.locator('[role="region"]').filter({ has: page.locator("text=/profil|email/i") }));

    // Links within popover
    this.profileLink = page.getByRole("link", { name: /profil|modifier/i });
    this.dashboardLink = page.getByRole("link", { name: /tableau de bord|dashboard/i });

    // Logout button
    this.logoutButton = page.getByRole("button", { name: /déconnexion|logout|se déconnecter/i });

    // User info in popover
    this.userName = page.locator("text=/[A-Z][a-z]+ [A-Z][a-z]+/").first();
    this.userEmail = page.locator('text=@sociosim.local');
    this.userRole = page.locator("text=/(étudiant|enseignant|admin|student|teacher)/i");
  }

  /**
   * Click the avatar to open popover menu
   */
  async openMenu(): Promise<void> {
    await this.avatar.click();
  }

  /**
   * Check if popover is open
   */
  async isMenuOpen(): Promise<boolean> {
    try {
      await this.popover.waitFor({ state: "visible", timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Open menu and get user name
   */
  async getUserName(): Promise<string> {
    await this.openMenu();
    await this.userName.waitFor({ state: "visible", timeout: 5000 });
    return (await this.userName.textContent()) || "";
  }

  /**
   * Get user email
   */
  async getUserEmail(): Promise<string> {
    await this.openMenu();
    await this.userEmail.waitFor({ state: "visible", timeout: 5000 });
    return (await this.userEmail.textContent()) || "";
  }

  /**
   * Get user role (if teacher/admin)
   */
  async getUserRole(): Promise<string> {
    try {
      await this.openMenu();
      await this.userRole.waitFor({ state: "visible", timeout: 3000 });
      return (await this.userRole.textContent()) || "";
    } catch {
      return ""; // Role not displayed (student)
    }
  }

  /**
   * Click on "Modifier le profil" link
   */
  async clickModifyProfile(): Promise<void> {
    await this.openMenu();
    await this.profileLink.click();
  }

  /**
   * Click on "Tableau de bord" link
   */
  async clickDashboard(): Promise<void> {
    await this.openMenu();
    await this.dashboardLink.click();
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    await this.openMenu();
    await this.logoutButton.click();
  }

  /**
   * Close menu by clicking elsewhere
   */
  async closeMenu(page: Page): Promise<void> {
    // Click outside the popover
    await page.click("body", { position: { x: 0, y: 0 } });
  }

  /**
   * Check if user is authenticated (avatar visible)
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      await this.avatar.waitFor({ timeout: 3000, state: "visible" });
      return true;
    } catch {
      return false;
    }
  }
}
