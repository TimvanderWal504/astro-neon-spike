// Dev-only: scroll to #bestemming to trigger the reveal sequence, then
// capture screenshots at several points along it. Not part of the app.
import { chromium } from 'playwright';

const [, , url, outDir] = process.argv;
if (!url || !outDir) {
  console.error('Usage: node scripts/reveal-sequence-check.mjs <url> <out-dir>');
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
// #bestemming is display:none until loadTripState()'s async fetch marks it
// .is-unlocked — scrollIntoView on a display:none element is a no-op, so
// wait for the class before scrolling.
await page.waitForSelector('#bestemming.is-unlocked', { timeout: 10000 });
await page.evaluate(() => {
  const el = document.getElementById('bestemming');
  el?.scrollIntoView({ block: 'center' });
});

// t=0 is roughly "just scrolled in" — the prologue should be starting.
const checkpoints = [
  { label: '00-scrolled-in', waitMs: 400 },
  { label: '01-prologue-mid', waitMs: 2500 },
  { label: '02-prologue-coord', waitMs: 4500 },
  { label: '03-lock-hop', waitMs: 8000 },
  { label: '04-lock-impact', waitMs: 10800 },
  { label: '05-dive1', waitMs: 15000 },
  { label: '06-terschelling', waitMs: 19000 },
  { label: '07-mismatch', waitMs: 19300 },
  { label: '08-dive2-mid', waitMs: 27000 },
  { label: '09-inversion', waitMs: 32500 },
  { label: '10-name', waitMs: 35500 },
];

let elapsed = 0;
for (const cp of checkpoints) {
  const delta = cp.waitMs - elapsed;
  if (delta > 0) await page.waitForTimeout(delta);
  elapsed = cp.waitMs;
  await page.screenshot({ path: `${outDir}/${cp.label}.png` });
  console.log('captured', cp.label, 'at', cp.waitMs, 'ms');
}

console.log('\nConsole errors:', consoleErrors.length ? JSON.stringify(consoleErrors, null, 2) : 'none');
await browser.close();
