// test.js
import puppeteer from 'puppeteer';

// Absolute path to your extension root
const pathToExtension = 'C:\\xampp\\htdocs\\Web_Chrome_Webpage';

const browser = await puppeteer.launch({
  headless: false,
  args: [
    `--disable-extensions-except=${pathToExtension}`,
    `--load-extension=${pathToExtension}`,
  ],
});

// MV3 service worker (use this for your manifest v3 extension)
await browser.waitForTarget(t => t.type() === 'service_worker');
console.log('✅ Extension loaded!');

const page = await browser.newPage();
await page.goto('https://example.com');

await new Promise(r => setTimeout(r, 5000));
await browser.close();