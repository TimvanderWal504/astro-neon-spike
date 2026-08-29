---
title: 'PWA installability'
type: 'feature'
created: '2026-08-29'
status: 'done'
review_loop_iteration: 0
baseline_commit: 'a5bf0ccbb48da8507c5ba8f0b78bd5db7ef2ad20'
context:
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-MoapMoap-2026-08-24/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `public/manifest.json` already exists but references `/icons/icon-192.png` and `/icons/icon-512.png`, neither of which exist (404s block installability). No service worker is registered anywhere, `[trip]/index.astro`'s `<head>` never links the manifest, and the page has no install-instructions UI at all — `Main.dc.html`'s manual Android/iPhone toggle (`#installeren`) was never ported.

**Approach:** Create the two missing icon assets, hand-write a minimal `public/sw.js` (install/activate/fetch-passthrough only — push handling is story 1.8's scope per AD-4), wire `<link rel="manifest">` + `apple-touch-icon` + `theme-color` into `<head>`, register the service worker client-side, and port the `#installeren` section (manual `pickAndroid`/`pickIOS` toggle + hero CTA) from `Main.dc.html` verbatim, translated from its component pseudo-framework (`sc-if`, `setState`) to plain DOM class toggling since `index.astro` has no client component runtime.

## Boundaries & Constraints

**Always:** Toggle reproduces `Main.dc.html`'s manual click-to-switch UI exactly: two buttons (Android active/filled by default, iPhone outline), Dutch copy verbatim, 2-step instructions per platform. `sw.js` registers via `navigator.serviceWorker.register('/sw.js')` guarded by `'serviceWorker' in navigator`. `sw.js` implements only `install` (skip-waiting), `activate` (claim clients), and a `fetch` handler that calls `event.respondWith(fetch(event.request))` — a plain network passthrough, no caching strategy. `<head>` gets `<link rel="manifest">`, `<meta name="theme-color" content="#0a0d0c">`, `<link rel="apple-touch-icon">`, **and** `<meta name="apple-mobile-web-app-capable" content="yes">` plus `<meta name="mobile-web-app-capable" content="yes">` — iOS Safari ignores the manifest's `display: standalone` for "Add to Home Screen" entirely and needs its own capable flag, or the installed iPhone icon reopens in Safari chrome instead of standalone, defeating the point of the iOS half of this story's own toggle. Icons are real PNGs at the exact paths/sizes the existing manifest already declares: a flat mark in a hardcoded hex (Ameland's current accent value, not the dynamic `--accent` CSS var, which a static `public/` file can't read) on the `#0a0d0c` background. `#installeren` sits between the hero and `<!-- CHAPTER SLOTS -->`, mirroring `Main.dc.html`'s structure, with a hero CTA linking to it, and renders statically at full opacity — no `.reveal`/`.cinematic-reveal` treatment (story 1.6 scoped that system to chapter slots only).

**Never:** No UA-sniffing or `beforeinstallprompt` auto-detection (manual toggle only, per stories.yaml). No PWA build plugin (`@vite-pwa/astro`, workbox, etc.) — hand-written only, per the architecture's explicit rationale. No push/`notificationclick`/`postMessage` logic in `sw.js` — reserved for story 1.8. Do not touch `admin.astro`, API routes, or trip-state logic.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Default load | Page loads, no platform chosen yet | Android instructions shown, Android button active/filled, iPhone outline | N/A |
| User picks iPhone | Click iPhone button | iOS instructions replace Android's, iPhone button becomes active/filled, Android reverts to outline, no reload | N/A |
| Unsupported browser | `'serviceWorker' in navigator` is false | SW registration skipped silently; manifest link and toggle UI still work | Swallow — no console error, no user-facing failure |

</frozen-after-approval>

## Code Map

- `public/manifest.json` -- required a real edit: `start_url` was `"/"`, a route that doesn't exist (only `/moapmoap` via the `[trip]` route does) — changed to `"/moapmoap"` so the installed home-screen icon doesn't 404 on launch. Icons section unchanged.
- `public/icons/icon-192.png`, `public/icons/icon-512.png` (NEW) -- app icons the existing manifest already references; dark bg + accent-colored flat globe/world mark (a monogram was tried first and rejected in review as not reading as an app icon or hinting at the trip's secret-destination premise), art kept inside the middle 80% of the canvas so it survives Android adaptive-icon masking without a separate maskable manifest entry.
- `public/sw.js` (NEW) -- minimal install/activate/fetch-passthrough service worker (`install` wraps `skipWaiting()` in `event.waitUntil` so the event isn't considered settled before it completes); story 1.8 extends this same file with push/notificationclick.
- `src/pages/[trip]/index.astro` `<head>` -- manifest link, theme-color meta, apple-touch-icon link, apple-mobile-web-app-capable + mobile-web-app-capable meta, plus apple-mobile-web-app-title and apple-mobile-web-app-status-bar-style (`black-translucent`) added in review.
- `src/pages/[trip]/index.astro` (between hero close and the `<!-- CHAPTER SLOTS -->` comment) -- `#installeren` section, ported from `Main.dc.html:402-442`, plus the hero CTA from `Main.dc.html:374`. Review pass added `aria-hidden="true"` on both decorative SVGs, `aria-pressed` on the two platform buttons (kept in sync with `data-platform` by the click handler), and `:hover`/`:focus-visible` states on `.hero-cta`/`.installeren-btn` (the latter matching the `.chapter-replay:focus-visible` precedent from story 1.6).
- `src/pages/[trip]/index.astro` (client script block) -- `platform` state (android default) with plain DOM toggle handlers (now also syncing `aria-pressed`), and the guarded SW registration call.
- `design/ameland-weekend/Main.dc.html:374,402-442,626-724` -- reference-only source for install section markup/copy/state logic; not modified.
- Line numbers above are intentionally omitted: an unrelated commit (`16ce935`, hero-map coastline replacement) landed on this file after this story's diff was authored and shifted every line number in it; the section anchors (comments, ids, header text) above still resolve correctly.

## Tasks & Acceptance

**Execution:**
- [x] `public/icons/icon-192.png`, `public/icons/icon-512.png` -- create real PNG assets matching the existing manifest declarations -- fixes the current 404s and satisfies Chrome/Android installability icon requirements.
- [x] `public/sw.js` -- write minimal install/activate/fetch-passthrough service worker -- required for Chrome/Android installability; scoped narrowly so story 1.8 can extend it with push logic without rework.
- [x] `src/pages/[trip]/index.astro` (head) -- add manifest link, theme-color meta, apple-touch-icon link, apple-mobile-web-app-capable + mobile-web-app-capable meta -- wires the existing manifest, enables the iOS home-screen icon, and makes the installed iOS icon launch standalone instead of into Safari chrome.
- [x] `src/pages/[trip]/index.astro` (body) -- port `#installeren` section + hero CTA from `Main.dc.html`, translating `sc-if`/component state to plain DOM class toggling -- reproduces the manual Android/iOS instructions toggle.
- [x] `src/pages/[trip]/index.astro` (script) -- add `pickAndroid`/`pickIOS` click handlers + guarded SW registration -- wires the toggle UI and activates installability.

**Acceptance Criteria:**
- Given the page loads, when no platform has been chosen yet, then Android instructions show by default and the Android button renders active/filled.
- Given a user clicks the iPhone button, when the click is handled, then iOS instructions replace Android's and button styles swap, with no page reload.
- Given a Chromium browser on Android, when the page loads, then DevTools' Application > Manifest panel reports the manifest and service worker as valid/installable with no icon 404s.
- Given a browser without service worker support, when the page loads, then no JS error is thrown and the toggle still works.
- Given the site is added to an iOS home screen, when it's relaunched from the home-screen icon, then it opens standalone (no Safari URL bar/tabs), not inside regular Safari.

## Spec Change Log

## Design Notes

`Main.dc.html`'s toggle is built on a component pseudo-framework (`sc-if`, `this.setState`) that doesn't exist in this plain `.astro` + vanilla-script page — the port translates it to a `data-platform` attribute on a container plus two CSS-gated instruction blocks and a click handler per button, keeping the copy and visual states identical while the mechanism differs.

No existing brand mark exists to source the app icon from (the mockups only show the install *toggle*, never actual icon artwork) — icons are a simple flat accent-colored globe/world mark (circle + latitude/longitude arcs) on the `#0a0d0c` background, treated as a placeholder-quality asset the human can swap post-merge without touching any other file. A first pass used a flat "A" monogram; rejected in review for not reading as an app icon and giving away nothing about the trip's secret-destination-reveal premise. The globe artwork is kept within the middle 80% of the canvas (diameter = 0.4 × canvas size, centered) so it stays inside Android's adaptive-icon safe zone without adding a separate maskable icon entry to the manifest.

## Verification

**Commands:**
- `pnpm typecheck` -- expected: passes.
- `pnpm build` -- expected: succeeds.

**Manual checks:**
- Open the trip page in Chrome desktop DevTools > Application > Manifest: confirm no icon errors and the service worker shows registered.
- Click the iPhone/Android toggle buttons: confirm instruction copy and active-button styling swap, matching `Main.dc.html` verbatim.
- Reload twice in a browser with SW support: confirm no duplicate-registration errors in the console.
- On iOS Safari: Share > Add to Home Screen, then relaunch from the home-screen icon: confirm it opens standalone, no Safari chrome.

## Suggested Review Order

**Manifest & service-worker wiring (entry point)**

- Manifest linked into `<head>` for the first time — activates the whole PWA contract.
  [`index.astro:52`](../../../../src/pages/%5Btrip%5D/index.astro#L52)

- `start_url` fixed from `"/"` (a 404) to the only route that exists — caught in review, not the first draft.
  [`manifest.json:4`](../../../../public/manifest.json#L4)

- Minimal install/activate/fetch service worker — narrow on purpose so story 1.8 can extend it.
  [`sw.js:8`](../../../../public/sw.js#L8)

- `skipWaiting()` wrapped in `waitUntil` so install isn't considered settled early — review fix.
  [`sw.js:9`](../../../../public/sw.js#L9)

- Guarded registration call — unsupported browsers skip silently, no error surfaced.
  [`index.astro:1950`](../../../../src/pages/%5Btrip%5D/index.astro#L1950)

**Install-instructions toggle (`#installeren`)**

- Hero CTA linking down to the install section — ported from `Main.dc.html:374`.
  [`index.astro:599`](../../../../src/pages/%5Btrip%5D/index.astro#L599)

- Section markup, `data-platform="android"` default — ported from `Main.dc.html:402-442`.
  [`index.astro:1673`](../../../../src/pages/%5Btrip%5D/index.astro#L1673)

- Platform buttons carry `aria-pressed`, added in review since only color communicated state before.
  [`index.astro:1680`](../../../../src/pages/%5Btrip%5D/index.astro#L1680)

- CSS attribute-selector pairs drive visibility — plain-DOM stand-in for `Main.dc.html`'s `sc-if`/`setState`.
  [`index.astro:443`](../../../../src/pages/%5Btrip%5D/index.astro#L443)

- Click handler toggles `data-platform` and keeps `aria-pressed` in sync on both buttons.
  [`index.astro:1929`](../../../../src/pages/%5Btrip%5D/index.astro#L1929)

**Peripherals**

- Globe/world app icons (192/512px) — a rejected "A" monogram was replaced with this in review.
  [`icon-192.png`](../../../../public/icons/icon-192.png)

- Sprint tracker flipped from `backlog` to `in-progress` for this story.
  [`sprint-status.yaml:63`](../../../../_bmad-output/implementation-artifacts/sprint-status.yaml#L63)
