import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// TripContent (AD-7): on-disk, static, versioned in git. This shape never
// contains `unlocked` or packing checked-state, in any form, including as a
// seed/default value — that state lives only in Neon (see AD-7, TripState).

// svgVariant is a closed enum over the existing code-defined illustration
// treatments (BUILD_BRIEF.md): the vizier/Europa layer (bestemming), the
// Blokarten rig, the Brouwerij kettle, and the two restrained "knap"
// treatments (vrijdag, zondag). Reusing one of these for a new trip is
// content-only; a genuinely new cinematic treatment is a code change.
const svgVariants = [
  'vizier-europa',
  'blokarten-rig',
  'brouwerij-kettle',
  'knap-vrijdag',
  'knap-zondag',
] as const;

const chapterSchema = z.object({
  // Stable public contract: this id is the Neon foreign key story 5 keys
  // unlock rows on. Never rename it — renaming orphans existing unlock state.
  id: z.string().min(1),
  order: z.number().int(),
  kind: z.enum(['cinematic', 'knap']),
  title: z.string().min(1),
  // Nullable: a chapter can exist before its details are confirmed (e.g. an
  // unconfirmed Zondag time slot).
  time: z.string().nullable(),
  location: z.string().nullable(),
  description: z.string(),
  svgVariant: z.enum(svgVariants),
});

const packingItemSchema = z.object({
  // Stable public contract: this id is the localStorage key story 9's
  // client-side tracking keys on (AD-6), not a Neon foreign key — packing
  // state never reaches the server. Never rename it — renaming orphans
  // guests' locally-saved checked state, not a DB row.
  id: z.string().min(1),
  label: z.string().min(1),
});

const packingCategorySchema = z.object({
  // Not read for rendering (only `label` and `items` are) — kept for the
  // same reason chapter/item ids are: a stable key so a future feature
  // (e.g. per-category collapse state) has something to key off of that
  // isn't derived from the (renameable) display label.
  id: z.string().min(1),
  label: z.string().min(1),
  items: z.array(packingItemSchema).min(1),
});

const tripSchema = z
  .object({
    // Only source of truth for a trip's identity — the `<slug>.json`
    // filename convention is for humans only, never load-bearing (id is
    // derived from this field via generateId below, not the filename).
    // Used directly as the [trip] URL route segment, so restricted to
    // URL-safe slug characters.
    slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'slug must be lowercase letters, digits, and hyphens only'),
    // ISO 8601, e.g. "2026-10-02T11:30:00" (matches the daysLeft countdown).
    // `local: true` accepts this offset-less local-time form (and an
    // optional trailing "Z"), while still rejecting non-ISO-8601 strings.
    startDate: z.string().datetime({ local: true }),
    accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'accentColor must be a 6-digit hex color'),
    chapters: z.array(chapterSchema),
    packingList: z.array(packingCategorySchema).min(1),
  })
  .refine(
    (trip) => new Set(trip.chapters.map((chapter) => chapter.id)).size === trip.chapters.length,
    { message: 'chapters[].id must be unique within a trip', path: ['chapters'] },
  )
  .refine(
    (trip) => new Set(trip.packingList.map((category) => category.id)).size === trip.packingList.length,
    { message: 'packingList[].id must be unique within a trip', path: ['packingList'] },
  )
  .refine(
    (trip) => {
      const allItemIds = trip.packingList.flatMap((category) => category.items.map((item) => item.id));
      return new Set(allItemIds).size === allItemIds.length;
    },
    // Uniqueness spans the whole flattened list, not just within one category —
    // AD-6's localStorage state is keyed by item id alone, with no category scoping.
    { message: 'packingList[].items[].id must be unique across the whole trip', path: ['packingList'] },
  )
  .refine(
    (trip) => new Set(trip.chapters.map((chapter) => chapter.order)).size === trip.chapters.length,
    { message: 'chapters[].order must be unique within a trip', path: ['chapters'] },
  );

const trips = defineCollection({
  loader: glob({
    pattern: '**/*.json',
    base: './src/content/trips',
    // Identity comes from the content, not the filename: derive the entry id
    // from `data.slug` so filename and schema field can never disagree.
    generateId: ({ data }) => (data as { slug: string }).slug,
  }),
  schema: tripSchema,
});

export const collections = { trips };
