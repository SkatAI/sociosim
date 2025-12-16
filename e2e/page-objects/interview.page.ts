import { Page, Locator } from "@playwright/test";
import { BasePage } from "./base.page";

/**
 * Page Object for Interview Page (/interview and /interview/[id])
 *
 * Interview page handles:
 * - Displaying chat messages (user and AI)
 * - Message input and sending
 * - Keyboard shortcuts (Enter to send, Shift+Enter for newline)
 * - Stream handling for AI responses
 */
export class InterviewPage extends BasePage {
  readonly messageInput: Locator;
  readonly sendButton: Locator;
  readonly messagesContainer: Locator;
  readonly userMessages: Locator;
  readonly assistantMessages: Locator;
  readonly interviewTitle: Locator;
  readonly emptyStateMessage: Locator;
  readonly loadingIndicator: Locator;

  constructor(page: Page) {
    super(page, "/interview");

    // Message input - typically a textarea
    this.messageInput = page.locator("textarea").first().or(page.locator('input[placeholder*="message" i]').first());

    // Send button - may be labeled "Envoyer", "Send", or have an icon
    this.sendButton = page.getByRole("button", { name: /envoyer|send/i }).or(page.locator("button:has-text('→')").first());

    // Messages container
    this.messagesContainer = page.locator('[role="log"]').or(page.locator("div").filter({ has: page.locator("[role='article']") }).first());

    // Individual messages (user and assistant)
    this.userMessages = page.locator('[data-role="user"]').or(page.locator('div:has-text("[Vous]")'));
    this.assistantMessages = page.locator('[data-role="assistant"]').or(page.locator('div:has-text("[Assistant]")'));

    // Interview header with agent name
    this.interviewTitle = page.locator("h1, h2").first();

    // Empty state when no messages
    this.emptyStateMessage = page.locator("text=/commencer|démarrer|aucun message/i");

    // Loading indicator
    this.loadingIndicator = page.locator('[role="status"]').or(page.locator("div").filter({ has: page.locator("svg") }));
  }

  /**
   * Navigate to interview with ID
   */
  async gotoInterview(interviewId: string): Promise<void> {
    await this.page.goto(`/interview/${interviewId}`);
  }

  /**
   * Navigate to new interview
   */
  async gotoNewInterview(): Promise<void> {
    await this.goto();
  }

  /**
   * Type a message in the input (without sending)
   */
  async typeMessage(message: string): Promise<void> {
    await this.messageInput.fill(message);
  }

  /**
   * Send a message (click send button)
   */
  async sendMessage(): Promise<void> {
    await this.sendButton.click();
  }

  /**
   * Type and send a message in one action
   */
  async sendAndWaitForResponse(message: string): Promise<void> {
    await this.typeMessage(message);

    // Listen for new assistant message
    const initialCount = await this.assistantMessages.count();

    // Send message
    await this.sendMessage();

    // Wait for new assistant message
    await this.page.waitForFunction(
      (prevCount: number) => {
        const messages = document.querySelectorAll('[data-role="assistant"]');
        return messages.length > prevCount;
      },
      initialCount,
      { timeout: 30000 }
    );
  }

  /**
   * Send message using Enter key
   */
  async sendMessageWithEnter(message: string): Promise<void> {
    await this.typeMessage(message);
    await this.messageInput.press("Enter");
  }

  /**
   * Add a newline using Shift+Enter
   */
  async addNewlineWithShiftEnter(): Promise<void> {
    await this.messageInput.press("Shift+Enter");
  }

  /**
   * Get all user messages
   */
  async getUserMessages(): Promise<string[]> {
    return this.userMessages.allTextContents();
  }

  /**
   * Get all assistant messages
   */
  async getAssistantMessages(): Promise<string[]> {
    return this.assistantMessages.allTextContents();
  }

  /**
   * Get message count (user + assistant)
   */
  async getTotalMessageCount(): Promise<number> {
    const userCount = await this.userMessages.count();
    const assistantCount = await this.assistantMessages.count();
    return userCount + assistantCount;
  }

  /**
   * Check if interview is empty (no messages)
   */
  async isEmptyState(): Promise<boolean> {
    try {
      await this.emptyStateMessage.waitFor({ timeout: 2000, state: "visible" });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get interview title (agent name)
   */
  async getInterviewTitle(): Promise<string> {
    return (await this.interviewTitle.textContent()) || "";
  }

  /**
   * Wait for messages to load
   */
  async waitForMessagesToLoad(): Promise<void> {
    await this.messagesContainer.waitFor({ state: "visible", timeout: 10000 });
  }

  /**
   * Check if "(reprise)" indicator is present (for resumed interviews)
   */
  async hasRepriseIndicator(): Promise<boolean> {
    try {
      await this.page.locator("text=(reprise)").waitFor({ timeout: 3000, state: "visible" });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clear message input
   */
  async clearInput(): Promise<void> {
    await this.messageInput.clear();
  }

  /**
   * Get current input value
   */
  async getInputValue(): Promise<string> {
    return (await this.messageInput.inputValue()) || "";
  }

  /**
   * Check if input is disabled (e.g., during streaming)
   */
  async isInputDisabled(): Promise<boolean> {
    return await this.messageInput.isDisabled();
  }

  /**
   * Check if send button is disabled (e.g., during streaming)
   */
  async isSendButtonDisabled(): Promise<boolean> {
    return await this.sendButton.isDisabled();
  }

  /**
   * Scroll to bottom of messages
   */
  async scrollToBottom(): Promise<void> {
    await this.messagesContainer.evaluate((el: HTMLElement) => {
      el.scrollTop = el.scrollHeight;
    });
  }

  /**
   * Get the last message (most recent)
   */
  async getLastMessage(): Promise<string> {
    const allMessages = [
      ...(await this.userMessages.allTextContents()),
      ...(await this.assistantMessages.allTextContents()),
    ];
    return allMessages[allMessages.length - 1] || "";
  }
}
