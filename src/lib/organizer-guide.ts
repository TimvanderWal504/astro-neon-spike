import { getCollection } from 'astro:content';
import { z } from 'astro/zod';
import type { TripChapterState } from './trip-state';

// Organizer-only "Draaiboek" data for the admin route. Everything here is
// unredacted by design (AD-2: the organizer always sees everything) and is
// only ever imported by src/pages/[trip]/admin.astro — never by the public
// shell or /api/trip.
//
// Private details that must not sit in git (people's mobile numbers, a
// rental's wifi password) come from the ORGANIZER_PRIVATE_JSON env var
// instead of the content file, keyed by trip slug:
//   {"<slug>": {"contacts": [...], "infoBlocks": [...], "links": [...]}}
// merged on top of the content's own lists at request time.

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
  infoBlocks: { label: string; items: string[] }[];
  contacts: { label: string; phone: string; note?: string }[];
  links: { label: string; url: string; note?: string }[];
};

export type RunbookDay = OrganizerGuide['runbook'][number];

const privateOverlaySchema = z.record(
  z.string(),
  z.object({
    contacts: z
      .array(z.object({ label: z.string().min(1), phone: z.string().min(1), note: z.string().optional() }))
      .default([]),
    infoBlocks: z
      .array(z.object({ label: z.string().min(1), items: z.array(z.string().min(1)) }))
      .default([]),
    // Bearer links, e.g. e-tickets anyone holding the URL can use.
    links: z
      .array(z.object({ label: z.string().min(1), url: z.string().url(), note: z.string().optional() }))
      .default([]),
  }),
);

/** Parses ORGANIZER_PRIVATE_JSON; unset or invalid means "no private details", never a failed page. */
function readPrivateOverlay(slug: string) {
  const raw = process.env.ORGANIZER_PRIVATE_JSON;
  if (!raw) return null;
  try {
    return privateOverlaySchema.parse(JSON.parse(raw))[slug] ?? null;
  } catch (err) {
    console.error('organizer-guide: ORGANIZER_PRIVATE_JSON is invalid, ignoring it:', err);
    return null;
  }
}

/**
 * Reads the trip's `organizerGuide` straight from content — see
 * content.config.ts — plus the private env overlay. Private contacts and
 * links are listed first; private infoBlock items join the content block with
 * the same label (or become a new block).
 */
export async function getOrganizerGuide(slug: string): Promise<OrganizerGuide | null> {
  const trips = await getCollection('trips');
  const trip = trips.find((entry) => entry.id === slug);
  if (!trip) return null;

  const guide = trip.data.organizerGuide;
  const overlay = readPrivateOverlay(slug);
  if (!overlay) return guide;

  const infoBlocks = guide.infoBlocks.map((block) => ({ ...block, items: [...block.items] }));
  for (const block of overlay.infoBlocks) {
    const existing = infoBlocks.find((b) => b.label === block.label);
    if (existing) existing.items.push(...block.items);
    else infoBlocks.push({ ...block });
  }

  return {
    ...guide,
    contacts: [...overlay.contacts, ...guide.contacts],
    infoBlocks,
    links: [...overlay.links, ...guide.links],
  };
}

/** `tel:` href for a display number like "06-12345678" or "0519 – 12 34 56". */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^+0-9]/g, '')}`;
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
