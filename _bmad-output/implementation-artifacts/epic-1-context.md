# Epic 1 Context: Ameland Vriendenweekend PWA

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Turn the already-locked visual/interaction design (Claude Design canvas mockups) into a real, working progressive-reveal PWA for a secret surprise trip to Ameland (2–4 Oct 2026): guests see only the chapters the organizer has unlocked, get a push notification the instant a new chapter is revealed, can install the site to their home screen, and can check off a packing list (tracked per-device, AD-6) throughout — while the organizer has a passcode-gated admin view showing everything, including locked chapters, with per-chapter unlock toggles. The build is also the reference implementation of a reusable trip template (a second trip must be addable as pure content, no code changes). Everything must be ready for a co-organizer review checkpoint on 2026-09-14, after which the link goes out to the rest of the group.

## Stories

- Story 1.1: Project scaffold & stack setup
- Story 1.2: Content-config data model + Ameland content
- Story 1.3: Public trip page: static shell + gating/redaction
- Story 1.4: Admin auth
- Story 1.5: Admin unlock toggles
- Story 1.6: Tiered animation system port
- Story 1.7: PWA installability
- Story 1.8: Push notifications
- Story 1.9: Packing list (per-device)
- Story 1.10: Reusable-template validation

## Requirements & Constraints

- v1 is one-way: organizer publishes/unlocks, guests only consume. Only two things are ever server-mutable: chapter `unlocked` flags and push subscriptions — all other trip content lives only in static authored content, never the database. Packing-list checked-state is tracked client-side only (per-device `localStorage`, AD-6), never touching the database.
- A locked chapter's real title/description/time/location/illustration must never appear in page source or any network response, and must be redacted server-side (never via CSS or a client-only flag). Unlocking must flip visibility on already-open tabs without a manual reload.
- Admin access is a single shared passcode (env var) with a long-lived (90-day) signed httpOnly cookie and per-IP throttling (max 5 attempts/15 min, then 429) — no user accounts or OAuth.
- The packing list always renders in full regardless of lock state; each device tracks its own checks independently (no shared/synced state, no lost-update concern since there's no shared write).
- Three chapters (Bestemming, Blokarten, Brouwerij) get full cinematic scroll-triggered choreography, replayable on demand; Vrijdag and Zondag stay polished-but-restrained ("knap") — this tiering is permanent. Every animated element must respect `prefers-reduced-motion` by snapping to its end state.
- A second trip must be addable as a new content entry (slug, accent color, chapters, packing list) with zero route/component/schema code changes — a genuinely new illustration treatment is the only allowed exception.
- Non-goals: two-way guest interaction, guest accounts/identity, real photo/video assets, an MP4 teaser pipeline, an automated test suite (v1 is manual QA), multi-organizer/multi-tenant support. Sunday's program is intentionally unconfirmed content, not a build gap.

## Technical Decisions

- Stack is pinned: Astro (latest 7.x — 7.0 shipped 2026-06-22, pin the exact patch at implementation start), hand-written web manifest + service worker (no PWA build plugin), PushForge for VAPID Web Push, Vercel Functions on the Node.js runtime, Neon Postgres via the Vercel Marketplace integration (dev/prod branches, no separate staging).
- Rendering mode: the app runs in server output mode overall (it's DB-backed via its API routes), with the trip page's shell explicitly opted back into static prerendering and every API route plus the admin page explicitly opted out of it — file-level, not relying on any framework default.
- Content is authored via the current Content Layer API (a `glob()` loader over one JSON file per trip, scoped so it can't pick up stray non-content files) — not the older config-plus-type pattern, which no longer works under this Astro version. A trip's identity comes from a `slug` field in its data, not from its filename.
- Two-layer data model: `TripContent` (static, versioned — slug, startDate, accentColor, chapters with id/order/kind/title/time/location/description/svgVariant, packingList) never contains `unlocked` or checked-state, in any form, even as a seed default; `TripState` (API response) merges it with live-read `{chapters: {id: {unlocked}}}` from Neon, defaulting false when absent. Packing-list checked-state is never part of `TripState` — it's computed client-side from `localStorage` (AD-6).
- Chapter ids are a stable public contract: they double as the Neon foreign key story 5 keys unlock rows on, must be unique, and renaming one orphans existing DB state. `packingList[].id` is likewise stable but is a `localStorage` key contract, not a DB one — renaming one orphans guests' locally-saved checks instead.
- Chapter ids stay the existing Dutch slugs (bestemming, vrijdag, blokarten, brouwerij, zondag) — load-bearing DOM ids the animation system targets directly; don't translate them. `svgVariant` is a closed, code-defined enum; reusing an existing treatment is content-only, a new one is a code change. Push subscriptions carry a `tripSlug` (per-trip, no carry-over).
- All three API routes (`trip/[slug]`, `admin/toggle`, `push/subscribe`) share one JSON envelope: `{ok: true, data}` / `{ok: false, error}`; dates are ISO 8601. There is no `packing/check` route — packing state never leaves the client (AD-6).
- The same server transaction that flips a chapter unlocked must fan out the Web Push notification (no separate/scheduled path); a 404/410 from the push service deletes that subscription in the same fan-out (the only cleanup path). The service worker both shows an OS notification and broadcasts `postMessage` to open tabs to re-fetch trip state — the push payload is never used as a state-transport channel.
- A migration convention (plain SQL files or a minimal tool) must be picked once at scaffold and reused by every story that adds a table/column.

## UX & Interaction Patterns

- Existing brand tokens (Space Grotesk/Bodoni Moda/JetBrains Mono fonts, dark palette, configurable accent color, macro-whitespace, custom easing, GPU-safe transform/opacity-only animation) are fixed, not reinvented.
- The existing reveal system (IntersectionObserver-gated `.reveal`/`.cinematic-reveal`, staggered-delay cascades, per-element cinematic text choreography, oversized-dasharray SVG line-draw, nested-`<g>` transform pattern) must transfer unchanged.
- A single persistent `position:fixed` "viewfinder" layer runs an ambient scan loop at all times; scrolling `#bestemming` into view switches that same layer into a scripted zoom/lock/dive sequence — one continuous layer, not per-section instances. SVG roots need explicit `overflow: visible` wherever scaled content must escape their box (default UA clipping is a previously-debugged pitfall).
- Replay ("Bekijk opnieuw") removes `.is-visible`, forces a reflow, then re-adds the class via `requestAnimationFrame`. Android/iOS install instructions use manual user-selected toggles, deliberately not `beforeinstallprompt` auto-detection. No mockup exists for the admin login screen — build it minimal and on-brand rather than inventing new visual language.

## Cross-Story Dependencies

- Story 1.1's migration convention and env vars are relied on by 1.3, 1.5, and 1.8 (story 1.9 no longer touches the DB — packing state is client-side only, AD-6). Story 1.2's content entry is the fixture every later story renders against.
- Story 1.5 builds `admin/toggle.ts` for unlock-only writes; story 1.8 extends that same route/transaction with push fan-out. Story 1.3 builds only the ambient viewfinder loop; story 1.6 adds the Bestemming-triggered scripted sequence on top.
- Story 1.6 must be verified via story 1.5's real admin toggle, not by hand-editing the database.
- Story 1.10 is the acceptance gate for the whole epic: proves CAP-7 (second trip, zero code changes) and runs the final real-device smoke test across all preceding stories.
