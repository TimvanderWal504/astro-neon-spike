// Captures one frame per search stop, timed to land while that stop's
// rejection is on screen, so each city can be checked against the real
// coastline underneath it. Dev-only.
import { chromium } from 'playwright';

const [, , url, outDir] = process.argv;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', (e) => consoleErrors.push(String(e)));

await page.goto(url.includes('?') ? url + '&revealDebug=1' : url + '?revealDebug=1', { waitUntil: 'load' });
await page.waitForSelector('#bestemming.is-unlocked', { timeout: 10000 });
await page.evaluate(() => document.getElementById('bestemming')?.scrollIntoView({ block: 'center' }));

// Don't guess when the prologue ends — the debug readout publishes the
// camera clock's own elapsedS, so poll that and shoot when each target
// time actually arrives. (Guessing a fixed prologue length put the last
// stop's frame past the end of `search` entirely.)
const shots = [
  ['01-berlijn', 9.0],
  ['02-basel', 14.0],
  ['03-luxemburg', 19.0],
  ['04-calais', 24.0],
  ['05-londen', 29.0],
  ['06-zwolle', 34.0],
  ['07-dive-mid', 37.5],
  ['08-ameland', 39.5],
  ['09-name', 44.0],
];

async function readElapsed() {
  return page.evaluate(() => {
    const t = document.querySelector('[data-reveal-debug]')?.textContent || '';
    const m = /t=([\d.]+)s/.exec(t);
    return m ? parseFloat(m[1]) : null;
  });
}

for (const [label, targetS] of shots) {
  // Poll rather than sleep a computed amount, so drift can't accumulate.
  for (let i = 0; i < 2000; i++) {
    const t = await readElapsed();
    if (t !== null && t >= targetS) break;
    await page.waitForTimeout(50);
  }
  await page.screenshot({ path: `${outDir}/${label}.png` });
  const state = await page.evaluate(() => {
    const el = document.querySelector('[data-reveal-stop]');
    const dbg = document.querySelector('[data-reveal-debug]');
    return {
      name: document.querySelector('[data-reveal-stop-name]')?.textContent,
      reason: document.querySelector('[data-reveal-stop-reason]')?.textContent,
      active: el?.classList.contains('is-active'),
      rejected: el?.classList.contains('is-rejected'),
    };
  });
  console.log(label.padEnd(14), JSON.stringify(state));
}

console.log('\nConsole errors:', consoleErrors.length ? JSON.stringify(consoleErrors, null, 2) : 'none');
await browser.close();
