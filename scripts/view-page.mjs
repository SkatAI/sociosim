import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const screenshotPath = path.join(process.cwd(), 'page-screenshot.png');

async function viewPage() {
  let browser;
  try {
    console.log('🌐 Starting Playwright browser...');
    browser = await chromium.launch({
      headless: true,
      timeout: 30000
    });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      ignoreHTTPSErrors: true
    });
    const page = await context.newPage();

    console.log('📄 Navigating to http://localhost:3000/interview...');
    await page.goto('http://localhost:3000/interview', {
      waitUntil: 'domcontentloaded',
      timeout: 45000
    });

    // Wait a moment for animations/render to complete
    await page.waitForTimeout(1000);

    console.log('\n📸 Taking screenshot...');
    await page.screenshot({ path: screenshotPath });
    console.log(`✅ Screenshot saved to: ${screenshotPath}`);

    // Get page title and basic info
    const title = await page.title();
    console.log(`\n📋 Page Title: ${title}`);

    // Get all visible text
    const pageText = await page.innerText('body');
    console.log('\n📝 Page Content (text):');
    console.log('---');
    console.log(pageText.substring(0, 500)); // First 500 chars
    console.log('---\n');

    // Get detailed element info
    console.log('🔍 Key Elements:');

    // Main container
    const mainBox = await page.locator('[role="main"], body > div').first();
    const mainHeight = await mainBox.evaluate(el => el.clientHeight);
    const mainScrollHeight = await mainBox.evaluate(el => el.scrollHeight);
    console.log(`  Main Container: height=${mainHeight}px, scrollHeight=${mainScrollHeight}px`);

    // Header
    const header = await page.locator('h1').first();
    const headerText = await header.innerText();
    console.log(`  Header: "${headerText}"`);

    // Messages area
    const messagesContainer = await page.locator('div[style*="overflow"]').first();
    if (await messagesContainer.isVisible()) {
      const msgHeight = await messagesContainer.evaluate(el => el.clientHeight);
      const msgScrollHeight = await messagesContainer.evaluate(el => el.scrollHeight);
      console.log(`  Messages Container: height=${msgHeight}px, scrollHeight=${msgScrollHeight}px`);
    }

    // Input area
    const textarea = await page.locator('textarea').first();
    if (await textarea.isVisible()) {
      const inputPlaceholder = await textarea.getAttribute('placeholder');
      const inputHeight = await textarea.evaluate(el => el.clientHeight);
      console.log(`  Input Textarea: placeholder="${inputPlaceholder}", height=${inputHeight}px`);
      console.log(`  Input is VISIBLE on page ✅`);
    } else {
      console.log(`  Input Textarea: NOT VISIBLE on page ❌`);
    }

    // Check viewport dimensions
    const viewportSize = page.viewportSize();
    console.log(`\n📐 Viewport: ${viewportSize.width}x${viewportSize.height}px`);

    // Check if input is within viewport
    const inputBox = await textarea.boundingBox();
    if (inputBox) {
      const isInViewport = inputBox.y + inputBox.height <= viewportSize.height;
      console.log(`\n📍 Input Position:`);
      console.log(`  Top: ${inputBox.y}px`);
      console.log(`  Height: ${inputBox.height}px`);
      console.log(`  Bottom: ${inputBox.y + inputBox.height}px`);
      console.log(`  Viewport Height: ${viewportSize.height}px`);
      console.log(`  Within Viewport: ${isInViewport ? '✅ YES' : '❌ NO - BELOW SCREEN'}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (browser) {
      try {
        await browser.close();
        console.log('\n✅ Browser closed. Screenshot saved to:', screenshotPath);
      } catch (closeError) {
        console.error('Error closing browser:', closeError.message);
      }
    }
  }
}

viewPage();
