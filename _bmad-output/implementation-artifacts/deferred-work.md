# Deferred Work

<!-- Append-only. One entry per deferred goal. Do not modify or delete existing entries. -->

- source_spec: `_bmad-output/specs/spec-ameland-weekend/stories/1-project-scaffold-stack-setup.md`
  summary: DB migration runner implementation (`scripts/migrate.mjs`) — transactional `Pool`/`pg`-based apply, `_migrations` bootstrap, prod-migration verification.
  evidence: Split from story 1's scaffold spec to fit the token scope target after code-review corrections (transactional-DDL fix, ledger-bootstrap ownership, prod-apply path) grew the spec substantially. The convention itself (numbered SQL files, transactional apply, `_migrations` ledger, manual prod step) stays documented in story 1's `migrations/README.md`. Only the runner script's implementation is deferred — independently shippable/testable (`pnpm migrate` against a scratch DB) and doesn't block story 1's own build/dev/typecheck acceptance criteria. Must land before whichever later story (3, 5, 8, or 9) first needs a real table.

- source_spec: `_bmad-output/specs/spec-ameland-weekend/stories/1-project-scaffold-stack-setup.md`
  summary: `public/manifest.json` isn't functional yet — its `icons` reference `/icons/icon-192.png`/`icon-512.png`, neither of which exist, and its `start_url: "/"` points at a route no page currently serves.
  evidence: Surfaced by review of story 1's diff. Expected and harmless today (the spec explicitly scoped the manifest as "minimal valid, not yet linked from any page" — story 7 wires it up for real per the Structural Seed), but worth an explicit note so story 7 doesn't have to rediscover both gaps from scratch: it needs real icon assets and either a working root route or a corrected `start_url`.

- source_spec: `_bmad-output/specs/spec-ameland-weekend/stories/1-project-scaffold-stack-setup.md`
  summary: `src/content.config.ts`'s `generateId` casts `data.slug` without validating it exists/is a non-empty string first, and nothing detects two trip files resolving to the same slug.
  evidence: Surfaced by edge-case review of story 1's diff. Not reachable today — `src/content/trips/` has no JSON files yet — so nothing to break, but a malformed or colliding slug in a real content file (story 2's single entry, or story 10's second trip) would currently fail with a confusing loader-level error instead of a clear message. Worth hardening when story 2 or 10 lands.

- source_spec: `_bmad-output/specs/spec-ameland-weekend/stories/1-project-scaffold-stack-setup.md`
  summary: `src/content.config.ts` has no cross-validation between a chapter's `kind` ('cinematic'|'knap') and its `svgVariant` — a 'knap' chapter could be assigned a cinematic-only `svgVariant` value with no schema error.
  evidence: Surfaced by edge-case review of story 1's diff. AD-7 doesn't explicitly mandate a strict kind/svgVariant pairing, so this needs a product decision (should it be enforced?) before adding the constraint — relevant once story 2 authors real content and picks real `svgVariant` values.

