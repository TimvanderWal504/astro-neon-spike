// Dev-only: scroll to #bestemming to trigger the reveal sequence and
// capture one frame per meaningful beat, labelled after the acts that
// actually exist. Not part of the app.
//
// Usage: node scripts/reveal-sequence-check.mjs <url> <out-dir>
//
// Two things this gets right that the earlier version didn't:
//
// 1. The labels match the current 4-act, 43s timeline (prologue, search,
//    dive, name). They used to name `lock`, `dive1`,
//    `terschelling`, `mismatch` and `dive2` — acts that no longer exist —
//    at timings from the old 36s cut, so the output read as a sequence
//    that hadn't been built for some time.
// 2. Everything after the prologue is timed off the camera clock's own
//    elapsedS (published by the ?revealDebug readout) rather than a
//    guessed wall-clock offset. The typed prologue's real duration varies,
//    and guessing it once put the last search stop's frame past the end of
//    the act entirely — which looks exactly like a missing label rather
//    than a mistimed screenshot.
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

// revealDebug publishes the camera clock; the readout itself is hidden
// below so it stays out of the screenshots.
const debugUrl = url + (url.includes('?') ? '&' : '?') + 'revealDebug=1';
await page.goto(debugUrl, { waitUntil: 'load' });
await page.addStyleTag({ content: '[data-reveal-debug]{opacity:0 !important;}' });

// #bestemming is display:none until loadTripState()'s async fetch marks it
// .is-unlocked — scrollIntoView on a display:none element is a no-op, so
// wait for the class before scrolling.
await page.waitForSelector('#bestemming.is-unlocked', { timeout: 10000 });
await page.evaluate(() => {
  const el = document.getElementById('bestemming');
  el?.scrollIntoView({ block: 'center' });
});

async function snap(label) {
  await page.screenshot({ path: `${outDir}/${label}.png` });
  const state = await page.evaluate(() => {
    const debug = document.querySelector('[data-reveal-debug]')?.textContent || '';
    const stop = document.querySelector('[data-reveal-stop]');
    return {
      clock: /t=([\d.]+)s/.exec(debug)?.[1] ?? null,
      act: /act=(\w+)/.exec(debug)?.[1] ?? null,
      stop: document.querySelector('[data-reveal-stop-name]')?.textContent || null,
      shown: stop?.classList.contains('is-active') ?? false,
      rejected: stop?.classList.contains('is-rejected') ?? false,
    };
  });
  const bits = [`act=${state.act ?? 'pre-roll'}`, `t=${state.clock ?? '-'}`];
  if (state.shown) bits.push(`stop=${state.stop}${state.rejected ? ' [afgewezen]' : ''}`);
  console.log(label.padEnd(22), bits.join('  '));
}

/** Waits for the camera clock to reach `targetS` (seconds of elapsedS). */
async function waitForClock(targetS) {
  for (let i = 0; i < 3000; i++) {
    const t = await page.evaluate(() => {
      const txt = document.querySelector('[data-reveal-debug]')?.textContent || '';
      const m = /t=([\d.]+)s/.exec(txt);
      return m ? parseFloat(m[1]) : null;
    });
    if (t !== null && t >= targetS) return;
    await page.waitForTimeout(50);
  }
  console.warn(`  (clock never reached ${targetS}s)`);
}

// The typed prologue runs on wall time before the camera clock starts, so
// these three are the only wall-clock-timed frames in the run.
const prologueBeats = [
  ['00-prologue-scrolled-in', 400],
  ['01-prologue-typing', 1600],
  ['02-prologue-coordinaat', 4000],
];
let waited = 0;
for (const [label, ms] of prologueBeats) {
  if (ms > waited) await page.waitForTimeout(ms - waited);
  waited = ms;
  await snap(label);
}

// Everything below is keyed to elapsedS. Search runs 5-35s as six 5s
// stops; each is sampled at +4.0s into its own slot, which is after the
// rejection lands at 70%.
const beats = [
  ['03-zoek-1-berlijn', 9.0],
  ['04-zoek-2-athens', 15.0],
  ['05-zoek-3-luxemburg', 21.0],
  ['06-zoek-4-madrid', 27.0],
  ['07-zoek-5-londen', 33.0],
  ['08-zoek-6-zwolle', 39.0],
  ['09-duik-inzet', 44.0],
  ['10-duik-lock', 47.0],
  ['11-naam', 48.0],
];
for (const [label, targetS] of beats) {
  await waitForClock(targetS);
  await snap(label);
}

console.log('\nConsole errors:', consoleErrors.length ? JSON.stringify(consoleErrors, null, 2) : 'none');
await browser.close();
