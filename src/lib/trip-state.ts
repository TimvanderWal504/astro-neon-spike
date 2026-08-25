import { getCollection } from 'astro:content';
import { getSql } from './db';

// TripState (AD-7, computed): TripContent merged with live chapter_unlocks
// state from Neon. This module's read (`getTripState`) is deliberately
// unredacted — story 4/5's admin route reuses it as-is — with redaction
// (`redactTripState`) split out as a separate pure step per AD-2.

export type ChapterKind = 'cinematic' | 'knap';

export type TripChapterState = {
  id: string;
  order: number;
  kind: ChapterKind;
  title: string;
  time: string | null;
  location: string | null;
  description: string;
  svgVariant: string;
  unlocked: boolean;
};

export type TripState = {
  slug: string;
  startDate: string;
  accentColor: string;
  chapters: TripChapterState[];
};

export type RedactedChapterState =
  | { id: string; order: number; kind: ChapterKind; unlocked: false }
  | TripChapterState;

export type RedactedTripState = {
  slug: string;
  startDate: string;
  accentColor: string;
  chapters: RedactedChapterState[];
};

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

  const chapters: TripChapterState[] = [...trip.data.chapters]
    .sort((a, b) => a.order - b.order)
    .map((chapter) => ({
      id: chapter.id,
      order: chapter.order,
      kind: chapter.kind,
      title: chapter.title,
      time: chapter.time,
      location: chapter.location,
      description: chapter.description,
      svgVariant: chapter.svgVariant,
      unlocked: unlockedMap.get(chapter.id) ?? false,
    }));

  return {
    slug: trip.data.slug,
    startDate: trip.data.startDate,
    accentColor: trip.data.accentColor,
    chapters,
  };
}

/**
 * Pure redaction step (AD-2): a locked chapter's entry is stripped to
 * exactly `{id, order, kind, unlocked:false}` — never its real fields. An
 * unlocked chapter passes through with its full real fields.
 */
export function redactTripState(state: TripState): RedactedTripState {
  return {
    slug: state.slug,
    startDate: state.startDate,
    accentColor: state.accentColor,
    chapters: state.chapters.map((chapter): RedactedChapterState =>
      chapter.unlocked
        ? chapter
        : { id: chapter.id, order: chapter.order, kind: chapter.kind, unlocked: false },
    ),
  };
}
