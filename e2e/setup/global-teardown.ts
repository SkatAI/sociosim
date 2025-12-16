import { FullConfig } from "@playwright/test";

/**
 * Global Teardown - Runs once after all tests
 *
 * This can be used for final cleanup if needed
 */
async function globalTeardown(config: FullConfig) {
  // Add any global cleanup here if needed
  console.log("\n✅ All tests completed");
}

export default globalTeardown;
