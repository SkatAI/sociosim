import { chromium } from '@playwright/test';

async function debugPage() {
  let browser;
  try {
    console.log('🌐 Starting browser...');
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();

    console.log('📄 Navigating...');
    await page.goto('http://localhost:3000/interview', { waitUntil: 'domcontentloaded', timeout: 45000 });
    
    await page.waitForTimeout(3000);

    console.log('\n🔍 Page Content:');
    const pageText = await page.innerText('body');
    console.log(pageText.substring(0, 1000));

    console.log('\n🔍 Looking for textareas...');
    const textareas = await page.locator('textarea').count();
    console.log(`Found ${textareas} textareas`);

    if (textareas > 0) {
      console.log('✅ Textarea found!');
      const first = await page.locator('textarea').first();
      const isVisible = await first.isVisible();
      console.log(`Is visible: ${isVisible}`);
      if (isVisible) {
        const box = await first.boundingBox();
        console.log(`Position: top=${box.y}px, height=${box.height}px`);
      }
    } else {
      console.log('❌ No textareas found');
      console.log('\n🔍 Page HTML (first 2000 chars):');
      const html = await page.content();
      console.log(html.substring(0, 2000));
    }

  } finally {
    if (browser) await browser.close();
  }
}

debugPage();
