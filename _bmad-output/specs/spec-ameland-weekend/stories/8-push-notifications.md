---
title: 'Push notifications'
type: 'feature'
created: '2026-09-12'
status: 'done'
review_loop_iteration: 0
baseline_commit: 'fa9cd6fdeebd477193a3c5c7692cd01a4e951d53'
context:
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-MoapMoap-2026-08-24/ARCHITECTURE-SPINE.md'
  - '{project-root}/migrations/README.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `push/subscribe.ts` and `push.ts` are 501/empty stubs, `admin/toggle.ts` only writes `chapter_unlocks` with no notification path, and `sw.js` has no `push`/`notificationclick` handling — so unlocking a chapter never reaches guests who aren't already looking at the page.

**Approach:** Add a `push_subscriptions` table and a public `POST /api/push/subscribe` that stores a tripSlug-scoped subscription; extend `admin/toggle.ts` so a false→true unlock transition fans out a Web Push notification (via PushForge) to every subscription for that trip in the same request, deleting any subscription that 404/410s; extend `sw.js` with `push` (show notification + broadcast `postMessage`) and `notificationclick` (focus/open the trip page); add a minimal "enable notifications" control to the public page near `#installeren` that subscribes via `pushManager.subscribe()` and handles granted/denied/already-subscribed states explicitly.

## Boundaries & Constraints

**Always:** Fan-out fires only on a chapter's false→true unlock transition (never true→true or any false transition), detected via one atomic query — no SELECT-then-write. `toggle.ts` awaits the fan-out before returning its response — Vercel may freeze/terminate the function right after a response is sent, so a fire-and-forget send can silently never complete. `push/subscribe` is public/unauthenticated (AD-3); it validates `tripSlug` against real content like `toggle.ts` (400 on unknown trip), requires `endpoint` to be a well-formed `https://` URL (400 otherwise — this is a public write the server later fetches server-side, so scheme-restricting it shrinks the SSRF surface), and writes only `{endpoint, tripSlug, keys}`. Re-subscribing the same `endpoint` upserts (`ON CONFLICT (endpoint)`), never duplicates — this also means one device holds at most one trip subscription at a time, matching AD-7. A 404/410 from the push service deletes that subscription — the only removal path. The service worker's `push` handler calls `showNotification()` and broadcasts via `clients.matchAll()` + `postMessage` to trigger an `/api/trip/[slug]` re-fetch; the payload carries only title/body/tripSlug, never state. `notificationclick` focuses an existing client at the trip's URL, else opens one. The VAPID public key is read server-side at prerender time (`import.meta.env.VAPID_PUBLIC_KEY`) and embedded for the client script — no `PUBLIC_` rename needed. New route and `push.ts` use `jsonOk`/`jsonError` (AD-8). Permission-denied, already-subscribed, and subscribe-failure states are all shown explicitly, never silent.

**Ask First:** None — no mockup exists for this UI; build minimal, on-brand markup, per the precedent set by story 4's login screen.

**Never:** A separate/scheduled notification path, a manual unsubscribe route, or `beforeinstallprompt`-style detection. Don't touch `packing/*` or existing toggle auth/parsing/response shape beyond adding the fan-out call. Don't implement the fan-out as a literal `sql.transaction([...])` wrapping the push send — an external HTTP call to the push service can't participate in a Postgres transaction; atomicity only applies to the `chapter_unlocks` write itself.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Subscribe, new endpoint | valid `tripSlug` + push subscription JSON | `200 {ok:true}`, row inserted/upserted | N/A |
| Subscribe, unknown trip | bad `tripSlug` | `400 {ok:false,error}` | not written |
| Toggle false→true | admin unlocks a chapter | chapter written, push sent to all trip subscriptions, expired ones deleted | send failures logged, don't fail the toggle response |
| Toggle true→true | admin re-saves an already-unlocked chapter | chapter written, no push sent | N/A |
| Push 404/410 | stale subscription | notification skipped for it, row deleted | N/A |
| Permission denied | guest blocks notification prompt | inline message shown, no retry loop | N/A |

</frozen-after-approval>