- source_spec: `_bmad-output/specs/spec-ameland-weekend/stories/1-project-scaffold-stack-setup.md`
  summary: No linter/formatter (ESLint/Prettier) or pre-commit hook is set up; no root-level `README.md` exists as a human-facing entry point (AGENTS.md is agent-scoped, SETUP.md covers only manual cloud provisioning).
  evidence: Surfaced by review of story 1's diff. Reasonable tooling/docs improvements, explicitly out of this story's scope (the approved spec didn't call for either) — worth picking up whenever convenient, not blocking any later story.

- source_spec: `_bmad-output/specs/spec-ameland-weekend/stories/1-project-scaffold-stack-setup.md`
  summary: `SETUP.md`'s secret-generation steps assume `openssl` is on PATH, with no fallback noted for a stock Windows shell without Git Bash/WSL.
  evidence: Surfaced by review of story 1's diff. Real onboarding gap given the project owner is on Windows, but low urgency since `SETUP.md` is manual/one-time documentation, not executed code — worth a one-line fallback note whenever someone next touches that file (e.g. alongside story 4 or 8, which are the first to actually need those secrets).

- source_spec: `_bmad-output/specs/spec-ameland-weekend/stories/2-content-config-data-model-ameland-content.md`
  summary: `svgVariant`'s "knap" enum values (`knap-vrijdag`, `knap-zondag`) have no documented rendering behavior anywhere — `BUILD_BRIEF.md`'s animation-systems section only describes the three cinematic treatments. Related to, but distinct from, the kind/svgVariant cross-validation gap already tracked above (that entry is about the schema not *enforcing* a pairing; this one is that the "knap" values' actual visual meaning isn't written down anywhere at all).
  evidence: Surfaced by blind-hunter review of story 2's real content authoring (`ameland-weekend.json`), which is the first content entry to actually pick concrete `svgVariant` values (`knap-vrijdag` for Vrijdag, `knap-zondag` for Zondag, by convention only). Doesn't block story 2, but story 3, which implements the actual rendering, will need the semantics documented before it can build against them.

- source_spec: `_bmad-output/specs/spec-ameland-weekend/stories/2-content-config-data-model-ameland-content.md`
  summary: `TripContent` has no structured trip-end date/time — only `startDate` is modeled, and the actual return time ("16:00 — Boot terug naar het vasteland") only exists as free text inside `zondag.description`.
  evidence: Surfaced by blind-hunter review of story 2's real content authoring. Not a blocker for any current story, but if a future story needs to know when the trip ends (stopping the countdown, archiving the page, showing a "trip has ended" state), there's currently no field to source that from other than parsing prose — would need a schema change (`endDate` or similar) rather than a content-only fix.

- source_spec: `_bmad-output/specs/spec-ameland-weekend/stories/3-public-trip-page-static-shell-gating-redaction.md`
  summary: `pnpm dev` does not reliably load `DATABASE_URL` from `.env.development` into `process.env` on this machine — `getSql()` (`src/lib/db.ts`, story 1) throws "DATABASE_URL is not set" until the var is exported directly in the shell before launching `astro dev`. `pnpm migrate` is unaffected (it has its own manual `.env`/`.env.local`/`.env.development` loader).
  evidence: Surfaced during story 3's manual verification — the first story with a live DB-reading dev route, so the first to actually exercise `getSql()` under `astro dev`. Root cause not fully isolated (possibly Vite/Astro env-file loading vs. the local Node 25 runtime vs. the pinned 24.x engine); reproducible by running `pnpm dev` fresh (after `astro dev stop`) without exporting `DATABASE_URL` first, then hitting any route that calls `getSql()`. Not a story-3 defect — story 3 reused `getSql()` exactly as the spec's Code Map directed — but worth a fix (or at least a documented workaround in SETUP.md) before story 4/5/8/9 hit the same wall locally.

- source_spec: `_bmad-output/specs/spec-ameland-weekend/stories/3-public-trip-page-static-shell-gating-redaction.md`
  summary: No verification of any kind (automated or manual-and-recorded) permanently exercises the default-to-locked/redaction behavior in `getTripState`/`redactTripState` — a future regression flipping the `?? false` default or inverting the redaction ternary would silently leak all trip content to the public.
  evidence: Raised independently by story 3's verification-gap review. Repo-wide search confirms zero test files anywhere (`*.test.*`/`*.spec.*`) and nothing imports `getTripState`/`redactTripState` outside their own module and the route that uses them. This story's own manual verification (curl + DB insert/delete) confirmed the behavior is currently correct, but that check doesn't repeat itself for future changes. Consistent with this project's documented "no automated test suite, v1 is manual QA" non-goal, so not something to force into this story — but worth recording as a known trade-off on the exact logic this story's name ("gating-redaction") exists to guarantee.

- source_spec: `_bmad-output/specs/spec-ameland-weekend/stories/3-public-trip-page-static-shell-gating-redaction.md`
  summary: `scripts/migrate.mjs` has no safety rail (dry-run, confirmation, or explicit flag) before applying DDL to whatever `DATABASE_URL` currently points at — the documented prod usage is a bare `DATABASE_URL=<prod-connection-string> pnpm migrate`.
  evidence: Raised independently by two of story 3's three review layers. The manual-apply-to-prod workflow itself was already established in story 1's `migrations/README.md`, but story 3 is what actually builds the runner that makes this a live risk rather than a documented-only convention. A copy-paste or env mistake could apply a migration to prod unintentionally with no second check.

- source_spec: `_bmad-output/specs/spec-ameland-weekend/stories/3-public-trip-page-static-shell-gating-redaction.md`
  summary: The public trip page's CSS declares `Space Grotesk`, `JetBrains Mono`, and `Bodoni Moda` font-families throughout, but none are actually loaded (no `<link>`, `@font-face`, or `@import`) — they silently fall back to system fonts.
  evidence: Raised by story 3's blind-hunter review. Story 3 is the first story to reference these brand fonts in real (non-mockup) markup/CSS; no earlier story addressed a font-loading strategy either. Cosmetic only — the page remains fully functional and legible — but worth a real fix (Google Fonts `<link>` or self-hosted files) whenever visual fidelity to the mockup is prioritized; the choice of hosting approach wasn't part of this story's scope.

- source_spec: `_bmad-output/specs/spec-ameland-weekend/stories/3-public-trip-page-static-shell-gating-redaction.md`
  summary: `chapter.svgVariant` is threaded through `TripChapterState`/the API response but never consumed by the client merge script in `[trip]/index.astro`; the page's own header comment claims it "arrives client-side," which overstates what actually happens today.
  evidence: Raised by story 3's blind-hunter review. Not a bug in this story's own scope — illustration rendering is tied to the animation system, explicitly deferred to story 6 by this story's own Never clause — but the comment should be corrected (or the field put to use) once story 6 actually consumes `svgVariant`, so it doesn't keep overclaiming in the meantime.

- source_spec: `_bmad-output/specs/spec-ameland-weekend/stories/3-public-trip-page-static-shell-gating-redaction.md`
  summary: `getTripState` casts the raw Neon query result (`chapter_id`/`unlocked` columns) with `as {...}` and no runtime shape validation — a future `chapter_unlocks` schema drift (renamed/retyped column) would type-check but silently return wrong data at runtime.
  evidence: Raised by story 3's blind-hunter review. Not currently triggered by anything in this diff — the table and the query were authored together and match today — but worth hardening if the table's schema is ever changed independently of this read path (e.g. by a future migration from story 5/8/9 that doesn't also touch `trip-state.ts`).

- source_spec: `_bmad-output/specs/spec-ameland-weekend/stories/5-admin-unlock-toggles.md`
  summary: If a chapter toggle POST fails (401/expired session, network error), the admin page shows an inline row error but never redirects/prompts back to the passcode form — the organizer has no clear signal that the fix is to log in again.
  evidence: Raised by blind-hunter review of story 5's diff. Technically satisfies the spec's stated AC ("a failed request... shows an inline error... leaves the switch in its prior state") but a stale/expired session mid-editing session is a real scenario (90-day cookie can still expire or be cleared) worth a clearer recovery path later.

- source_spec: `_bmad-output/specs/spec-ameland-weekend/stories/5-admin-unlock-toggles.md`
  summary: The admin page's always-on Paklijst row renders only the right-side "altijd aan" pill; `Admin.dc.html`'s reference mockup also gives that row a heading-level "Altijd zichtbaar" tag matching the chapter rows' `.chapter-tag` styling, which story 5's spec didn't carry into its Boundaries.
  evidence: Raised by blind-hunter review of story 5's diff. Purely cosmetic parity gap with the mockup, not a functional defect — the row is still clearly non-toggleable and correctly never writes.

- source_spec: `_bmad-output/specs/spec-ameland-weekend/stories/5-admin-unlock-toggles.md`
  summary: Neither the admin chapter-toggle fetch (story 5) nor the passcode-login fetch (story 4) has a request timeout/`AbortController` — a hung network request leaves the button disabled indefinitely with no error shown.
  evidence: Raised by edge-case-hunter review of story 5's diff. Mirrors an existing pattern from story 4's login fetch rather than a new risk introduced here; worth a systemic fix across both call sites together rather than singling one out.

- source_spec: `_bmad-output/specs/spec-ameland-weekend/stories/5-admin-unlock-toggles.md`
  summary: The admin page has no cross-tab/cross-admin sync for chapter-unlock state — if a chapter is toggled from another tab or by a second organizer, an already-open admin page silently goes stale until manually reloaded.
  evidence: Raised by blind-hunter review of story 5's diff. Distinct from story 8's guest-facing push+postMessage broadcast (epic-context requirement, public page only) — no equivalent requirement exists for the admin view. Low likelihood given a single shared admin passcode and a small friend group, but a real gap if two people ever co-administer simultaneously.

- source_spec: `_bmad-output/specs/spec-ameland-weekend/stories/7-pwa-installability.md`
  summary: `public/manifest.json`'s `name`/`short_name` and the page `<title>`/app icon are all hardcoded to "Ameland Vriendenweekend", with no per-trip mechanism — a second trip added under CAP-7 (story 10) would render with correct per-trip accent colors everywhere but the wrong PWA name/icon in the manifest, tab title, and install prompt.
  evidence: Raised by blind-hunter review of story 7's diff. Pre-existing in shape (manifest.json predates this story; `<title>` was already static) and consistent with the epic's explicit non-goal of multi-tenant support for v1 — but worth flagging before story 10 actually validates CAP-7's "zero code changes for a second trip" claim, since PWA metadata is a real exception to that claim as currently built.

- source_spec: `_bmad-output/specs/spec-ameland-weekend/stories/7-pwa-installability.md`
  summary: No favicon (`<link rel="icon">`/`favicon.ico`) exists anywhere in the page, even though this story added real app-icon assets for installability — desktop browser tabs/bookmarks remain iconless.
  evidence: Raised by blind-hunter review of story 7's diff. Pre-existing gap (no earlier story addressed a favicon either), unrelated to this story's PWA-installability scope, but the newly-created icon assets make it cheap to close whenever someone next touches the page's `<head>`.

- source_spec: `_bmad-output/specs/spec-ameland-weekend/stories/7-pwa-installability.md`
  summary: `public/sw.js`'s `fetch` handler unconditionally calls `event.respondWith(fetch(event.request))` with no offline fallback — if the network request rejects (e.g. offline), the browser shows its default network-error page rather than any app-controlled offline state.
  evidence: Raised independently by both the blind-hunter and edge-case-hunter review layers on story 7's diff. Explicitly out of this story's scope ("Never: ... no caching strategy" per the approved spec) and no worse than the pre-SW baseline (no service worker also meant no offline handling), but worth a real fallback response once story 8 extends this same file with push logic and offline behavior becomes more visible to users.

- source_spec: `_bmad-output/specs/spec-ameland-weekend/stories/9-packing-list.md`
  summary: The packing overlay (`role="dialog" aria-modal="true"`) has no focus trap — Tab/Shift+Tab can move focus out of the open sheet onto background page content, even though `aria-modal` claims otherwise.
  evidence: Raised independently by the blind-hunter and edge-case-hunter review layers on story 9's diff. The story's spec explicitly scoped a11y to native-checkbox semantics, `aria-hidden` on decorative SVGs, and Escape-to-close-with-focus-return (all implemented and verified) but never called for a full WCAG APG focus-trap pattern. A real gap for keyboard/screen-reader users, but implementing a correct trap (enumerating focusable elements, cycling Tab/Shift+Tab, restoring on close) is more than a one-line fix — worth its own considered pass rather than folding into this story's patch round for a small trusted-friend-group app.

- source_spec: `_bmad-output/specs/spec-ameland-weekend/stories/9-packing-list.md`
  summary: An empty `packingList` (zero items) renders the packing button/overlay with header and copy text but no items and no empty-state message.
  evidence: Raised independently by the blind-hunter and edge-case-hunter review layers on story 9's diff. Not reachable by the current Ameland trip content (5 items), but the schema's `.refine()` only enforces id-uniqueness, not a minimum length, so a future CAP-7 trip entry (story 10) with an empty packing list would hit this. Cheap to add later (a simple "Nog geen paklijst." fallback), not blocking this story's acceptance criteria.

- source_spec: `_bmad-output/specs/spec-ameland-weekend/stories/8-push-notifications.md`
  summary: `public/sw.js` has no `pushsubscriptionchange` handler — if the browser/push service silently rotates or invalidates a subscription outside of an actual push delivery, the old `push_subscriptions` row just goes dead with no resubscribe/re-POST and no server-side signal.
  evidence: Raised by blind-hunter review of story 8's diff. Not a trivial fix (the service worker has no page context to read `tripSlug` from on this event; it would need to be persisted, e.g. via IndexedDB, at subscribe time). Given this app's usage window is a single ~4-day trip, the odds of a subscription rotating mid-trip are low — worth a real fix only if this becomes a longer-lived or reusable-template deployment (story 10).

- source_spec: `_bmad-output/specs/spec-ameland-weekend/stories/8-push-notifications.md`
  summary: The public page's subscribe control treats `pushManager.getSubscription()` returning a value as proof the guest is subscribed, with no check that the corresponding `push_subscriptions` row still exists server-side (e.g. after a 404/410 cleanup deleted it) — the two can silently desync with no reconciliation path.
  evidence: Raised by blind-hunter review of story 8's diff. Same root cause family as the missing `pushsubscriptionchange` handling above; fixing both together (verify-with-server-on-load, resubscribe-on-change) is a more coherent unit of work than patching either in isolation.

- source_spec: `_bmad-output/specs/spec-ameland-weekend/stories/8-push-notifications.md`
  summary: The "Meldingen aanzetten" button always renders the same call-to-action on page load regardless of actual subscription state — the already-subscribed check only runs inside the click handler, so a returning subscribed guest has to click before learning they're already opted in.
  evidence: Raised by blind-hunter review of story 8's diff. UX polish, not a functional bug (the click handler already handles this state correctly, just one click later than ideal) — deferred rather than patched now to avoid touching the subscribe flow's control flow again right after this story's own review round.

- source_spec: `_bmad-output/specs/spec-ameland-weekend/stories/8-push-notifications.md`
  summary: `POST /api/push/subscribe` is an intentionally public/unauthenticated write (AD-3) with no rate limiting and no length bounds on `endpoint`/`p256dh`/`auth`/`tripSlug` (only non-emptiness is checked) — open to unbounded row growth from abuse.
  evidence: Raised by blind-hunter review of story 8's diff. Low real-world risk today (an obscure URL shared with a small trusted group, no public listing), but worth revisiting if story 10's reusable-template work ever makes this a more public-facing product.

- source_spec: `_bmad-output/specs/spec-ameland-weekend/stories/8-push-notifications.md`
  summary: `push/subscribe`'s `endpoint` validation only restricts the URL scheme to `https:` (closing the classic http-only cloud-metadata SSRF vector), not the host — any `https://` URL is accepted and later fetched server-side from `src/lib/push.ts` on every chapter unlock, leaving a residual SSRF surface against other internal/external https-only services.
  evidence: Raised by blind-hunter review of story 8's diff; the scheme restriction was a deliberate, spec-documented partial mitigation ("shrinks the SSRF surface"), not a claimed full fix. A real host allowlist would need to enumerate every browser push-service origin (FCM, Mozilla autopush, Apple, Windows Notification Hub, etc.) and risks breaking legitimate subscriptions if incomplete — a deliberate trade-off to revisit if this app's exposure grows beyond a small trusted group.

- source_spec: `_bmad-output/implementation-artifacts/spec-packing-list-content-update.md`
  summary: The packing-list bottom sheet has no packed/total progress indicator and no per-category collapse, even though the list grew from 5 flat items to ~45 items across 6 categories — it's now a long uninterrupted scroll.
  evidence: Raised by blind-hunter review of this content update's diff. Directly caused by the item-count increase in this change, but is a UX enhancement (not a defect) requiring its own design decision (progress bar? collapsible sections? "hide packed items"?) rather than a trivial patch — out of scope for a content-only update.

- source_spec: none (surfaced during REVEAL.md party-mode review, 2026-09-15)
  summary: Non-ASCII characters in `src/content/trips/moapmoap.json` (em dashes, "é", "â", the newly-added "°" in bestemming's `revealData.coordinate`) come back mojibake'd through `GET /api/trip/[slug]` on the `design/cinematic-fullbleed` preview deployment — e.g. "°" renders as "Â°". Confirmed NOT a bad file on disk: raw bytes at both the pre-existing "Grândyk" location and the newly-added coordinate are correct UTF-8 (0xC3 0xA2, 0xC2 0xB0 respectively). Something between the content-collection read and the JSON response is decoding UTF-8 as Latin-1 somewhere in this deployment's pipeline.
  evidence: Found while verifying the reveal's gated `revealData` field reaches the client correctly (it does) — the corruption is unrelated to that change and predates it (pre-existing fields are affected too, fields nobody touched this session). Deliberately not chased down yet — user asked to keep building REVEAL.md and come back to this before final ship. Needs root-causing against Astro's content-layer/Vercel build output before the 18th, since it affects real guest-facing text today.
