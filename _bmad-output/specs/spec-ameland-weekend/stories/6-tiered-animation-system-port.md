---
title: 'Tiered animation system port'
type: 'feature'
created: '2026-08-29'
status: 'done'
review_loop_iteration: 0
baseline_commit: '808214303ffbb38dccc03ddc3c057f4293c934c2'
context:
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-MoapMoap-2026-08-24/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `[trip]/index.astro` has no reveal system at all — chapter cards appear instantly at full opacity once unlocked, with no scroll choreography, no cinematic per-chapter text stagger, no replay control, and no reduced-motion fallback. The hero's Europe map (`.hero-map`) is a static ambient loop only; the Bestemming-triggered zoom/lock/dive sequence from `Main.dc.html` was never built.

**Approach:** Port `.reveal`/`.reveal-fade`/`.cinematic-reveal` (+ `.ct-*` per-chapter text choreography) and the shared IntersectionObserver unchanged from `Main.dc.html`. The Bestemming zoom sequence can't reuse the original single-element mechanism verbatim — the map now lives inside `.hero` as a flex child (JS random-walk wander) instead of a page-wide `position:fixed` layer (a prior, out-of-spec session change). Adapt by giving the coastline paths a shared `<defs>` block referenced via `<use>` from two places: the existing hero-scoped ambient instance (untouched), and a new, always-present, always-`position:fixed` "dive" instance (`opacity:0`, `pointer-events:none` until triggered) that fades in and plays the original `fixedScanZoomSequence`/`fixedScanLockMove`/`fixedScanLockScale`/`fixedScanLockFlash` keyframes unchanged when `body:has(#bestemming.is-visible)`. This avoids reflowing `.hero`'s flex layout and avoids duplicating ~11KB of path data. Re-add the caption element (`fixed-scan-caption`, removed earlier as dead code when nothing triggered it — it's now load-bearing) and its `fixedScanCaptionFade` keyframe, inside the dive instance.

## Boundaries & Constraints

**Always:** Reveal/cinematic CSS, stagger delays (`.reveal-d1`–`d5`), `.ct-*` choreography, and all zoom/lock/flash/caption keyframe values/timings/easings port unchanged from `Main.dc.html`. `data-kind` (already on each `.chapter-slot`) decides the reveal class server-side: `cinematic` → `cinematic-reveal`, `knap` → `reveal`. IntersectionObserver options (`threshold: 0.2`, `rootMargin: '0px 0px -10% 0px'`) and its reduced-motion/no-`IntersectionObserver` bypass port unchanged; it is created and calls `.observe()` on every `.reveal`/`.reveal-fade`/`.cinematic-reveal` element synchronously at script init, independent of and not nested inside `loadTripState()`'s async fetch — a locked chapter's slot already carries its reveal class server-side (just `display:none`), so it's observed from the start and simply has no box to intersect until `.is-unlocked` renders it. The dive-layer SVG reuses the ambient instance's coastline paths via `<defs>`/`<use>`, never duplicates the path data. Replay ("Bekijk opnieuw") is a real `<button>` (not a clickable div), placed under `.chapter-description` in each cinematic chapter, styled like `.chapter-index` (mono, small caps, letter-spacing, accent-color hover). Under `prefers-reduced-motion: reduce`: reveal/cinematic elements snap to end-state; the `body:has(#bestemming.is-visible)` fixed-promotion/animation rules for the dive layer do not apply at all (it stays `opacity:0`, inert); the ambient hero-map wander is already disabled (existing code) and stays visible/static.

**Never:** Redesign reveal/cinematic timing, easing, or the zoom/lock/flash sequence values — reproduce unchanged per stories.yaml id 6. Touch `admin.astro`, `trip-state.ts`, or any API route. Promote `.hero-map` itself to `position:fixed` in place (reflows `.hero`'s flex layout) — use the separate `<use>`-based dive instance instead. Reintroduce a page-wide fixed *ambient* layer — the hero-scoped ambient map stays exactly as the prior session left it outside the triggered window.

</frozen-after-approval>

## Code Map

- `src/pages/[trip]/index.astro:198-254` -- add `.reveal`/`.reveal-fade`/`.cinematic-reveal`/`.reveal-dN`/`.ct-*` CSS (verbatim from `Main.dc.html:37-108`); add `.hero-map-dive` (new, `position:fixed; inset:0; z-index:50; opacity:0; pointer-events:none; transition: opacity 500ms ease;`) + `body:has(#bestemming.is-visible) .hero-map-dive { opacity: 0.5; }` + zoom/lock/flash/caption keyframes and their `:has()` triggers (from `Main.dc.html:165-229`, targets renamed to the dive instance's classes); extend the `prefers-reduced-motion` block (line 246) to snap reveal/cinematic elements and explicitly exclude the dive layer's `:has()` rules from applying.
- `src/pages/[trip]/index.astro:270-339` -- wrap the existing coastline `<path>` elements in `<defs><g id="europe-coastline">...</g></defs>` once; both the ambient `<g class="hero-map-zoom">` and the new dive instance reference them via `<use href="#europe-coastline">`. Add the new `.hero-map-dive` SVG (own viewfinder crosshair `<g>`, own zoom/motion/scale/flash/caption elements, IDs distinct from the ambient instance's) after `.hero-map`, as a sibling inside `.hero` (or body-level, since it's `position:fixed` regardless of DOM parent) — not nested inside the ambient instance.
- `src/pages/[trip]/index.astro:350-361` -- chapter-slot markup: add reveal class from `chapter.kind`; wrap `.chapter-content` fields in `.ct-*` elements for cinematic chapters; add the "Bekijk opnieuw" `<button>` (cinematic only) per the placement/style rule above.
- `src/pages/[trip]/index.astro:365-478` -- script block: add IntersectionObserver setup (from `Main.dc.html:636-652`, unchanged options/fallback, wired per the "Always" timing rule); on `#bestemming` gaining `.is-visible` (observer fires once), stop `startViewfinderWander`'s recursive `step()` via a module-level flag checked before each reschedule; add replay handler (`removeClass` → `void el.offsetWidth` → `requestAnimationFrame(addClass)`, from `Main.dc.html:662-673`) bound to each replay button, targeting its own chapter's id.
- `design/ameland-weekend/Main.dc.html:37-108,165-252,636-673` -- reference-only source for all CSS/JS being ported; not modified.

## Tasks & Acceptance

**Execution:**
- [x] `src/pages/[trip]/index.astro` -- port reveal/cinematic-reveal/stagger/`.ct-*` CSS -- restores the documented choreography, currently entirely absent.
- [x] `src/pages/[trip]/index.astro` -- apply reveal classes from `chapter.kind`; add `.ct-*` wrapping + replay button for cinematic chapters -- wires content to the ported CSS.
- [x] `src/pages/[trip]/index.astro` -- port IntersectionObserver (+ reduced-motion/unsupported fallback), synchronous setup independent of `loadTripState()` -- the trigger every reveal class depends on, wired so a chapter unlocked after page load is still observed correctly.
- [x] `src/pages/[trip]/index.astro` -- move coastline paths into `<defs>`, add the `<use>`-based fixed dive-layer instance + its zoom/lock/flash/caption keyframes and `:has()` triggers; stop-wander flag -- reproduces the Bestemming dive without touching `.hero-map`'s flex layout or duplicating path data.
- [x] `src/pages/[trip]/index.astro` -- extend `prefers-reduced-motion` block to also suppress the dive layer's `:has()` rules entirely (not just its animation) -- prevents a static full-viewport overlay snapping in for reduced-motion users.

**Acceptance Criteria:**
- Given a `knap` chapter is unlocked and scrolled into view, when it crosses the 0.2 threshold, then it fades/slides in once via `.reveal`, never re-triggering on subsequent scrolls.
- Given a cinematic chapter is unlocked and scrolled into view, when it becomes visible, then eyebrow/title/copy/CTA stagger in sequence per `.ct-*` timing.
- Given `#bestemming` is unlocked and scrolled into view, when its `.is-visible` class is added, then the dive-layer instance fades in, plays the lock/zoom/flash/caption sequence once using the original keyframe values, and fades out — with no visible change to `.hero`'s layout at any point.
- Given a chapter's "Bekijk opnieuw" button is clicked, when triggered, then its reveal (and, for Bestemming, the dive sequence, since both key off the same `.is-visible` toggle) replays from the start.
- Given `prefers-reduced-motion: reduce`, when the page loads and the user scrolls to an unlocked Bestemming, then reveal/cinematic elements are instantly at end state, the dive layer never appears (stays inert/invisible) at any scroll position, and the ambient hero map remains visible and static.

## Design Notes

The `<defs>`/`<use>` split is the load-bearing adaptation: it lets the dive sequence reuse the ambient map's exact coastline geometry without duplicating ~11KB of path data or touching `.hero-map`'s flex-item box (which promoting it to `position:fixed` in place would have removed from flow, reflowing `.hero-text`'s `space-between` partner — almost certainly invisible since the hero is off-screen by then, but not worth shipping unverified when a clean alternative exists). The dive instance starts at `opacity:0` always and only ever becomes visible via the same `:has()` trigger the keyframes use, so reduced-motion can suppress it completely by simply not letting that `:has()` rule apply — no separate "hide it" rule needed. Stopping `startViewfinderWander`'s loop (rather than relying on animation-priority alone) is required because a running CSS animation only wins the cascade for its property *while active*; once the sequence's `forwards` fill-mode ends, an un-stopped `step()` would resume overwriting `transform` via inline style on its next scheduled tick.

Known, accepted UX tradeoff: the original design's dive worked as an escalation of something continuously visible in the background; here the ambient map is hero-scoped, so it may be off-screen for a while before Bestemming triggers the dive. The fade-in (rather than assuming visual continuity from an off-screen element) is the deliberate mitigation — a full-screen radar-materializes-and-zooms beat is designed to work as a standalone moment, not a seamless handoff.

## Verification

**Commands:**
- `pnpm typecheck` -- expected: passes.
- `pnpm build` -- expected: succeeds.

**Manual checks:**
- Via story 5's admin toggle, unlock `vrijdag` (knap) -- card fades/slides in once on scroll, no map effect.
- Unlock `bestemming` (cinematic) -- scroll it into view -- dive layer fades in, plays lock/zoom/dive/caption, fades out; hero layout shows no jump if scrolled back up mid-sequence; eyebrow/title/copy/CTA stagger in after.
- Click "Bekijk opnieuw" on Bestemming -- full sequence replays, including the dive layer.
- Enable OS-level reduced motion, reload, scroll through an unlocked Bestemming -- all chapters render at end-state instantly, dive layer never appears at any scroll position, ambient map is static.
- Scroll past an unlocked chapter without triggering it, then back -- reveal never re-fires (element already unobserved).

## Suggested Review Order

**Dive-layer mechanism (the load-bearing adaptation)**

- Entry point: always-fixed, invisible-until-triggered dive layer, reusing the ambient map's geometry via `<use>`.
  [`index.astro:134`](../../../../src/pages/%5Btrip%5D/index.astro#L134)

- The `:has()` trigger swap: same pattern `Main.dc.html` already used, now targeting the dive instance instead of promoting `.hero-map` in place.
  [`index.astro:145`](../../../../src/pages/%5Btrip%5D/index.astro#L145)

- Zoom/lock/flash keyframes ported unchanged; only the target class names were renamed.
  [`index.astro:214`](../../../../src/pages/%5Btrip%5D/index.astro#L214)

- Shared coastline geometry lives once in `<defs>`, referenced by both the ambient and dive SVGs.
  [`index.astro:488`](../../../../src/pages/%5Btrip%5D/index.astro#L488)

- Dive-layer markup: fixed sibling of `.hero-map`, not nested inside it, so `position:fixed` never fights the flex layout.
  [`index.astro:548`](../../../../src/pages/%5Btrip%5D/index.astro#L548)

**Reveal / cinematic choreography**

- `.reveal` and `.cinematic-reveal` base states, ported unchanged from `Main.dc.html`.
  [`index.astro:298`](../../../../src/pages/%5Btrip%5D/index.astro#L298)

- `.ct-eyebrow`/`.ct-title`/`.ct-copy`/`.ct-cta` per-chapter text choreography, with Bestemming's longer delays so text waits for the dive.
  [`index.astro:317`](../../../../src/pages/%5Btrip%5D/index.astro#L317)

- Server-side reveal class from `chapter.kind`, and the replay button markup for cinematic chapters.
  [`index.astro:599`](../../../../src/pages/%5Btrip%5D/index.astro#L599)

**Script wiring**

- Synchronous IntersectionObserver setup, independent of `loadTripState()`'s async fetch.
  [`index.astro:735`](../../../../src/pages/%5Btrip%5D/index.astro#L735)

- `wanderStopped` guard, set from three places after the patch round: the reduced-motion/no-observer fallback, the observer callback, and the replay handler.
  [`index.astro:733`](../../../../src/pages/%5Btrip%5D/index.astro#L733)

- Replay handler: remove → forced reflow → re-add, retriggering both the chapter's reveal and (for Bestemming) the dive layer via the shared `:has()` selector.
  [`index.astro:757`](../../../../src/pages/%5Btrip%5D/index.astro#L757)

**Reduced motion**

- Suppresses the dive layer's `:has()` triggers entirely via `display:none`, not just their animation, so reduced-motion users never see a static overlay snap in.
  [`index.astro:423`](../../../../src/pages/%5Btrip%5D/index.astro#L423)

**Peripherals**

- `:focus-visible` outline on the replay button, added during review.
  [`index.astro:417`](../../../../src/pages/%5Btrip%5D/index.astro#L417)
