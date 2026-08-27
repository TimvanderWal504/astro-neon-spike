---
title: 'Admin unlock toggles'
type: 'feature'
created: '2026-08-27'
status: 'done'
review_loop_iteration: 0
baseline_commit: 'ebcbb336ed3f9fe9df04f0c657f6ea413f4ab91f'
context:
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-MoapMoap-2026-08-24/ARCHITECTURE-SPINE.md'
  - '{project-root}/migrations/README.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `POST /api/admin/toggle` is a story-1 stub that always returns `501`, and `/[trip]/admin`'s authenticated view is a placeholder ("De hoofdstuk-toggles komen hier binnenkort.") with no chapter UI — so the organizer has no way to unlock a chapter, even though story 4's passcode gate already protects the route.

**Approach:** Replace the placeholder with a real chapter-row list (fetched unredacted via `getTripState`) plus one always-on "Paklijst" row, matching `Admin.dc.html`'s layout minus its planning-only review-gate banner. Wire each row's toggle to `POST /api/admin/toggle`, which re-verifies the session cookie itself, validates the chapter id against real content, and performs a single atomic upsert into the existing `chapter_unlocks` table — writing only the `unlocked` flag, no push fan-out (story 8 adds that later in the same transaction).

## Boundaries & Constraints

**Always:** `toggle.ts` independently re-verifies the session cookie (same lazy `process.env.COOKIE_SIGNING_SECRET` read + `verifySession` pattern as `admin.astro`/`login.ts`) before touching the DB; unauthenticated requests get `401` via `jsonError` with no DB call. Malformed JSON, or a missing/wrong-typed `tripSlug`/`chapterId`/`unlocked` (must be strict `boolean`, no truthy coercion), returns `400`, not counted or written. `tripSlug` must resolve to a real trip in content (the session cookie is global, not trip-scoped, so an unknown `tripSlug` is only caught here) and `chapterId` must be validated against that trip's real content chapter ids before writing — either failure is `400`. The whole handler is wrapped in try/catch with `console.error` on failure, matching `login.ts`'s convention, so a thrown DB/content error still returns a clean `500` via `jsonError` rather than an unhandled exception. The write is a single atomic upsert (`INSERT ... ON CONFLICT (trip_slug, chapter_id) DO UPDATE ... RETURNING unlocked`, never SELECT-then-write), isolated as its own function (e.g. `setChapterUnlocked` in `trip-state.ts`) so story 8 can later wrap it plus a fan-out call in one transaction without restructuring `toggle.ts`'s auth/parsing/response logic. Responses use `jsonOk`/`jsonError` (AD-8 envelope), matching `trip/[slug].ts`. `admin.astro` renders exactly one row per real chapter (unredacted `getTripState`, sorted by `order`) plus exactly one static always-on "Paklijst" row — never one row per packing item, and the Paklijst row never triggers a write. Each toggle is a real `<button>` with `aria-pressed` reflecting unlocked state (not a div-only visual switch, per `Admin.dc.html`'s mockup) so it isn't screen-reader-inaccessible. A toggle flip disables that row's switch until the server responds, then reflects the actual response (confirm, don't optimistically assume success); a failed request shows an inline error and leaves the switch in its prior state. `prerender = false` and the existing `Cache-Control: private, no-store` on `admin.astro` stay as-is.

**Ask First:** This project has no existing no-JS/progressive-enhancement pattern for admin actions (the login form is also JS-only) — if a no-JS fallback for toggling seems warranted, halt and ask rather than inventing one.

**Never:** Add push fan-out or touch `src/lib/push.ts`/`push/subscribe` (story 8's scope). Add packing-list checked-state writes (story 9's scope) — Paklijst here is display-only. Add a new migration — `chapter_unlocks(trip_slug, chapter_id, unlocked)` already exists from `migrations/0001_init.sql`. Reproduce `Admin.dc.html`'s "Compagnon-review gepland" banner (lines 35-41) — planning-only scaffolding for Tim, never part of the real build. Invent new visual language — reuse `admin.astro`'s existing tokens/classes.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Toggle on, no prior row | authenticated, `{tripSlug,chapterId:"bestemming",unlocked:true}`, chapter never toggled before | `200 {ok:true,data:{chapterId,unlocked:true}}`, row created | N/A |
| Toggle off, existing row | authenticated, `unlocked:false` | `200`, row updated | N/A |
| Unauthenticated | missing/tampered session cookie | `401 {ok:false,error}` | not written |
| Unknown tripSlug | `tripSlug` not a real trip | `400 {ok:false,error}` | not written |
| Unknown chapterId | id not in that trip's content | `400 {ok:false,error}` | not written |
| Malformed body | missing field / bad JSON / non-boolean `unlocked` | `400 {ok:false,error}` | not written |
| Concurrent toggles, same chapter | two requests race, off→on | atomic upsert leaves final state matching the last-processed request | no lost update |
| DB unavailable | `getSql()`/query throws | `500 {ok:false,error}` | fails closed |

</frozen-after-approval>

## Code Map

- `src/pages/api/admin/toggle.ts` -- REPLACE the 501 stub with the full POST handler (session verify, body validation, chapter-id validation, call `setChapterUnlocked`, `jsonOk`/`jsonError` responses).
- `src/lib/trip-state.ts` -- add `setChapterUnlocked(tripSlug, chapterId, unlocked): Promise<boolean>`, same atomic-upsert idiom as `admin-auth.ts`'s rate limiter (`checkRateLimit`), keyed on `chapter_unlocks`'s `(trip_slug, chapter_id)` PK.
- `src/pages/[trip]/admin.astro:134-136` -- replace the `admin-placeholder-copy` paragraph with a chapter-row list built from unredacted `getTripState(trip)` (sorted by `order`) plus one always-on Paklijst row; add row styles to the existing `<style>` block (lines 34-125) and a client script (alongside the existing one at lines 171-223) that POSTs to `/api/admin/toggle` and updates the row from the response.
- `design/ameland-weekend/Admin.dc.html:44-65,89-96` -- reference-only mockup for row layout and the always-on-row shaping logic; explicitly exclude lines 35-41 (review-gate banner).
- `src/lib/http.ts` -- reuse `jsonOk`/`jsonError` as-is.
- `src/lib/admin-auth.ts` -- reuse `SESSION_COOKIE_NAME`, `verifySession` as-is.
- `migrations/0001_init.sql` -- existing `chapter_unlocks` table; no new migration.

## Tasks & Acceptance

**Execution:**
- [x] `src/lib/trip-state.ts` -- add `setChapterUnlocked` atomic upsert -- isolates the write so story 8 can later wrap it in a transaction without touching `toggle.ts`.
- [x] `src/pages/api/admin/toggle.ts` -- replace stub with session-verified, validated POST handler calling `setChapterUnlocked` -- gates the write behind story 4's auth and matches the AD-8 envelope.
- [x] `src/pages/[trip]/admin.astro` -- fetch unredacted trip state, render the chapter-row list + always-on Paklijst row, wire toggle client script -- matches `Admin.dc.html`'s layout minus the excluded banner.

**Acceptance Criteria:**
- Given an authenticated admin session, when a chapter's toggle is switched on, then `GET /api/trip/[slug]` reflects that chapter unlocked, even if no row existed for it before.
- Given an unauthenticated `POST /api/admin/toggle`, when it's sent, then it returns `401` and writes nothing.
- Given the admin page renders, when the chapter list loads, then it shows exactly 5 chapter rows in content order plus exactly one static Paklijst row, and no review-gate banner appears anywhere.
- Given a toggle request fails (network/500), when the response returns, then the row's switch visibly reverts and an inline error shows, rather than silently desyncing from server state.

## Design Notes

`setChapterUnlocked` lives next to `getTripState` in `trip-state.ts` since both already share the `chapter_unlocks` table and `getSql()` access — keeping the upsert as a standalone exported function (not inlined in the route) is what lets story 8 later compose it into a `sql.transaction([...])` alongside a push fan-out call without touching `toggle.ts`'s request/auth/response shape.

## Verification

**Commands:**
- `pnpm typecheck` -- expected: passes.
- `pnpm build` -- expected: succeeds.

**Manual checks:**
- `curl -X POST /api/admin/toggle -d '{"tripSlug":"ameland-weekend","chapterId":"bestemming","unlocked":true}' -H 'content-type: application/json'` with no cookie -- `401`.
- Log in at `/ameland-weekend/admin`, toggle "Bestemming" on, then `curl /api/trip/ameland-weekend` -- chapter no longer redacted.
- Reload `/ameland-weekend/admin` -- toggle state persists across reload.

## Suggested Review Order

**Write path & concurrency safety**

- Single atomic `INSERT ... ON CONFLICT DO UPDATE ... RETURNING` upsert -- the whole reason two concurrent toggles of the same chapter can never lose an update.
  [`trip-state.ts:96`](../../../../src/lib/trip-state.ts#L96)

**Auth, validation & fail-closed responses (`toggle.ts`)**

- Session re-verified independently, before any DB call -- an unauthenticated request never reaches the write path.
  [`toggle.ts:14`](../../../../src/pages/api/admin/toggle.ts#L14)

- Strict-type body validation (`tripSlug`/`chapterId` non-empty strings, `unlocked` a real boolean, no truthy coercion).
  [`toggle.ts:42`](../../../../src/pages/api/admin/toggle.ts#L42)

- `tripSlug` resolved against real content -- the only place an unknown trip is caught, since the session cookie itself is global, not trip-scoped.
  [`toggle.ts:54`](../../../../src/pages/api/admin/toggle.ts#L54)

- `chapterId` validated against that trip's real chapters before the write.
  [`toggle.ts:62`](../../../../src/pages/api/admin/toggle.ts#L62)

- Whole handler wrapped in try/catch -- a thrown DB/content error still returns a clean `500`, matching `login.ts`'s convention.
  [`toggle.ts:69`](../../../../src/pages/api/admin/toggle.ts#L69)

**Admin page data fetch (fail-closed)**

- `getTripState` wrapped in try/catch -- a DB outage on an authenticated request falls back to the existing "not found" render path instead of an unhandled exception.
  [`admin.astro:29`](../../../../src/pages/%5Btrip%5D/admin.astro#L29)

**UI binding & accessibility**

- Chapter-row list built from unredacted `getTripState`, sorted by order, plus the one static always-on Paklijst row.
  [`admin.astro:254`](../../../../src/pages/%5Btrip%5D/admin.astro#L254)

- Toggle button is a real `<button aria-pressed>`, not a div-only switch, matching the mockup's visuals with real accessibility semantics.
  [`admin.astro:280`](../../../../src/pages/%5Btrip%5D/admin.astro#L280)

- Client toggle handler confirms the server response before updating the row (never optimistic), reverting and showing an inline error on failure.
  [`admin.astro:451`](../../../../src/pages/%5Btrip%5D/admin.astro#L451)

- `aria-label` kept in sync with the button's *next* action after every toggle, both initially and client-side -- avoids a stale "unlock" label after a chapter is already unlocked.
  [`admin.astro:409`](../../../../src/pages/%5Btrip%5D/admin.astro#L409)
