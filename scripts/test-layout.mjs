import { chromium } from '@playwright/test';
import path from 'path';

const screenshotBeforePath = path.join(process.cwd(), 'layout-before-message.png');
const screenshotAfterPath = path.join(process.cwd(), 'layout-after-message.png');

async function testLayout() {
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

    await page.waitForTimeout(2000);

    // Wait for textarea to be visible
    console.log('⏳ Waiting for textarea to be visible...');
    await page.locator('textarea').first().waitFor({ state: 'visible', timeout: 15000 });

    console.log('\n📸 Taking screenshot BEFORE message...');
    await page.screenshot({ path: screenshotBeforePath });
    console.log(`✅ Screenshot saved: ${screenshotBeforePath}`);

    // Get input position before
    console.log('📍 Getting input element...');
    const textarea = await page.locator('textarea').first();
    console.log('📐 Getting bounding box...');
    const textareaBoxBefore = await textarea.boundingBox();
    console.log(`\n📍 Input Position BEFORE message:`);
    console.log(`  Top: ${textareaBoxBefore.y}px`);
    console.log(`  Height: ${textareaBoxBefore.height}px`);
    console.log(`  Bottom: ${textareaBoxBefore.y + textareaBoxBefore.height}px`);
    console.log(`  Viewport: 720px`);
    console.log(`  Within viewport: ${textareaBoxBefore.y + textareaBoxBefore.height <= 720 ? '✅ YES' : '❌ NO'}`);

    // Type a test message
    console.log('\n💬 Typing test message...');
    await textarea.fill('Bonjour, comment ça va?');
    await page.waitForTimeout(500);

    // Send the message
    console.log('📤 Clicking send button...');
    const sendButton = await page.locator('button').filter({ hasText: 'Envoyer' }).first();
    await sendButton.click();

    // Wait for messages to appear (look for messages or streaming indicator)
    console.log('⏳ Waiting for response...');
    await page.waitForTimeout(3000); // Give ADK time to respond

    // Check if we have messages now
    try {
      await page.waitForSelector('[role="article"]', { timeout: 10000 }).catch(() => {
        // Messages might not have role="article", continue anyway
      });
    } catch {
      console.log('  (No article role found, continuing)');
    }

    await page.waitForTimeout(2000); // Wait a bit more for render

    console.log('\n📸 Taking screenshot AFTER message...');
    await page.screenshot({ path: screenshotAfterPath });
    console.log(`✅ Screenshot saved: ${screenshotAfterPath}`);

    // Get input position after
    const textareaAfter = await page.locator('textarea').first();
    const textareaBoxAfter = await textareaAfter.boundingBox();
    console.log(`\n📍 Input Position AFTER message:`);
    console.log(`  Top: ${textareaBoxAfter.y}px`);
    console.log(`  Height: ${textareaBoxAfter.height}px`);
    console.log(`  Bottom: ${textareaBoxAfter.y + textareaBoxAfter.height}px`);
    console.log(`  Viewport: 720px`);
    console.log(`  Within viewport: ${textareaBoxAfter.y + textareaBoxAfter.height <= 720 ? '✅ YES' : '❌ NO - BELOW SCREEN'}`);

    // Calculate change
    console.log(`\n📊 Position Change:`);
    const topDiff = textareaBoxAfter.y - textareaBoxBefore.y;
    const heightDiff = textareaBoxAfter.height - textareaBoxBefore.height;
    console.log(`  Top moved: ${topDiff > 0 ? '↓ down' : '↑ up'} ${Math.abs(topDiff)}px`);
    console.log(`  Height changed: ${heightDiff > 0 ? '↑ taller' : '↓ shorter'} ${Math.abs(heightDiff)}px`);

    // Check page content
    const pageText = await page.innerText('body');
    const hasMessages = pageText.includes('Bonjour') && pageText.split('\n').length > 5;
    console.log(`\n✅ Page has messages: ${hasMessages ? 'YES' : 'NO'}`);

    // Get scroll position info
    const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
    const docHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    console.log(`\n📏 Page Heights:`);
    console.log(`  Body scrollHeight: ${bodyHeight}px`);
    console.log(`  Document scrollHeight: ${docHeight}px`);
    console.log(`  Viewport Height: 720px`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (browser) {
      try {
        await browser.close();
        console.log('\n✅ Browser closed.');
        console.log(`📂 Screenshots saved:`);
        console.log(`   - Before: ${screenshotBeforePath}`);
        console.log(`   - After: ${screenshotAfterPath}`);
      } catch (closeError) {
        console.error('Error closing browser:', closeError.message);
      }
    }
  }
}

testLayout();
