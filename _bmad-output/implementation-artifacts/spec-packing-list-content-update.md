---
title: 'Packing list content update (categorized)'
type: 'chore'
created: '2026-09-12'
status: 'done'
route: 'one-shot'
---

# Packing list content update (categorized)

## Intent

**Problem:** The packing list held only 5 generic placeholder items with no category grouping, while the organizer had a real ~50-item list (drawn up for this weekend) organized into categories.

**Approach:** Extend `packingList`'s schema from a flat array of items to an array of categories (each with `id`, `label`, `items`), and replace the placeholder content with the organizer's real list, grouped and rendered under category headings in the packing bottom sheet. Item-level `required`/`packed` flags from the source list were intentionally dropped per organizer decision (all items render identically); a "Sauna-Specifiek" category was folded into "Badkleding & Water" and an unrelated `autosleutels` (car keys) item was removed, both per organizer confirmation that they didn't fit this boat-and-bike itinerary.

## Suggested Review Order

**Schema change**

- Category grouping replaces the flat item array — items now nest under categories, with uniqueness enforced across the whole flattened list since AD-6's localStorage keys are item-scoped, not category-scoped.
  [`content.config.ts:45`](../../src/content.config.ts#L45)

- `packingList` and each category's `items` both require at least one entry, closing a gap the original schema left open.
  [`content.config.ts:69`](../../src/content.config.ts#L69)

**Content data**

- The organizer's real packing list, grouped into 6 categories; `wasklandje`'s label was corrected from a typo, and the `schoenen` item now calls out the closed-shoe requirement blokarten already states elsewhere on the page.
  [`moapmoap.json:57`](../../src/content/trips/moapmoap.json#L57)

**Rendering**

- Each category renders as its own labeled group with an `<h4>` heading tied to its item list via `role="group"`/`aria-labelledby`, preserving real a11y semantics now that there's an actual grouping concept to convey.
  [`index.astro:1996`](../../src/pages/[trip]/index.astro#L1996)

- Category heading styling, including a fix for a `:first-of-type` selector that never matched (the sheet header, not the first category, was the true first `<div>` sibling).
  [`index.astro:689`](../../src/pages/[trip]/index.astro#L689)
