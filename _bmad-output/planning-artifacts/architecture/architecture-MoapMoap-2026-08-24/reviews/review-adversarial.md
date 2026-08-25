---
name: 'Adversarial Review — ARCHITECTURE-SPINE.md'
type: review
target: architecture-MoapMoap-2026-08-24/ARCHITECTURE-SPINE.md
created: '2026-08-24'
---

# Adversarial Review — Ameland Vriendenweekend PWA Architecture Spine

## Method

For each AD, I constructed two hypothetical builders working on adjacent units
(public page vs. admin API vs. service-worker push handler vs. content-config
for a future "trip #2") and asked: can both builders read the same AD text,
build something that satisfies it to the letter, and still ship something
incompatible with the other's unit? Findings below are only cases where I
could actually construct two divergent, individually-compliant
implementations — not general hardening suggestions.

## Findings

### 1. [Critical] AD-7's schema contradicts AD-1/AD-3 on where `unlocked` lives — risk of state reset on every redeploy

**The gap.** AD-7 defines the trip content entry type as:

> `chapters: [{id, order, kind, title, time, location, description, svgVariant, unlocked}]`

and calls this "the content-config data shape," bound to "the data layer
boundary." But AD-1 and AD-3 both assert `unlocked` is exclusively
server/DB-held mutable state, never static authored content. AD-7 itself even
says so in the same rule: *"Only `unlocked`... live[s] in the database; every
other field is static authored content."* The type literal and the prose
directly under it disagree about whether `unlocked` is a field of the
authored static file or not.

**Two compliant, incompatible builds.**
- **Builder A (content layer):** reads the type literal at face value. The
  on-disk content entry (`src/content/trips/ameland.json`) includes
  `"unlocked": false` as an authored seed value per chapter, matching AD-7's
  schema exactly. A deploy/seed step upserts this into Neon on every deploy
  ("content is the source of truth for structure, DB just mirrors it").
- **Builder B (API layer):** reads AD-1/AD-3's prose as authoritative. The
  on-disk content entry omits `unlocked` entirely; the shared TypeScript type
  in AD-7 is only the *merged response shape* returned by `GET
  /api/trip/[slug]`, synthesized by joining static content with a DB read.
  `unlocked` never appears in a file on disk.

Both are defensible readings of AD-7 as written. If Builder A's variant ships
and the deploy/seed step is anything other than "insert-if-not-exists," every
redeploy after Tim has unlocked "Blokarten" silently re-locks it back to the
content file's authored default — a serious, hard-to-diagnose functional bug,
and both builders could point to the spine as having authorized their
approach.

**Proposed fix.** Split AD-7 into two explicit shapes instead of one blended
type, e.g.:

- `TripContent` (on-disk, static, versioned in git): `{slug, startDate,
  accentColor, chapters: [{id, order, kind, title, time, location,
  description, svgVariant}], packingList: [{id, label}]}` — **no `unlocked`
  field, ever.**
- `TripState` (API response, computed): `TripContent` merged with `{chapters:
  {[id]: {unlocked: boolean}}, packingChecked: {[id]: boolean}}` read live
  from Neon.

State this as a rule addition to AD-7: *"The static content entry never
contains `unlocked` or packing checked-state, in any form, including as a
seed/default. These fields exist only in Neon, created on first
admin-toggle/packing-check, defaulting to `false`/`unchecked` when absent from
the DB."*

---

### 2. [High] No pinned mechanism for how the open public page learns of a new unlock — three incompatible designs all satisfy the letter of AD-2/AD-4

**The gap.** AD-4 pins *when* the server fans out a push (same transaction as
the toggle) and AD-2 pins that the public page's gating check reads
`trip.chapters[id].unlocked` "from server-fetched trip state." Neither AD says
what happens in the browser *after* a push is received by the service worker,
for a tab that is already open. This is exactly the kind of seam where the
service-worker builder and the public-page builder can each build a
self-consistent, spec-compliant piece that doesn't cooperate with the other's.

