---
title: 'Public trip page: static shell + gating/redaction'
type: 'feature'
created: '2026-08-25'
status: 'done'
review_loop_iteration: 0
baseline_commit: 'ec1769c51ea358f26ec104c7dd0f60e9989acc5a'
context:
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-MoapMoap-2026-08-24/ARCHITECTURE-SPINE.md'
  - '{project-root}/migrations/README.md'
  - '{project-root}/design/ameland-weekend/Main.dc.html'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `GET /api/trip/[slug]` and `/[trip]/index.astro` are 501-stub/TODO placeholders from story 1. No gating, redaction, static shell, viewfinder layer, or daysLeft countdown exists yet — and the `chapter_unlocks` state this route reads has no table, since the migration runner (`scripts/migrate.mjs`) was deferred from story 1.

**Approach:** Build the runner (deferred, but story 3 is the first story to need a real table) plus its first migration; a shared `src/lib/trip-state.ts` that merges content-collection `TripContent` with live Neon unlock state into `TripState`, with redaction as a separate pure step so story 4/5's admin route can reuse the unredacted read; the real `GET /api/trip/[slug]`; and the static shell (placeholders + ambient-only viewfinder + client-computed daysLeft, merging real content into unlocked slots on fetch).

## Boundaries & Constraints

**Always:** Redaction happens server-side only (AD-2) — a locked chapter's API entry is exactly `{id, order, kind, unlocked:false}`, never its real fields, and the static shell embeds no chapter's real content, only placeholders. `[trip]/index.astro` has full unredacted `TripContent` in scope at build time via `getCollection('trips')` — the template must never read `title`/`time`/`location`/`description`/`svgVariant` off that collection into the DOM; only `id`/`order`/`kind` may drive static markup, and real content only ever enters the page via the client-side fetch of the API response. Chapter ids stay the existing Dutch slugs as DOM ids (AD-7). Migrations follow `migrations/README.md` exactly: numbered SQL files, transactional DDL+ledger, `pg` Pool (never `neon()`). Unlocked chapters render at full opacity with no motion — cinematic choreography is story 6. Only the ambient scan-loop viewfinder mode is built; the Bestemming-triggered dive is story 6. API envelope is `{ok:true,data}` / `{ok:false,error}` via a shared `jsonOk`/`jsonError` helper, matching the other stub routes' shape. `daysLeft` is computed client-side from the static `startDate` (never baked in once at build time, to avoid staleness).

**Ask First:** If `pnpm migrate` doesn't apply cleanly against the local dev `DATABASE_URL` (e.g. unset/misconfigured), HALT and ask rather than skipping DB verification silently.

