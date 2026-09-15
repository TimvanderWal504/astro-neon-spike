// Dev-only helper: launch headless Chromium via Playwright, navigate to a
// URL, wait for a selector, and save a screenshot. Not part of the app's
// runtime or build — purely so changes to the reveal sequence (or anything
// else visual) can be checked without a real browser.
//
// Usage: node scripts/reveal-screenshot.mjs <url> <out-file> [wait-selector] [wait-ms]
import { chromium } from 'playwright';

const [, , url, outFile, waitSelector, waitMs] = process.argv;

if (!url || !outFile) {
  console.error('Usage: node scripts/reveal-screenshot.mjs <url> <out-file> [wait-selector] [wait-ms]');
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

const consoleErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', (err) => consoleErrors.push(String(err)));

await page.goto(url, { waitUntil: 'load' });

if (waitSelector) {
  await page.waitForSelector(waitSelector, { timeout: 10000 }).catch((err) => {
    console.error(`waitForSelector("${waitSelector}") failed:`, err.message);
  });
}

if (waitMs) {
  await page.waitForTimeout(Number(waitMs));
}

await page.screenshot({ path: outFile, fullPage: false });
await browser.close();

console.log('Screenshot saved to', outFile);
if (consoleErrors.length > 0) {
  console.log('Console errors:', JSON.stringify(consoleErrors, null, 2));
} else {
  console.log('No console errors.');
}