**Three compliant, incompatible builds.**
- **Builder A (notify-only):** `sw.js`'s `push` handler only calls
  `showNotification()`. It never talks to open clients. The public page
  fetches trip state once on load and never again. Clicking the notification
  navigates/focuses the tab, but if the tab was already open and foregrounded,
  nothing happens until a manual reload — "server-fetched trip state" was
  satisfied at initial load, so AD-2 is technically met.
- **Builder B (re-fetch-on-push):** the `push` handler also does
  `clients.matchAll()` and `postMessage`s open tabs, which then re-call `GET
  /api/trip/[slug]` and re-render. This is the design that actually delivers
  the "reveal moment" the product is for.
- **Builder C (payload-carries-state):** the push payload itself includes the
  new `{chapterId, unlocked: true}` and the SW/page apply it directly to
  local state without any follow-up GET. This is faster but means the "source
  of truth" the client is rendering from, in that moment, is a push payload,
  not "server-fetched trip state" in the AD-2 sense — and it silently
  diverges from truth if a push is dropped (offline device, browser evicted
  the SW) since there's no reconciliation fetch afterward.

All three read AD-2/AD-4 and can honestly claim compliance, yet only B (or C
with a forced reconciling fetch) delivers the feature BUILD_BRIEF describes as
"the core reason for installing the PWA."

**Proposed fix.** Add a rule to AD-4 (or a new AD-4a): *"On receiving a push
event, the service worker must both display the notification and broadcast to
all open clients of that origin (`postMessage` via `clients.matchAll`)
instructing them to re-fetch `GET /api/trip/[slug]`. The public page must
listen for this message and re-render from the fetch response — never from
the push payload directly. Push payload content is for the notification title
only, not a state-transport channel."*

---

### 3. [High] No owner for stale/expired push subscriptions — perpetual accumulation vs. silent pruning are both compliant

**The gap.** AD-4 says fan-out goes to "every stored subscription for that
trip." The route list only has `push/subscribe.ts` (POST) — no unsubscribe or
cleanup route appears anywhere in the Structural Seed. Nothing says what
happens when a push send fails because the subscription expired or the user
uninstalled/reset the PWA (the push service returns 404/410 for these).

**Two compliant, incompatible builds.**
- **Builder A (push.ts wrapper):** treats `web-push`'s send call as
  fire-and-forget per subscription; a 410 response is logged and ignored.
  Dead subscriptions accumulate forever; every future toggle sends (and
  fails) against them indefinitely.
- **Builder B (push.ts wrapper):** on catching a 404/410 from `web-push`'s
  send, deletes that subscription row from Neon inside (or right after) the
  same fan-out loop.

Both satisfy AD-4's rule text word-for-word ("fans out... to every stored
subscription"). But they produce very different long-run states in the
`subscriptions` table, and if Builder A's version ships, a phone that was
reset mid-trip keeps "successfully" swallowing failed sends that nobody ever
notices, while looking identical to Builder B's system from the outside until
someone inspects the DB or the function logs.

**Proposed fix.** Add to AD-4: *"On a 404 or 410 response from the push
service for a given subscription, the fan-out routine deletes that
subscription row before completing the transaction. This is the only path by
which a subscription is ever removed; there is no separate cleanup job or
manual unsubscribe route."*

---

### 4. [Medium] AD-5 doesn't pin admin session cookie expiry — 1-hour and permanent are both compliant, with materially different organizer UX

**The gap.** AD-5 says the server "sets an httpOnly, signed session cookie"
on correct passcode entry, and stops there. No `Max-Age`/expiry is specified.

**Two compliant, incompatible builds.**
- **Builder A:** sets a short-lived session cookie (e.g., 1 hour, or a true
  session cookie cleared on browser close), reasoning that shorter-lived
  credentials are more secure by default.
- **Builder B:** sets a non-expiring (or multi-year) cookie, reasoning that
  there's exactly one organizer, the passcode is already the whole security
  model (AD-5 explicitly rejects a fuller auth system), and re-entering a
  shared passcode repeatedly adds friction with no real security benefit.

