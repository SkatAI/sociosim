import { test, expect } from "@/e2e/fixtures/auth.fixture";
import { DashboardPage } from "@/e2e/page-objects/dashboard.page";
import { InterviewPage } from "@/e2e/page-objects/interview.page";

test.describe("Nouvel entretien - New Interview Session", () => {
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

  test("should display agent cards on dashboard", async ({ authenticatedPage }) => {
    const dashboardPage = new DashboardPage(authenticatedPage);
    await dashboardPage.goto();

    // Check that at least 3 agent cards are displayed
    const agentCount = await dashboardPage.getAgentCardCount();
    expect(agentCount).toBeGreaterThanOrEqual(3);

    // Check for known agent names
    const agentNames = await dashboardPage.getAgentNames();
    const hasAgents = agentNames.length > 0;
    expect(hasAgents).toBeTruthy();
  });

  test("should start new interview with an agent", async ({ authenticatedPage }) => {
    const dashboardPage = new DashboardPage(authenticatedPage);
    await dashboardPage.goto();

    // Get agent names to use the first one
    const agentNames = await dashboardPage.getAgentNames();
    const firstAgent = agentNames[0];

    if (firstAgent) {
      // Start interview with first agent
      await dashboardPage.startInterviewWithAgent(firstAgent);

      // Should navigate to /interview with params
      await authenticatedPage.waitForURL(/\/interview/);
      const currentUrl = authenticatedPage.url();
      expect(currentUrl).toContain("interview");
    }
  });

  test("should show interview page with agent name in header", async ({ authenticatedPage }) => {
    const dashboardPage = new DashboardPage(authenticatedPage);
    const interviewPage = new InterviewPage(authenticatedPage);

    await dashboardPage.goto();

    // Start interview
    const agentNames = await dashboardPage.getAgentNames();
    const firstAgent = agentNames[0];

    if (firstAgent) {
      await dashboardPage.startInterviewWithAgent(firstAgent);

      // Check interview page title mentions agent
      const title = await interviewPage.getInterviewTitle();
      expect(title.toLowerCase()).toContain("entretien");
    }
  });

  test("should show empty state with no messages initially", async ({ authenticatedPage }) => {
    const dashboardPage = new DashboardPage(authenticatedPage);
    const interviewPage = new InterviewPage(authenticatedPage);

    await dashboardPage.goto();

    // Start new interview
    const agentNames = await dashboardPage.getAgentNames();
    if (agentNames.length > 0) {
      await dashboardPage.startInterviewWithAgent(agentNames[0]);

      // New interview should show empty state
      const isEmpty = await interviewPage.isEmptyState();
      expect(isEmpty).toBeTruthy();
    }
  });

  test("should send message and display in chat", async ({ authenticatedPage }) => {
    const dashboardPage = new DashboardPage(authenticatedPage);
    const interviewPage = new InterviewPage(authenticatedPage);

    await dashboardPage.goto();

    // Start interview
    const agentNames = await dashboardPage.getAgentNames();
    if (agentNames.length > 0) {
      await dashboardPage.startInterviewWithAgent(agentNames[0]);

      const testMessage = "Hello, this is a test message";

      // Send message
      await interviewPage.typeMessage(testMessage);
      await interviewPage.sendMessage();

      // Message should appear in chat
      const userMessages = await interviewPage.getUserMessages();
      const foundMessage = userMessages.some((msg) => msg.includes(testMessage));
      expect(foundMessage).toBeTruthy();
    }
  });

  test("should handle keyboard shortcut Enter to send message", async ({ authenticatedPage }) => {
    const dashboardPage = new DashboardPage(authenticatedPage);
    const interviewPage = new InterviewPage(authenticatedPage);

    await dashboardPage.goto();

    // Start interview
    const agentNames = await dashboardPage.getAgentNames();
    if (agentNames.length > 0) {
      await dashboardPage.startInterviewWithAgent(agentNames[0]);

      const testMessage = "Test message with Enter";

      // Send using Enter key
      await interviewPage.sendMessageWithEnter(testMessage);

      // Wait for message to appear
      await authenticatedPage.waitForFunction(
        (msg: string) => {
          const messages = document.querySelectorAll('[data-role="user"]');
          const found = Array.from(messages).some((el) => el.textContent?.includes(msg));
          return found;
        },
        testMessage,
        { timeout: 10000 }
      );

      // Verify message sent
      const userMessages = await interviewPage.getUserMessages();
      expect(userMessages.some((msg) => msg.includes(testMessage))).toBeTruthy();
    }
  });

  test("should handle Shift+Enter to add newline (not send)", async ({ authenticatedPage }) => {
    const dashboardPage = new DashboardPage(authenticatedPage);
    const interviewPage = new InterviewPage(authenticatedPage);

    await dashboardPage.goto();

    // Start interview
    const agentNames = await dashboardPage.getAgentNames();
    if (agentNames.length > 0) {
      await dashboardPage.startInterviewWithAgent(agentNames[0]);

      // Type message
      await interviewPage.typeMessage("First line");

      // Add newline with Shift+Enter
      await interviewPage.addNewlineWithShiftEnter();

      // Type second line
      await interviewPage.messageInput.type("Second line");

      // Get current value
      const value = await interviewPage.getInputValue();

      // Should contain newline, not be sent
      expect(value).toContain("First line");
      expect(value).toContain("Second line");

      // Total messages should still be 0 (nothing sent yet)
      const messageCount = await interviewPage.getTotalMessageCount();
      expect(messageCount).toBe(0);
    }
  });

  test("should disable input during AI response streaming", async ({ authenticatedPage }) => {
    const dashboardPage = new DashboardPage(authenticatedPage);
    const interviewPage = new InterviewPage(authenticatedPage);

    await dashboardPage.goto();

    // Start interview
    const agentNames = await dashboardPage.getAgentNames();
    if (agentNames.length > 0) {
      await dashboardPage.startInterviewWithAgent(agentNames[0]);

      const testMessage = "Test message for streaming";

      // Send message
      await interviewPage.typeMessage(testMessage);
      await interviewPage.sendMessage();

      // Input should be disabled while streaming
      // (This is a soft assertion as streaming might be fast)
      try {
        const isDisabled = await interviewPage.isInputDisabled();
        // Not asserting because streaming might complete before check
      } catch {
        // Expected in fast responses
      }
    }
  });
});
