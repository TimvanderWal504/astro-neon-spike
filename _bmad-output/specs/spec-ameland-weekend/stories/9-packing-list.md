---
title: 'Packing list (per-device)'
type: 'feature'
created: '2026-08-30'
status: 'done'
review_loop_iteration: 0
baseline_commit: 'c5ba410474aa329579cd06a9b11a541d3b02c5d5'
context:
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-MoapMoap-2026-08-24/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The trip page has no packing-list UI at all. Per AD-6 (reversed during this story's planning, 2026-08-30), checked state is tracked per-device — there is no server write path.

**Approach:** Port the floating "Paklijst" button + bottom-sheet checklist from `Main.dc.html`, rendering items from the already-loaded static `packingList` content. Checked state is read/written via `localStorage` only, keyed by trip slug — no DB table, no API route.

## Boundaries & Constraints

**Always:** The packing button/overlay renders unconditionally, independent of any chapter's lock state (AD-2). Item ids/labels come from static `trip.data.packingList` — no fetch needed. Checked state lives only in `localStorage`, keyed per trip (AD-6). Reuse existing brand tokens — no new visual language; translate `Main.dc.html`'s pseudo-framework to plain DOM class toggling (story 7's approach), copy verbatim in Dutch. Port the overlay's `max-height`/`overflow-y:auto` scroll (CAP-7: future trips' lists may exceed today's 5 items). `z-index` must clear `.hero-map-dive` (`index.astro:156`, also `z-index: 50`, story 6's cinematic dive layer) — the mockup's own 50/60 values collide with it; go higher. Checklist rows need real a11y semantics from the start — native `<input type="checkbox">` or `role="checkbox"`/`aria-checked`, plus `aria-hidden` on decorative SVGs (story 7's review added this after the fact; don't repeat that round-trip). The overlay is an accessible dismissible panel: Escape closes it and focus returns to the floating button, alongside the mockup's backdrop-click/close-button.

**Ask First:** None — the per-device reversal was confirmed earlier in this session; no open decisions remain.

**Never:** No DB table, no API route, no network request for packing state — if a `packing/check.ts` stub exists from earlier scaffolding, delete it rather than wiring it up. Do not gate the packing section behind chapter lock state.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Toggle an item | Click checkbox | `localStorage` updated immediately, UI reflects new state | N/A |
| First visit, no stored state | Page loads | Every item renders unchecked | N/A |
| Reload same browser | Page loads | Previously checked items still show checked | N/A |
| `localStorage` unavailable/throws | Private mode, storage disabled | Checklist still renders and is clickable this session | Swallow — no console error, no user-facing failure |
| All chapters locked | Trip page loads | Packing button/overlay still fully visible and interactive | N/A |

</frozen-after-approval>

## Code Map

- `design/ameland-weekend/Main.dc.html:590-699` -- floating "Paklijst" button, bottom-sheet overlay, and checklist markup/state logic to port (mockup's component pseudo-framework -> plain DOM).
- `src/pages/[trip]/index.astro:22-33` -- frontmatter only destructures `accentColor`/`startDate`/`slug`/`chapterSlots` from `trip.data` today; `packingList` is **not** pulled out yet — add `const packingList = trip.data.packingList;` here (it's static, non-gated content, exempt from the file's chapter-content-gating comment at lines 5-9, which applies only to chapters).
- `src/pages/[trip]/index.astro:1929` area -- existing client `<script>` block (installeren toggle) to add the packing click-handlers/localStorage logic alongside, same file/pattern.
- `src/pages/api/packing/check.ts` -- delete; this route no longer exists per AD-6.
- `src/pages/[trip]/index.astro:1889-1919` -- `loadTripState()` unaffected; packing state was never part of `TripState` and stays that way.
- `src/pages/[trip]/admin.astro:310-320` -- existing static "Paklijst" row (`always-on-badge`, "Altijd zichtbaar, vanaf dag één") from story 5 — a decorative label only, no toggle, no wiring to any state. Already correct for the per-device model; out of scope, do not modify.

## Tasks & Acceptance

**Execution:**
- [x] Delete `src/pages/api/packing/check.ts` -- server never handles packing state (AD-6)
- [x] `src/pages/[trip]/index.astro` -- add floating "Paklijst" button + bottom-sheet overlay (ported from `Main.dc.html:590-620`), checklist items rendered from `trip.data.packingList` -- static markup, always visible
- [x] `src/pages/[trip]/index.astro` (client script) -- on load, read `packingChecked:{tripSlug}` from `localStorage` (try/catch, swallow failures) and apply checked visuals; click handler toggles an item's checked state, updates the DOM, and writes the updated map back to `localStorage` -- client-only persistence
- [x] Manually cover the I/O matrix scenarios above (no automated test suite in project scope)

**Acceptance Criteria:**
- Given the trip page loads with every chapter locked, when it renders, then the packing button/overlay is fully visible and interactive regardless.
- Given a guest checks an item and reloads the same browser, when the page loads again, then the item still shows checked.
- Given `localStorage` is unavailable or throws, when the page loads, then the checklist still renders and is clickable, with no console error or visible failure — it just won't persist across reload.

## Spec Change Log

## Design Notes

Wrap all `localStorage` reads/writes in try/catch and swallow failures silently — same graceful-degradation convention as story 7's guarded service-worker registration. Key scheme: one JSON blob per trip, `packingChecked:{tripSlug}` -> `{[itemId]: boolean}`, not one key per item, so it's trivial to inspect/clear as a unit.

## Verification

**Commands:**
- `pnpm typecheck` && `pnpm build` -- expected: both succeed.

**Manual checks:**
- Lock every chapter via admin; confirm the packing button/overlay still renders fully and is checkable.
- Check a few items, reload the page: confirm they're still checked in the same browser.
- Open the trip in a different browser/incognito window: confirm the list starts unchecked (not shared).
- Scroll `#bestemming` into view to trigger the cinematic dive sequence: confirm the packing button stays visible/on top, not buried under `.hero-map-dive`.
- Open the overlay, press Escape: confirm it closes and focus returns to the floating button.

## Suggested Review Order

**Client-side persistence (entry point — the core design decision)**

- Read-modify-write is done fresh at write time, not off a stale snapshot — closes a cross-tab lost-update race caught in review.
  [`index.astro:2195`](../../../../src/pages/%5Btrip%5D/index.astro#L2195)

- `readPackingChecked` rejects arrays as well as non-objects, so a corrupted stored value can't silently drop future writes.
  [`index.astro:2153`](../../../../src/pages/%5Btrip%5D/index.astro#L2153)

- `writePackingChecked` swallows failures silently (private mode / storage disabled) — checklist stays interactive, just doesn't persist.
  [`index.astro:2166`](../../../../src/pages/%5Btrip%5D/index.astro#L2166)

- One JSON blob per trip slug, not one key per item — trivial to inspect/clear as a unit.
  [`index.astro:2149`](../../../../src/pages/%5Btrip%5D/index.astro#L2149)

**Markup: floating button + dialog overlay**

- `packingList` pulled from static content here — previously not destructured, a gap caught during planning.
  [`index.astro:37`](../../../../src/pages/%5Btrip%5D/index.astro#L37)

- Floating trigger button, always rendered regardless of chapter lock state (AD-2).
  [`index.astro:1908`](../../../../src/pages/%5Btrip%5D/index.astro#L1908)

- Overlay uses `role="dialog" aria-modal="true"` with native `<input type="checkbox">` rows for real a11y semantics from the start.
  [`index.astro:1920`](../../../../src/pages/%5Btrip%5D/index.astro#L1920)

- Sheet subtitle copy — "Voorbeeldlijst" (placeholder wording) dropped in review since this now ships as real, live copy.
  [`index.astro:1928`](../../../../src/pages/%5Btrip%5D/index.astro#L1928)

**Interaction wiring: open/close/focus/keyboard**

- `openPacking` moves focus into the dialog (`packing-close` button) — added in review; opening previously left focus stranded on the trigger.
  [`index.astro:2201`](../../../../src/pages/%5Btrip%5D/index.astro#L2201)

- `closePacking` returns focus to the floating trigger button on any dismissal path.
  [`index.astro:2207`](../../../../src/pages/%5Btrip%5D/index.astro#L2207)

- Escape key closes the overlay, mirroring the mockup's backdrop-click and explicit close button.
  [`index.astro:2225`](../../../../src/pages/%5Btrip%5D/index.astro#L2225)

**Peripherals**

- `z-index: 65`/`75` deliberately clear `.hero-map-dive`'s `z-index: 50` (story 6) — the mockup's own 50/60 values would have collided.
  [`index.astro:574`](../../../../src/pages/%5Btrip%5D/index.astro#L574)

- `src/pages/api/packing/check.ts` deleted outright — no server write path exists for packing state under the reversed AD-6 (no line to link to; the file is gone).

- Stale comment fixed: `packingList[].id` is now documented as a `localStorage` key contract, not a Neon foreign key.
  [`content.config.ts:37`](../../../../src/content.config.ts#L37)

- AD-6 rewritten for the per-device reversal; cascading edits to AD-1/AD-3/AD-7/AD-8, the Consistency Conventions table, Structural Seed, and Deferred all flow from this one entry.
  [`ARCHITECTURE-SPINE.md:97`](../../../../_bmad-output/planning-artifacts/architecture/architecture-MoapMoap-2026-08-24/ARCHITECTURE-SPINE.md#L97)

- CAP-5 in the spec kernel updated to match (caught as a gap during code review — the architecture cascade initially missed this file).
  [`SPEC.md:35`](../../../../_bmad-output/specs/spec-ameland-weekend/SPEC.md#L35)