Both are defensible under AD-5's text. But this isn't cosmetic: Tim needs to
unlock chapters live during the trip weekend itself (2–4 Oct), possibly from
a phone, possibly re-opening the admin page after the browser/PWA was
backgrounded or the phone rebooted. Builder A's version means Tim gets
silently logged out and has to dig up/re-enter the passcode at the exact
moment he's trying to trigger a reveal in front of his friends — a
functionally broken organizer workflow that nonetheless "complies" with AD-5.

**Proposed fix.** Add to AD-5: *"The session cookie is long-lived (e.g., 90
days, `Max-Age` set explicitly, not a browser-session-only cookie) — the
threat model here is a stranger guessing a URL, not session hijacking, and
the organizer must not be re-prompted mid-trip."*

---

### 5. [Medium] Packing-list write endpoint's auth requirement isn't pinned — could ship gated or ungated, both "compliant"

**The gap.** AD-6 establishes the packing list is shared, no per-user
identity. AD-3's mutation-boundary rule is scoped explicitly to "chapter
`unlocked` state" — it says nothing about the packing-check route's auth
requirements, and no other AD does either.

**Two compliant, incompatible builds.**
- **Builder A:** implements `packing/check.ts` as a fully open, unauthenticated
  POST — anyone with the trip URL (i.e., any of the 7 friends) can toggle any
  item, matching the "shared trip-wide list" intent.
