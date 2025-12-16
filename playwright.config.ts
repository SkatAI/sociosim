import { defineConfig, devices } from "@playwright/test";
import * as dotenv from "dotenv";
import path from "path";

// Load test environment variables
dotenv.config({ path: ".env.test" });

/**
 * Playwright Configuration for SocioSim E2E Tests
 *
 * Key Features:
 * - Multi-browser testing (Chromium, Firefox, WebKit)
 * - Screenshot/video capture on failure
 * - Parallel execution with configurable workers
 * - Test isolation with database reset
 * - Comprehensive error capture (traces, screenshots, videos)
 */
export default defineConfig({
  testDir: "./e2e/tests",

  // Test execution settings
  fullyParallel: true, // Run tests in parallel across all files
  forbidOnly: !!process.env.CI, // Fail CI if test.only is committed
  retries: process.env.CI ? 2 : 0, // Retry failed tests in CI
  workers: process.env.CI ? 2 : undefined, // Limit workers in CI, use all cores locally

  // Reporting
  reporter: [
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["json", { outputFile: "playwright-report/results.json" }],
    ["list"], // Console output
  ],

  // Global test settings
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",

    // Capture artifacts on failure
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "retain-on-failure",

    // Browser settings
    locale: "fr-FR", // French locale for UI
    timezoneId: "Europe/Paris",
    viewport: { width: 1280, height: 720 },

    // Timeouts
    actionTimeout: 10000, // 10s for individual actions
    navigationTimeout: 30000, // 30s for page loads
  },

  // Global timeout settings
  timeout: 60000, // 60s per test
  expect: {
    timeout: 10000, // 10s for assertions
  },

  // Global setup/teardown
  globalSetup: require.resolve("./e2e/setup/global-setup.ts"),
  globalTeardown: require.resolve("./e2e/setup/global-teardown.ts"),

  // Projects for different browsers
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],

  // Development server (auto-start for local testing)
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI, // Don't reuse in CI
    stdout: "ignore",
    stderr: "pipe",
    timeout: 120000, // 2 minutes to start
  },
});
