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
  // Stable public contract: this id is the Neon foreign key story 9 keys
  // checked-state rows on. Never rename it — renaming orphans checked state.
  id: z.string().min(1),
  label: z.string().min(1),
});

const tripSchema = z
  .object({
    // Only source of truth for a trip's identity — the `<slug>.json`
    // filename convention is for humans only, never load-bearing (id is
    // derived from this field via generateId below, not the filename).
    slug: z.string().min(1),
    // ISO 8601, e.g. "2026-10-02T11:30:00" (matches the daysLeft countdown).
    startDate: z.string().min(1),
    accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'accentColor must be a 6-digit hex color'),
    chapters: z.array(chapterSchema),
    packingList: z.array(packingItemSchema),
  })
  .refine(
    (trip) => new Set(trip.chapters.map((chapter) => chapter.id)).size === trip.chapters.length,
    { message: 'chapters[].id must be unique within a trip', path: ['chapters'] },
  )
  .refine(
    (trip) =>
      new Set(trip.packingList.map((item) => item.id)).size === trip.packingList.length,
    { message: 'packingList[].id must be unique within a trip', path: ['packingList'] },
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