- **Builder B:** notices that every other *write* path in the system is
  admin-gated (AD-3's spirit, even if its letter only names chapter state),
  and defensively reuses AD-5's session-cookie check on `packing/check.ts`
  too, "to be safe."

Builder B's version is not a hypothetical edge case — it is the natural,
security-conscious default for someone implementing "the write routes" as a
batch without re-deriving intent per-route from BUILD_BRIEF. It silently
breaks the feature: only Tim (who has the passcode) could ever check off
packing items, defeating AD-6's entire purpose.

**Proposed fix.** Add a sentence to AD-6 or AD-3: *"`packing/check.ts` is
intentionally public and unauthenticated, like the trip-state GET route —
it is a write path exempted from the admin-only mutation boundary in AD-3,
by design, because the packing list has no owner to gate against."*

---

### 6. [Medium] Packing-check request shape (toggle vs. set-state) isn't pinned — different concurrency behavior under near-simultaneous edits

**The gap.** AD-6 pins the *data model* (shared boolean per item) but not the
*mutation contract*: does the client POST "flip this item" (server computes
new state by negating current state) or "set this item to `checked: true`"
(client sends the desired end state, server just writes it)?

**Two compliant, incompatible builds.**
- **Builder A (toggle semantics):** `POST /api/packing/check {id}` — server
  reads current value, flips it, writes it back. If two friends tap the same
  item within the same round-trip window, the second request may flip it back
  to unchecked immediately after the first checked it (lost-update race), even
  though both users' screens show "checked" right after their own tap.
- **Builder B (set semantics):** `POST /api/packing/check {id, checked:
  true}` — client sends its own optimistic end-state; server just persists
  it, last-write-wins, no read-modify-write race. Same near-simultaneous
  scenario resolves deterministically (whoever's request lands last wins,
  and both clients can reconcile against the response).

For a 7-person shared list with no identity, A's race is very plausible in
practice (two people packing-list-cleaning at the same time, tapping fast) and
produces a confusing "I checked it but it's unchecked again" bug that both
implementations can point to AD-6 as authorizing.

**Proposed fix.** Add to AD-6: *"The packing-check endpoint takes an explicit
desired state — `{id, checked: boolean}` — never a bare toggle. The server
performs a plain write, not a read-modify-write, so concurrent edits resolve
by last-write-wins with no lost-update race."*

---

### 7. [Low-Medium] `svgVariant` has no type or resolution contract — risks per-chapter code branching that quietly breaks the "new trip = content only" promise

**The gap.** AD-7's schema lists `svgVariant` with no type annotation and no
description of how it's consumed. AD-7's own "Prevents" clause exists
specifically to stop "a new trip requiring code changes instead of a new
content entry" — but nothing constrains `svgVariant` to a scheme that
actually achieves that for the *illustration* layer, which is exactly the
part BUILD_BRIEF flags as hand-built and chapter-specific (the vizier/Europa
layer, the nested `<g>` rig/mast/zeil structure for Blokarten, etc.).

**Two compliant, incompatible builds.**
- **Builder A:** treats `svgVariant` as a lookup key into a hand-maintained
  per-chapter component registry (`switch(svgVariant) { case 'vizier': ...
  case 'rig': ... }`) living in code — because the current five chapters'
  SVGs really are bespoke, hand-drawn, and choreographed differently (per
  BUILD_BRIEF's animation-systems section), this is the pragmatic reading.
  Adding trip #2's chapters with new illustrations requires a code change to
  extend the switch — silently violating AD-7's stated purpose.
- **Builder B:** treats `svgVariant` as a path/slug resolved generically
  (e.g., `public/assets/trips/{slug}/{svgVariant}.svg`, loaded and inlined
  with no per-chapter branching in the renderer), preserving the
  no-code-for-new-trip property but unable to reproduce the current
  chapter-specific choreography (vizier scan sequence, nested transform
  rigs) without some other, unspecified extension point.

Both are reasonable readings of an untyped field, and they lead to
architecturally different rendering layers — one of which quietly
reintroduces the exact "code change per trip" problem AD-7 exists to prevent.
This is a real tension the spine doesn't resolve: the current design (per
BUILD_BRIEF) is genuinely bespoke-per-chapter, and "content-config only" for
illustrations may be aspirational rather than achieved.

**Proposed fix.** Either (a) scope AD-7 honestly — add a note that
`svgVariant` selects among a fixed, code-defined set of illustration
treatments that *does* require a code addition for genuinely new
choreography, and only the copy/timing/lock fields are truly
code-change-free; or (b) if trip #2 is expected to reuse only the existing
five illustration treatments (destination/día-1/blokarten/brouwerij/día-3
style), pin `svgVariant` as a closed enum of the existing treatment names so
both builders converge on the same fixed vocabulary.

---

### 8. [Low] `GET /api/trip/[slug]` response envelope isn't pinned — full merged object vs. dynamic-only patch

**The gap.** The Structural Seed lists `api/trip/[slug].ts` as "GET,
read-only trip state (AD-3)" but no AD specifies what JSON shape it returns.
Since Astro prerenders the static content into the page itself, a builder
could reasonably conclude the API only needs to return the *dynamic slice*.

**Two compliant, incompatible builds.**
- **Builder A:** `GET /api/trip/[slug]` returns the full `TripState` object
  (static content + `unlocked` + packing-checked, all merged) — self-
  contained, works for any consumer including a future non-Astro client.
- **Builder B:** returns only `{unlocked: {...}, packingChecked: {...}}`,
  assuming the caller already has the static shell from the prerendered page
  and just needs the live overlay to patch onto it.

This matters once Finding 2's re-fetch-on-push behavior is implemented: the
public-page builder's re-fetch logic and the API builder's response shape
have to agree on which of these two envelopes is coming back, and nothing in
the spine pins it. It also affects the admin page, which per BUILD_BRIEF
"always shows everything" — if it reuses the same GET route, it needs the
full shape; if Builder B's dynamic-only shape ships, the admin page needs a
second source for static content that isn't specified anywhere.

**Proposed fix.** Add one line to AD-7 or the Structural Seed: *"`GET
/api/trip/[slug]` always returns the full merged `TripState` (static content
+ live `unlocked`/packing state), never a dynamic-only patch — both the
public page's re-fetch-on-push and the admin page consume this same
envelope."*

## Non-findings (considered, not real two-unit divergence risks)

- **`kind: 'cinematic'|'knap'`** — already a closed two-value enum in AD-7's
  own text, and BUILD_BRIEF explicitly instructs preserving this distinction
  when adding chapters. Not ambiguous.
- **Neon dev/prod branch parity, rate limiting on public write routes,
  horizontal scaling, multi-organizer concerns** — explicitly out of scope
  per AD-9 and the Deferred section; flagging these would be enterprise-scale
  noise for a personal project.
- **VAPID/`web-push` library staleness** — already flagged and deferred
  in-spine (Deferred section); not a two-unit divergence, a known open risk.
