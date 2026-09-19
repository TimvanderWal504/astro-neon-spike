import { getCollection } from 'astro:content';
import { getSql } from './db';
import { renderChapterVisual } from './chapter-visuals';
import { CAMERA_KEYPOINTS, ISLAND_SHAPE } from './reveal/geodata-secret';

// TripState (AD-7, computed): TripContent merged with live chapter_unlocks
// state from Neon. This module's read (`getTripState`) is deliberately
// unredacted — story 4/5's admin route reuses it as-is — with redaction
// (`redactTripState`) split out as a separate pure step per AD-2.

export type ChapterKind = 'cinematic' | 'knap';

export type ChapterRevealData = {
  coordinate: string;
  placeName: string;
  // Everything below is computed server-side, on top of the content-
  // authored coordinate/placeName above, from geodata-secret.ts — never
  // imported client-side (see that module's own header). Optional/absent
  // for any chapter whose content doesn't opt into the camera reveal
  // (checked via svgVariant === 'vizier-europa' in getTripState below).
  camera?: typeof CAMERA_KEYPOINTS;
  islandShape?: typeof ISLAND_SHAPE;
};

export type TripChapterState = {
  id: string;
  /**
   * Non-descriptive DOM handle for this chapter's slot in the public page
   * ("h1", "h2", ...), derived from `order` alone.
   *
   * The static shell needs *some* stable per-chapter identifier to render
   * as a slot id and for the client to match API rows against. It used to
   * use the content id, which meant `blokarten`, `brouwerij` and
   * `spelletjes` sat in the prerendered HTML — and in every locked row of
   * the redacted API response — describing the programme to anyone reading
   * the page source. `order` is already public (it drives `data-order` and
   * the slot ordering), so keying off it adds nothing a visitor cannot
   * already see.
   *
   * The real `id` stays server-side for locked chapters and remains the
   * `chapter_unlocks` key and the admin toggle's handle, so no stored row
   * or admin flow changes with this.
   */
  slot: string;
  order: number;
  kind: ChapterKind;
  title: string;
  time: string | null;
  location: string | null;
  description: string;
  svgVariant: string;
  alwaysUnlocked: boolean;
  unlocked: boolean;
  // Destination-revealing map data (REVEAL.md) — null for every chapter
  // except bestemming. Flows through redactTripState exactly like the
  // fields above: stripped whenever the chapter is locked.
  revealData: ChapterRevealData | null;
  // Rendered illustration markup for this chapter's svgVariant, or null for
  // the text-only variants (see chapter-visuals.ts). Gated exactly like the
  // fields above — a locked chapter's scene never leaves the server.
  illustration: string | null;
};

export type TripState = {
  slug: string;
  startDate: string;
  accentColor: string;
  chapters: TripChapterState[];
};

/** Public chapter rows carry `slot`, never the content `id` — see TripChapterState.slot. */
export type RedactedChapterState =
  | { slot: string; order: number; kind: ChapterKind; unlocked: false }
  | Omit<TripChapterState, 'id'>;

export type RedactedTripState = {
  slug: string;
  startDate: string;
  accentColor: string;
  chapters: RedactedChapterState[];
};

/**
 * The public DOM handle for the chapter at `order` — see
 * TripChapterState.slot. Shared by the static shell and the API for the
 * same reason `sortByOrder` is: if the two ever disagreed, the client
 * would fail to match unlocked content to its slot.
 */
export function slotKey(order: number): string {
  return `h${order}`;
}

/** Shared chapter-ordering rule — kept in one place so the API and the static shell can never disagree on order. */
export function sortByOrder<T extends { order: number }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => a.order - b.order);
}

/**
 * Resolves `slug` against the `trips` content collection first and returns
 * `null` immediately when it doesn't exist — no DB query for an unknown
 * slug. Otherwise merges the trip's static content with its live
 * `chapter_unlocks` rows (absence of a row means locked, per AD-7).
 */