## Code Map

- `migrations/0003_push_subscriptions.sql` (NEW) -- `push_subscriptions(endpoint text PRIMARY KEY, trip_slug text NOT NULL, p256dh text NOT NULL, auth text NOT NULL, created_at timestamptz NOT NULL DEFAULT now())` + index on `trip_slug`, matching `0001`/`0002`'s comment-header style.
- `src/lib/push.ts` -- implement PushForge (`@pushforge/builder`, new dependency) VAPID wrapper: `sendChapterUnlockedPush(tripSlug, chapterTitle)` reads subscriptions for `tripSlug`, sends to each, returns/deletes 404/410 endpoints via `getSql()`.
- `src/lib/trip-state.ts:87-96` -- change `setChapterUnlocked`'s query to a `WITH previous AS (SELECT unlocked ...) INSERT ... RETURNING unlocked, (SELECT unlocked FROM previous) AS previous_unlocked`, so the caller detects the false→true transition within the same atomic statement (no separate read). Also update the stale doc comment above it (lines 87-95), which currently says story 8 will use `sql.transaction([...])` -- it won't, since the push send is an external HTTP call and can't join a Postgres transaction. Known limitation, not fixed here: under a genuine race (two concurrent toggles of the same chapter), both requests can read `previous_unlocked=false` before either commits, causing a double-send -- acceptable given this is a single-admin manual-click UI.
- `src/pages/api/admin/toggle.ts:67` -- after `setChapterUnlocked`, if `previous_unlocked` was not `true` and new `unlocked` is `true`, `await` `sendChapterUnlockedPush` before returning the response (see Always); log but don't fail the response on send errors. Keep existing auth/parsing/response shape.
- `src/pages/api/push/subscribe.ts` -- replace 501 stub: validate `tripSlug` via `getCollection('trips')` (same pattern as `toggle.ts:54`), validate subscription shape (`endpoint` a well-formed `https://` URL, `keys.p256dh`/`keys.auth` non-empty strings), upsert into `push_subscriptions`, respond via `jsonOk`/`jsonError`.
- `public/sw.js` -- add `push` listener (`showNotification` + `clients.matchAll({includeUncontrolled:true})` → `postMessage({type:'trip-updated'})`) and `notificationclick` listener (close notification, focus matching client or `clients.openWindow('/'+tripSlug)`); tripSlug carried in the push payload's `data`.
- `src/pages/[trip]/index.astro` -- near `#installeren` (~line 1821): add a small "Meldingen aanzetten" control; frontmatter passes `import.meta.env.VAPID_PUBLIC_KEY` into a `data-vapid-key` attribute; client script (near existing SW registration at line 2236) adds a `message` listener on `navigator.serviceWorker` for `trip-updated` (re-fetch + re-render, reusing whatever the page's existing chapter-render path is) and a subscribe handler using `Notification.requestPermission()` + `pushManager.subscribe({userVisibleOnly:true, applicationServerKey})`, POSTing the result to `/api/push/subscribe` with the page's `tripSlug`.
- `.env.example` -- already declares `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`; no change needed.
- `package.json` -- add `@pushforge/builder` (verify current version at implementation start per the architecture spine's own risk note).

## Tasks & Acceptance

**Execution:**
- [x] `migrations/0003_push_subscriptions.sql` -- create table + index -- storage for AD-4/AD-7.
- [x] `src/lib/trip-state.ts` -- add previous-value detection to `setChapterUnlocked` -- lets the route detect false→true without a second query.
- [x] `src/lib/push.ts` -- implement VAPID send + 404/410 cleanup -- the AD-4 fan-out routine.
- [x] `src/pages/api/admin/toggle.ts` -- call fan-out on false→true transition -- delivers AD-4 without restructuring the route.
- [x] `src/pages/api/push/subscribe.ts` -- implement validated upsert -- AD-3's public write exception.
- [x] `public/sw.js` -- add `push`/`notificationclick` handlers -- AD-4 delivery + tab re-fetch broadcast.
- [x] `src/pages/[trip]/index.astro` -- add subscribe control + message listener -- lets guests opt in and re-render on broadcast.

**Acceptance Criteria:**
- Given a guest has subscribed, when the organizer unlocks a chapter, then the guest's browser shows an OS notification and any open tab re-fetches and reveals the chapter without a manual reload.
- Given the organizer re-toggles an already-unlocked chapter, when the request completes, then no push is sent.
- Given a stale/uninstalled subscription, when a push to it 404s or 410s, then its row is deleted and no error surfaces to the admin.
- Given a guest denies the notification permission, when they click the control again, then they see an explanatory message instead of a silent no-op or a repeated browser prompt.

## Verification

**Commands:**
- `pnpm typecheck` -- expected: passes.
- `pnpm build` -- expected: succeeds.
- `pnpm migrate` -- expected: applies `0003` cleanly against the dev DB.

**Manual checks:**
- Subscribe from the public page, unlock a chapter as admin, confirm an OS notification appears and the open tab reveals the chapter without reload.
- Re-toggle the same chapter (already unlocked) -- confirm no second notification.
- Deny the permission prompt, click the control again -- confirm the explanatory message, not a repeated prompt.
- Manually delete/corrupt a subscription's endpoint in the DB to force a 404 from the push service -- confirm the row is removed and the toggle response still succeeds.
- Click the OS notification with the app closed -- confirm it opens the trip page; click it again with a tab already open on that trip -- confirm it focuses that tab instead of opening a new one.

## Suggested Review Order

**Transition detection & fan-out trigger**

- Entry point: fan-out fires only on a false→true transition, awaited before the response returns.
  [`toggle.ts:79`](../../../../src/pages/api/admin/toggle.ts#L79)

- The atomic upsert reports the pre-write value in the same statement -- no separate read, no race with the write itself.
  [`trip-state.ts:123`](../../../../src/lib/trip-state.ts#L123)

**Push send & 404/410 cleanup**

- Fan-out entry point: reads subscriptions, guarded so a DB failure here can't violate the function's own never-throws contract.
  [`push.ts:30`](../../../../src/lib/push.ts#L30)

- Per-subscription send is bounded by a timeout so one unresponsive endpoint can't stall the awaited toggle response.
  [`push.ts:92`](../../../../src/lib/push.ts#L92)

- A 404/410 is the only path that ever deletes a subscription row.
  [`push.ts:106`](../../../../src/lib/push.ts#L106)

**Subscribe route: validation & SSRF surface**

- `endpoint` must be a well-formed `https://` URL before it's ever stored -- shrinks (not eliminates, see deferred-work.md) the SSRF surface on the later server-side fetch.
  [`subscribe.ts:16`](../../../../src/pages/api/push/subscribe.ts#L16)

- Upsert on `endpoint`'s own primary key -- re-subscribing never duplicates a row.
  [`subscribe.ts:77`](../../../../src/pages/api/push/subscribe.ts#L77)

**Service worker delivery**

- `push` handler shows the OS notification and broadcasts to every open tab -- guarded so the broadcast still fires even if `showNotification` itself fails.
  [`sw.js:43`](../../../../public/sw.js#L43)

- `notificationclick` focuses an existing tab on the trip's page, else opens one -- guarded against a stale/closed client.
  [`sw.js:62`](../../../../public/sw.js#L62)

**Guest-facing subscribe UI**

- Every outcome (unsupported, denied, already-subscribed, failure, success) shows its own explicit message -- never a silent no-op.
  [`index.astro:2336`](../../../../src/pages/%5Btrip%5D/index.astro#L2336)

- Re-fetch on the service worker's broadcast reuses the page's existing render path -- never trusts the push payload as state.
  [`index.astro:2298`](../../../../src/pages/%5Btrip%5D/index.astro#L2298)

**Peripherals**

- New table storing subscriptions, matching the existing migrations' plain-DDL style.
  [`0003_push_subscriptions.sql:7`](../../../../migrations/0003_push_subscriptions.sql#L7)

- VAPID key generation instructions corrected to PushForge's own CLI/JWK format (the `web-push` package's format doesn't work here).
  [`.env.example:19`](../../../../.env.example#L19)
