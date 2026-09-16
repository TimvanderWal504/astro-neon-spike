import { chromium } from 'playwright';
const [, , url, outDir, stepMs] = process.argv;
const step = Number(stepMs) || 1300;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const consoleErrors = [];
page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
page.on('pageerror', (err) => consoleErrors.push(String(err)));
await page.goto(url, { waitUntil: 'load' });
await page.waitForSelector('#bestemming.is-unlocked', { timeout: 10000 });
await page.evaluate(() => document.getElementById('bestemming')?.scrollIntoView({ block: 'center' }));
const totalMs = 40000;
let elapsed = 0; let i = 0;
while (elapsed < totalMs) {
  await page.waitForTimeout(step);
  elapsed += step;
  const label = String(i).padStart(2, '0') + '-t' + (elapsed / 1000).toFixed(1) + 's';
  await page.screenshot({ path: `${outDir}/${label}.png` });
  console.log('captured', label);
  i++;
}
console.log('\nConsole errors:', consoleErrors.length ? JSON.stringify(consoleErrors, null, 2) : 'none');
await browser.close();