export async function getTripState(slug: string): Promise<TripState | null> {
  const trips = await getCollection('trips');
  const trip = trips.find((entry) => entry.id === slug);
  if (!trip) {
    return null;
  }

  const sql = getSql();
  const rows = (await sql`
    SELECT chapter_id, unlocked FROM chapter_unlocks WHERE trip_slug = ${slug}
  `) as { chapter_id: string; unlocked: boolean }[];
  const unlockedMap = new Map(rows.map((row) => [row.chapter_id, row.unlocked]));

  const chapters: TripChapterState[] = sortByOrder(trip.data.chapters)
    .map((chapter) => ({
      id: chapter.id,
      slot: slotKey(chapter.order),
      order: chapter.order,
      kind: chapter.kind,
      title: chapter.title,
      time: chapter.time,
      location: chapter.location,
      description: chapter.description,
      svgVariant: chapter.svgVariant,
      alwaysUnlocked: chapter.alwaysUnlocked,
      // Rendered here rather than in the page template so it travels
      // through redactTripState with the rest of the chapter's real
      // content — see chapter-visuals.ts's header for why it may not sit
      // in the prerendered shell.
      illustration: renderChapterVisual(chapter.svgVariant, trip.data.accentColor),
      // The camera/geometry fields only ever apply to the vizier-europa
      // (map-dive) chapter — computed fresh per request rather than stored,
      // so geodata-secret.ts stays the single source of truth for them.
      revealData:
        chapter.revealData && chapter.svgVariant === 'vizier-europa'
          ? {
              ...chapter.revealData,
              camera: CAMERA_KEYPOINTS,
              islandShape: ISLAND_SHAPE,
            }
          : chapter.revealData,
      // An alwaysUnlocked chapter never consults chapter_unlocks — it's not
      // part of the reveal gate at all, so no row for it needs to exist.
      unlocked: chapter.alwaysUnlocked || (unlockedMap.get(chapter.id) ?? false),
    }));

  return {
    slug: trip.data.slug,
    startDate: trip.data.startDate,
    accentColor: trip.data.accentColor,
    chapters,
  };
}

/** Return shape of `setChapterUnlocked` (story 8): both the written value
 * and the value the row held immediately before this statement ran, so the
 * caller can detect a false→true transition without a second query. */
export type SetChapterUnlockedResult = {
  unlocked: boolean;
  /** `null` when the chapter had no row yet (i.e. it read as locked). */
  previousUnlocked: boolean | null;
};

/**
 * Atomic upsert into `chapter_unlocks` (story 5), extended by story 8 to
 * also report the pre-write value in the same statement: a `WITH previous AS
 * (SELECT ...) INSERT ... ON CONFLICT DO UPDATE ... RETURNING unlocked,
 * (SELECT unlocked FROM previous)`, never a separate SELECT-then-write. This
 * keeps the read-before-write and the write itself in one atomic round trip,
 * so two concurrent toggles of the same chapter can never lose an update —
 * the row simply ends up matching whichever request's write landed last.
 *
 * The push fan-out (AD-4) is deliberately NOT wrapped together with this
 * write in a `sql.transaction([...])`: the fan-out is an external HTTP call
 * to the push service and can't participate in a Postgres transaction, so
 * atomicity only applies to this `chapter_unlocks` write. The caller
 * (`admin/toggle.ts`) reads `previousUnlocked`/`unlocked` from this
 * function's result and awaits the fan-out separately.
 *
 * Known limitation, not fixed here: under a genuine race (two concurrent
 * toggles of the same chapter), both requests can read `previousUnlocked:
 * false` before either commits, causing a double-send — acceptable given
 * this is a single-admin manual-click UI.
 */
export async function setChapterUnlocked(
  tripSlug: string,
  chapterId: string,
  unlocked: boolean,
): Promise<SetChapterUnlockedResult> {
  const sql = getSql();
  const rows = (await sql`
    WITH previous AS (
      SELECT unlocked FROM chapter_unlocks
      WHERE trip_slug = ${tripSlug} AND chapter_id = ${chapterId}
    )
    INSERT INTO chapter_unlocks (trip_slug, chapter_id, unlocked)
    VALUES (${tripSlug}, ${chapterId}, ${unlocked})
    ON CONFLICT (trip_slug, chapter_id) DO UPDATE SET unlocked = EXCLUDED.unlocked
    RETURNING unlocked, (SELECT unlocked FROM previous) AS previous_unlocked
  `) as { unlocked: boolean; previous_unlocked: boolean | null }[];

  const row = rows[0];
  return {
    unlocked: row?.unlocked ?? unlocked,
    previousUnlocked: row?.previous_unlocked ?? null,
  };
}

/**
 * Pure redaction step (AD-2): a locked chapter's entry is stripped to
 * exactly `{slot, order, kind, unlocked:false}` — never its real fields. An
 * unlocked chapter passes through with its full real fields.
 *
 * The content `id` is dropped from BOTH branches, so it never reaches a
 * public response at all: `blokarten`/`brouwerij`/`spelletjes` described
 * the programme just by being there, and the client has no use for them —
 * it matches rows to slots via `slot` (see TripChapterState.slot). The
 * unredacted `getTripState` keeps `id` for the admin route and for the
 * `chapter_unlocks` writes.
 */
export function redactTripState(state: TripState): RedactedTripState {
  return {
    slug: state.slug,
    startDate: state.startDate,
    accentColor: state.accentColor,
    chapters: state.chapters.map((chapter): RedactedChapterState => {
      if (!chapter.unlocked) {
        return { slot: chapter.slot, order: chapter.order, kind: chapter.kind, unlocked: false };
      }
      const { id: _id, ...publicChapter } = chapter;
      return publicChapter;
    }),
  };
}
