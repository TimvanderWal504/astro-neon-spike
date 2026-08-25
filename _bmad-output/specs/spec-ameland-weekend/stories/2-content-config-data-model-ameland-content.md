---
title: 'Content-config data model & Ameland content'
type: 'chore'
created: '2026-08-25'
status: 'done'
review_loop_iteration: 0
route: 'one-shot'
---

# Content-config data model & Ameland content

## Intent

**Problem:** The Ameland trip's real content (5 chapters, packing list, accent color) existed only hardcoded in the Claude Design mockup (`Main.dc.html`); no data-driven content entry existed yet for `src/content.config.ts`'s `TripContent` schema, so no later story (public page, admin, animations) has real content to render against.

**Approach:** Transcribe the mockup's real Dutch copy, times, and locations into `src/content/trips/ameland-weekend.json` per AD-7's locked schema. Each chapter's weekday/date is folded into its free-text `time` field (the schema has no separate date field, and `time` carries no format constraint). Zondag's intentional "?" placeholder programme is preserved verbatim, and the mockup's example packing list is reused unchanged (explicitly marked non-definitive in `BUILD_BRIEF.md`). Validated via `pnpm typecheck` and `pnpm build` — the content-collection schema and all three `.refine()` uniqueness checks pass.

## Suggested Review Order

**Content entry**

- Trip metadata (slug, startDate, accentColor) — accentColor kept at the mockup's marked default, not a confirmed trip-specific choice.
  [`ameland-weekend.json:1-4`](../../../../src/content/trips/ameland-weekend.json#L1-L4)

- Cinematic chapters (Bestemming, Blokarten, Brouwerij) — copy transcribed near-verbatim from the mockup, one confirmed time/location each.
  [`ameland-weekend.json:6-15`](../../../../src/content/trips/ameland-weekend.json#L6-L15)
  [`ameland-weekend.json:26-35`](../../../../src/content/trips/ameland-weekend.json#L26-L35)
  [`ameland-weekend.json:36-45`](../../../../src/content/trips/ameland-weekend.json#L36-L45)

- Multi-event "knap" days (Vrijdag, Zondag) — the mockup's itemized per-time rows are folded into one newline-delimited `description` string, since AD-7's schema allows only one `time`/`location` per chapter; Zondag's middle event stays an explicit "?" placeholder, not invented content.
  [`ameland-weekend.json:16-25`](../../../../src/content/trips/ameland-weekend.json#L16-L25)
  [`ameland-weekend.json:46-55`](../../../../src/content/trips/ameland-weekend.json#L46-L55)

- Packing list — the mockup's example list, reused as-is (BUILD_BRIEF marks it a placeholder, not a final list).
  [`ameland-weekend.json:57-63`](../../../../src/content/trips/ameland-weekend.json#L57-L63)

**Deferred follow-ups**

- Two new gaps this content surfaced (undocumented "knap" `svgVariant` rendering semantics, no structured trip-end date) filed for a later story.
  [`deferred-work.md:29`](../../../../_bmad-output/implementation-artifacts/deferred-work.md#L29)
  [`deferred-work.md:33`](../../../../_bmad-output/implementation-artifacts/deferred-work.md#L33)
