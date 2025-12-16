import { Page } from "@playwright/test";

/**
 * Base Page Object
 *
 * Provides common functionality for all page objects.
 * All page object classes should extend this base class.
 */
export class BasePage {
  constructor(
    protected page: Page,
    protected path: string
  ) {}

  /**
   * Navigate to this page
   */
  async goto(): Promise<void> {
    await this.page.goto(this.path);
  }

  /**
   * Navigate to path with optional query params
   */
  async gotoWithParams(params?: Record<string, string>): Promise<void> {
    let url = this.path;
    if (params) {
      const queryString = new URLSearchParams(params).toString();
      url += `?${queryString}`;
    }
    await this.page.goto(url);
  }

  /**
   * Get current URL
   */
  getURL(): string {
    return this.page.url();
  }

  /**
   * Wait for navigation to a specific URL
   */
  async waitForURL(url: string | RegExp): Promise<void> {
    await this.page.waitForURL(url);
  }

  /**
   * Wait for page to load
   */
  async waitForLoadState(state: "load" | "domcontentloaded" | "networkidle" = "networkidle"): Promise<void> {
    await this.page.waitForLoadState(state);
  }

  /**
   * Take screenshot (saved to test-results/screenshots)
   */
  async takeScreenshot(name: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `${name}-${timestamp}.png`;
    await this.page.screenshot({ path: `test-results/screenshots/${filename}`, fullPage: true });
  }

  /**
   * Get page title
   */
  async getTitle(): Promise<string> {
    return this.page.title();
  }

  /**
   * Wait for element to be visible
   */
  async waitForElement(selector: string, timeout = 10000): Promise<void> {
    await this.page.waitForSelector(selector, { timeout, state: "visible" });
  }

  /**
   * Wait for specific response from API
   */
  async waitForResponse(urlPattern: string | RegExp, timeout = 30000): Promise<void> {
    await this.page.waitForResponse(
      (response) => {
        const url = response.url();
        return typeof urlPattern === "string" ? url.includes(urlPattern) : urlPattern.test(url);
      },
      { timeout }
    );
  }

  /**
   * Check if element exists
   */
  async isElementVisible(selector: string): Promise<boolean> {
    try {
      await this.page.waitForSelector(selector, { timeout: 5000, state: "visible" });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Capture browser console and page errors
   */
  captureErrors(): void {
    this.page.on("console", (msg) => {
      if (msg.type() === "error") {
        console.error(`[Browser Console Error]: ${msg.text()}`);
      }
    });

    this.page.on("pageerror", (error) => {
      console.error(`[Page Error]: ${error.message}`);
    });
  }
}
