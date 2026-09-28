import { getCollection } from 'astro:content';
import type { TripChapterState } from './trip-state';

// Organizer-only "Reisschema" data for the admin route. Everything here is
// unredacted by design (AD-2: the organizer always sees everything) and is
// only ever imported by src/pages/[trip]/admin.astro — never by the public
// shell or /api/trip.

export type RunbookItem = {
  time: string | null;
  title: string;
  detail?: string;
  location?: string;
  owner?: string;
  url?: string;
  chapterId?: string;
};

export type OrganizerGuide = {
  runbook: { label: string; items: RunbookItem[] }[];
  notes: string[];
  links: { label: string; url: string; note?: string }[];
};

export type RunbookDay = OrganizerGuide['runbook'][number];

/** Reads the trip's `organizerGuide` straight from content — see content.config.ts. */
export async function getOrganizerGuide(slug: string): Promise<OrganizerGuide | null> {
  const trips = await getCollection('trips');
  const trip = trips.find((entry) => entry.id === slug);
  return trip ? trip.data.organizerGuide : null;
}

export function mapsSearchUrl(location: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

/**
 * Fallback draaiboek for a trip without an authored `organizerGuide.runbook`:
 * groups chapters (already in order) into days by the part of `time` before
 * the comma ("Vrijdag 2 oktober, 11:30" → "Vrijdag 2 oktober"). A chapter
 * without a time joins the day it follows in order, so e.g. the timeless
 * Bestemming reveal sits under the day it happens on.
 */
export function buildScheduleFromChapters(chapters: readonly TripChapterState[]): RunbookDay[] {
  const days: RunbookDay[] = [];

  for (const chapter of chapters) {
    const [dayPart, ...rest] = (chapter.time ?? '').split(',');
    const dayLabel = chapter.time ? (rest.length ? dayPart.trim() : chapter.time.trim()) : null;

    let day = days[days.length - 1];
    if (!day || (dayLabel && dayLabel !== day.label)) {
      day = { label: dayLabel ?? 'Zonder tijd', items: [] };
      days.push(day);
    }

    day.items.push({
      time: rest.length ? rest.join(',').trim() : null,
      title: chapter.title,
      detail: chapter.description || undefined,
      location: chapter.location ?? undefined,
      chapterId: chapter.id,
    });
  }

  return days;
}
