import { Page, Locator } from "@playwright/test";
import { BasePage } from "./base.page";

/**
 * Page Object for Dashboard Page (/dashboard)
 *
 * Dashboard contains:
 * - 3 agent cards for starting new interviews
 * - List of past interviews
 */
export class DashboardPage extends BasePage {
  readonly agentCards: Locator;
  readonly interviewList: Locator;
  readonly continueButtons: Locator;

  constructor(page: Page) {
    super(page, "/dashboard");

    // Agent cards - for starting new interviews
    this.agentCards = page.locator('[data-testid="agent-card"]').or(page.locator("button").filter({ hasText: /Interviewer/ }));

    // Interview list items
    this.interviewList = page.locator('[data-testid="interview-item"]').or(page.locator("button").filter({ hasText: /Continuer/ }));

    // Continue interview buttons
    this.continueButtons = page.getByRole("button", { name: /continuer/i });
  }

  /**
   * Get number of agent cards available
   */
  async getAgentCardCount(): Promise<number> {
    return this.agentCards.count();
  }

  /**
   * Get agent card by name (Oriane, Théo, Jade)
   */
  getAgentCard(agentName: string): Locator {
    return this.page.locator(`button:has-text("${agentName}")`).first();
  }

  /**
   * Click on an agent's "Interviewer" button to start new interview
   */
  async startInterviewWithAgent(agentName: string): Promise<void> {
    // Find the agent card and click its Interviewer button
    const agentCard = this.page.locator(`text=${agentName}`).locator("..").locator("button:has-text('Interviewer')").first();
    await agentCard.click();
  }

  /**
   * Get number of previous interviews
   */
  async getInterviewCount(): Promise<number> {
    return this.continueButtons.count();
  }

  /**
   * Click continue on an interview at a specific index
   */
  async continueInterview(index: number = 0): Promise<void> {
    const buttons = this.continueButtons;
    if (index >= (await buttons.count())) {
      throw new Error(`No interview at index ${index}`);
    }
    await buttons.nth(index).click();
  }

  /**
   * Continue the most recent interview (index 0)
   */
  async continueMostRecentInterview(): Promise<void> {
    await this.continueInterview(0);
  }

  /**
   * Get agent name from card (useful for verification)
   */
  async getAgentNames(): Promise<string[]> {
    const names: string[] = [];
    const count = await this.agentCards.count();
    for (let i = 0; i < count; i++) {
      const text = await this.agentCards.nth(i).textContent();
      if (text) names.push(text.trim());
    }
    return names;
  }

  /**
   * Check if "no interviews" message is displayed
   */
  async hasNoInterviewsMessage(): Promise<boolean> {
    try {
      await this.page.locator("text=/aucun|aucune entretien/i").waitFor({ timeout: 3000, state: "visible" });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Wait for interview list to load
   */
  async waitForInterviewListToLoad(): Promise<void> {
    // Wait for either interview list or no-interviews message
    await Promise.race([
      this.page.waitForSelector('[data-testid="interview-item"]', { timeout: 10000 }).catch(() => null),
      this.page.locator("text=/aucun|aucune entretien/i").waitFor({ timeout: 10000 }).catch(() => null),
    ]);
  }

  /**
   * Get dashboard heading/title
   */
  async getDashboardTitle(): Promise<string> {
    return (await this.page.locator("h1, h2").first().textContent()) || "";
  }
}