**Never:** Build the admin-authenticated unredacted variant of this route (story 4/5 — auth doesn't exist yet). Build any reveal/cinematic-reveal animation or the Bestemming dive sequence (story 6). Touch packing-list, push-subscription, or admin-toggle logic/tables (later stories). Alter authored copy in `ameland-weekend.json`, including Zondag's "?" placeholder. Seed any `chapter_unlocks` row via `0001_init.sql` (or any other means) — the table starts and stays empty until story 5's admin toggle writes to it; every chapter must read as locked until then.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| No unlock row yet | Chapter absent from `chapter_unlocks` | API returns only `{id,order,kind,unlocked:false}` | N/A |
| Unlocked chapter | Row exists with `unlocked=true` | API returns full real fields + `unlocked:true` | N/A |
| Unknown slug | `GET /api/trip/does-not-exist` | 404 | `{ok:false,error}` |
| Migration re-run | `pnpm migrate` run twice | 2nd run applies zero migrations, exits clean | N/A |

</frozen-after-approval>

## Code Map

- `src/pages/api/trip/[slug].ts` -- 501 stub from story 1; implement `GET` here.
- `src/lib/db.ts` -- existing `getSql()` (neon HTTP driver, request-time reads only); reuse for the live unlock-state read.
- `src/lib/trip-state.ts` (NEW) -- `getTripState(slug)` + `redactTripState(state)`.
- `src/lib/http.ts` (NEW) -- shared `jsonOk(data)` / `jsonError(status, error)` envelope helpers (AD-8: all 4 API routes share this shape; the other 3 stub routes still hand-roll it today).
- `src/content.config.ts` / `src/content/trips/ameland-weekend.json` -- `TripContent` source; `getCollection('trips')`.
- `src/pages/[trip]/index.astro` -- TODO-stub shell from story 1; implement here.
- `migrations/README.md` -- documented convention; runner is "not implemented yet" (update Status once built).
- `migrations/0001_init.sql` (NEW), `scripts/migrate.mjs` (NEW) -- first migration + runner.
- `design/ameland-weekend/Main.dc.html:276-359,652-705` -- reuse-only reference for the fixed-scan viewfinder SVG and the `daysLeft` formula; not modified.
- `_bmad-output/implementation-artifacts/deferred-work.md:5-7,29-31` -- migration-runner and `knap` `svgVariant` rendering-semantics gaps this story touches.

## Tasks & Acceptance

**Execution:**
- [x] `migrations/0001_init.sql` -- create `chapter_unlocks(trip_slug text, chapter_id text, unlocked boolean not null, primary key(trip_slug, chapter_id))` -- first table story 3 needs (AD-7 live unlock state).
- [x] `scripts/migrate.mjs` -- `pg` Pool runner: bootstrap `_migrations`, apply un-applied files in numeric order, DDL+ledger insert in one transaction -- per `migrations/README.md`'s documented convention.
- [x] `package.json` -- add `pg` dependency + `"migrate": "node scripts/migrate.mjs"` script.
- [x] `migrations/README.md` -- update "Status" section: runner now implemented.
- [x] `src/lib/trip-state.ts` -- `getTripState(slug)` resolves content by slug first and returns `null` immediately if not found (no DB query for an unknown slug); otherwise merges `TripContent` + live `chapter_unlocks`. `redactTripState(state)` strips locked chapters to `{id,order,kind,unlocked:false}`.
- [x] `src/lib/http.ts` -- `jsonOk(data)` / `jsonError(status, error)` envelope helpers.
- [x] `src/pages/api/trip/[slug].ts` -- `GET`: `getTripState`+`redactTripState` via `jsonOk`; `jsonError(404, ...)` when `getTripState` returns `null`.
- [x] `src/pages/[trip]/index.astro` -- static shell: nav/hero/chapter-slot placeholders, ambient-only viewfinder layer (port from `Main.dc.html`), `trip.data.startDate` embedded as a `data-start` attribute (non-secret, safe to prerender) for a client script that computes `daysLeft` from it and fetches `/api/trip/[slug]` to merge real content into unlocked slots.

**Acceptance Criteria:**
- Given a chapter with no `chapter_unlocks` row, when `GET /api/trip/[slug]` is called, then its entry is exactly `{id,order,kind,unlocked:false}`.
- Given a chapter unlocked in `chapter_unlocks`, when `GET /api/trip/[slug]` is called, then its entry includes full real fields and `unlocked:true`.
- Given the trip page loads, when the client script runs, then `daysLeft` renders and no locked chapter's real title/description/time/location appears anywhere in the server-rendered HTML source.
- Given `pnpm migrate` runs twice, when the second run completes, then it applies zero migrations.

## Spec Change Log

## Design Notes

`chapter_unlocks` stores rows only for chapters an admin has touched (AD-7: "created on first admin-toggle"); absence means locked. Read side (this story) treats absence as `unlocked:false` — no seeding needed:

```ts
const rows = await sql`SELECT chapter_id, unlocked FROM chapter_unlocks WHERE trip_slug = ${slug}`;
const unlockedMap = new Map(rows.map((r) => [r.chapter_id, r.unlocked]));
// chapter.unlocked = unlockedMap.get(chapter.id) ?? false
```

`daysLeft` client script mirrors the mockup's existing formula (`Main.dc.html:656`), evaluated fresh on every page load so a static build never goes stale:

```js
const target = new Date(startDateISO);
const daysLeft = Math.max(0, Math.ceil((target - new Date()) / 86400000));
```

## Verification

**Commands:**
- `pnpm typecheck` -- expected: passes.
- `pnpm build` -- expected: succeeds, prerenders `/ameland-weekend`.
- `pnpm migrate` (dev `DATABASE_URL`) -- expected: applies `0001_init.sql`, creates `chapter_unlocks` + `_migrations`.

**Manual checks (if no CLI):**
- After `pnpm migrate` (and before toggling any unlock row): `curl /api/trip/ameland-weekend` -- every chapter shows `unlocked:false` with only `{id,order,kind}`.
- View page source: no chapter's real title/description/time/location string appears anywhere in the initial HTML.

## Suggested Review Order

**Redaction & trip-state (core security logic)**

- Pure redaction step — strips a locked chapter to exactly `{id,order,kind,unlocked:false}`, nothing else.
  [`trip-state.ts:87`](../../../../src/lib/trip-state.ts#L87)

- Default-to-locked merge — an absent `chapter_unlocks` row is never trusted as unlocked.
  [`trip-state.ts:71`](../../../../src/lib/trip-state.ts#L71)

- Unknown-slug short-circuit — resolves content first, returns `null` before any DB query.
  [`trip-state.ts:50`](../../../../src/lib/trip-state.ts#L50)

- Error-path fix — wraps `getTripState` so a DB failure still returns the JSON envelope, not an unhandled 500.
  [`[slug].ts:16`](../../../../src/pages/api/trip/[slug].ts#L16)

- Redacted response assembly — public callers only ever see the post-redaction shape.
  [`[slug].ts:28`](../../../../src/pages/api/trip/[slug].ts#L28)

**Migration infrastructure**

- Table shape — deliberately unseeded so every chapter starts locked until an admin toggle exists.
  [`0001_init.sql:6`](../../../../migrations/0001_init.sql#L6)

- Transactional apply loop — DDL and ledger insert commit together, per the documented convention.
  [`migrate.mjs:104`](../../../../scripts/migrate.mjs#L104)

- Connection-failure cleanup fix — pool always closes now, even when `pool.connect()` itself fails.
  [`migrate.mjs:78`](../../../../scripts/migrate.mjs#L78)

- Wiring — `pnpm migrate` script plus the new transactional `pg` dependency (distinct from the request-time `neon()` client).
  [`package.json:15`](../../../../package.json#L15)

- Docs sync — Status section updated now that the runner exists.
  [`README.md:49`](../../../../migrations/README.md#L49)

**Static shell & client merge**

- Static/dynamic boundary — shell prerenders; real chapter content is deliberately excluded from the static build.
  [`index.astro:9`](../../../../src/pages/[trip]/index.astro#L9)

- Placeholder-only chapter markup — only `id`/`order`/`kind` may drive static markup, never real fields.
  [`index.astro:28`](../../../../src/pages/[trip]/index.astro#L28)

- `daysLeft` computed fresh client-side from the static start date, so a static build never goes stale.
  [`index.astro:385`](../../../../src/pages/[trip]/index.astro#L385)

- Client merge — fetches the redacted API response and fills in only the chapters it marks unlocked.
  [`index.astro:403`](../../../../src/pages/[trip]/index.astro#L403)

**Shared envelope helper**

- `jsonOk`/`jsonError` introduced here; the other 3 stub routes still hand-roll this shape until their own stories land.
  [`http.ts:6`](../../../../src/lib/http.ts#L6)
