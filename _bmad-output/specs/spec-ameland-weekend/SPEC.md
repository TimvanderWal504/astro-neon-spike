---
id: SPEC-ameland-weekend
companions:
  - ../../planning-artifacts/architecture/architecture-MoapMoap-2026-08-24/ARCHITECTURE-SPINE.md
  - ../../../design/ameland-weekend/BUILD_BRIEF.md
sources: []
---

> **Canonical contract.** This SPEC and the files in `companions:` are the complete, preservation-validated contract for what to build, test, and validate. Source documents listed in frontmatter are for traceability — consult them only if you need narrative rationale or prose color this contract intentionally omits.

# Ameland Vriendenweekend PWA

## Why

Tim (organizer) is running a secret, hype-building surprise trip to Ameland (2–4 Oct 2026) for 7 friends. This is a vision to realize — a progressive-reveal site that paces the trip's chapters one at a time so guests don't know the full plan up front — combined with a mandate: the real build must be ready for a compagnon (co-organizer) review checkpoint on **2026-09-14**, after which the link goes out to the rest of the group. The visual/interaction design (Claude Design canvas mockups) is already finished and locked; this spec covers turning that design into the real, reusable PWA.

## Capabilities

- **CAP-1** — Installable PWA
  - **intent:** A guest can install the site to their phone's home screen so push notifications work.
  - **success:** A real web app manifest and service worker exist; Android/iOS install instructions render per-platform; an installed icon appears on the home screen and push permission can be granted from it.

- **CAP-2** — Progressive chapter reveal
  - **intent:** A guest sees only the chapters the organizer has unlocked; a locked chapter shows the existing placeholder, never its real content.
  - **success:** A locked chapter's title/description/time/location/illustration never appears in the page source or any network response until the organizer unlocks it; unlocking flips visibility on already-open tabs without a manual reload.

- **CAP-3** — Push notification on unlock
  - **intent:** Every subscribed guest is notified the moment the organizer reveals a new chapter.
  - **success:** Toggling a chapter unlocked in the admin view triggers a push in the same action; an installed device shows the OS notification and, on tapping it or if already open, sees the revealed content.

- **CAP-4** — Organizer admin view
  - **intent:** The organizer always sees the full trip (every chapter, including locked ones) and can toggle each chapter's unlocked state independently.
  - **success:** The passcode-gated admin page renders all chapters unredacted with working per-chapter toggles, matching the existing mockup's row layout and always-on packing-list row.

- **CAP-5** — Shared packing list
  - **intent:** Any participant can check off packing items from a shared list, visible to everyone, independent of any chapter's lock state.
  - **success:** The packing list always renders in full even before any chapter unlocks; a check/uncheck by one participant is visible to the others; concurrent edits from different people resolve deterministically.

- **CAP-6** — Tiered chapter treatment (cinematic vs knap)
  - **intent:** Bestemming, Blokarten, and Brouwerij get full grandeur scroll-triggered choreography; Vrijdag and Zondag stay polished-but-restrained; any cinematic chapter is replayable on demand.
  - **success:** The shipped build reproduces the existing reveal/cinematic-reveal/staggered-delay animation system and replay mechanism unchanged, and respects `prefers-reduced-motion` by snapping every animated element to its end state.

- **CAP-7** — Reusable trip template
  - **intent:** Standing up a future trip requires only authoring a new content entry, never a code change.
  - **success:** A second trip can go live by adding a new content entry with its own slug, accent color, chapters, and packing list — no route, component, or schema code is touched, aside from a genuinely new illustration treatment (a named exception, not a defect).

## Constraints

- v1 is one-way only: the organizer publishes/unlocks, guests consume. This rules out any guest-writable content endpoint beyond the packing list and push subscription.
- Admin access is a single shared passcode with a long-lived signed cookie and per-IP throttling — this rules out any user-account or OAuth system for the organizer.
- Only three things are ever server-mutable: chapter unlocked flags, push subscriptions, and packing-list checked state. This rules out storing any other trip content (copy, timing, illustration choice) anywhere but static authored content.
- Stack is pinned by the adopted architecture spine: Astro (latest 7.x), a hand-written manifest/service worker, PushForge for VAPID push, Vercel Functions (Node runtime), Neon Postgres via the Vercel Marketplace integration. Changing any of these means amending the architecture spine first, not deciding ad hoc during build.
- The existing CSS/animation system (reveal/cinematic-reveal classes, staggered delays, SVG line-draw, the persistent fixed-position viewfinder layer, the replay mechanism) is the visual/interaction source of truth and must transfer into the real build unchanged — this rules out redesigning or reimplementing the motion system in a different style.
- The compagnon-review checkpoint is 2026-09-14; the group link only goes out to the other 5 friends after that review passes. This rules out an open-ended build timeline — a working build (or a close approximation) must exist before that date.

## Non-goals

- Two-way guest interaction (comments, photo/video uploads) — a deliberate v2 extension, not an oversight.
- Per-guest identity or accounts — packing-list state is shared/trip-wide, and guests never log in; only the organizer has the shared admin passcode.
- Real photo/video assets — the hand-drawn SVG line art ships as-is for v1; swapping in real media is a future content update.
- A standalone MP4 teaser video (the previously-explored hyperframes render pipeline) — a separate offline tool, not part of the PWA build.
- An automated test suite — verification for v1 is manual QA against this spec's success criteria before the 2026-09-14 checkpoint.
- Multi-organizer or multi-tenant support — this spec covers exactly one project, one organizer, trips added as new content entries.

## Success signal

Before the 2026-09-14 compagnon-review checkpoint: the organizer can toggle any chapter unlocked/locked from the admin view, and an installed guest device receives a push notification and sees the revealed content without a manual reload — while the packing list stays checkable and shared across devices throughout, even with every chapter still locked. A second trip's content can be authored as a new content entry with zero code changes, demonstrating the reusable-template capability (CAP-7).

## Open Questions

- Sunday afternoon's program (wadlopen-met-gids) is unconfirmed. Not a build-mechanics gap — the content schema already supports a chapter existing before its details are final — but a real content decision Tim needs to make before that chapter can be unlocked for real.
