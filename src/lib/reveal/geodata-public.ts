// PUBLIC reveal geodata — safe to import from the page's client `<script>`
// block. Nothing in this file encodes where Ameland actually is: no anchor
// point, no camera keypoints, no island positions. That data lives in
// `geodata-secret.ts` instead, specifically because a client `<script>`
// import gets bundled into the JS every visitor's browser downloads on page
// load, regardless of unlock state — unlike the gated `/api/trip/[slug]`
// response, a client bundle import has no gate at all. See
// `geodata-secret.ts`'s own header comment for the full reasoning.

export type TracePath = { d: string; tx: number; ty: number };
export type TracedShape = { width: number; height: number; paths: TracePath[] };

export type DecoyStop = {
  /** City, shown large. */
  name: string;
  /** Country, shown under the city. */
  country: string;
  /** Display coordinate — cosmetic telemetry, not used for the camera. */
  coord: string;
  /** Camera target in the shared viewBox space ("80 0 790 790"). */
  x: number;
  y: number;
  /** Visible viewBox width at this stop — smaller = closer in. */
  w: number;
  /** Why this candidate gets thrown out. This is the joke. */
  reason: string;
};

/**
 * The search sequence's rejected candidates, in order. These are
 * deliberately PUBLIC: they're the wrong answers. Knowing the camera visits
 * Berlin and gets turned away says nothing about where the trip actually
 * goes — only Ameland's own position stays in geodata-secret.ts, so keeping
 * these here shrinks the gated payload instead of padding it.
 *
 * `w` tightens stop by stop (360 -> 280) so the hunt reads as closing in
 * rather than teleporting around at one fixed altitude.
 */
export const DECOY_STOPS: readonly DecoyStop[] = [
  { name: 'Berlijn', country: 'Duitsland', coord: '52.52°N 13.40°O', x: 471, y: 408, w: 360, reason: 'Te veel techno, te weinig strand, uitwijken' },
  { name: 'Athene', country: 'Griekenland', coord: '37.59°N 23.43°O', x: 660, y: 725, w: 340, reason: 'Niet goedgekeurd door Jenneke, andere opties bekijken' },
  { name: 'Luxemburg', country: 'Luxemburg', coord: '49.61°N 6.13°O', x: 382, y: 469, w: 320, reason: 'In 20 minuten uitgelopen, strategie aanpassen' },
  { name: 'Madrid', country: 'Spanje', coord: '40.25°N 3.42°O', x: 202, y: 636, w: 310, reason: 'Wegens El Niño geen sneeuw. uitwijken' },
  { name: 'Londen', country: 'Engeland', coord: "51.51°N 0.13°W", x: 305, y: 415, w: 300, reason: 'Brexit-formulieren nog in behandeling. koers bijstellen' },
  { name: 'Zwolle', country: 'Nederland', coord: '52.51°N 6.09°O', x: 388, y: 415, w: 280, reason: 'Te dichtbij. Blijf zoeken.' },
];

/**
 * The Netherlands outline (Act 2 backdrop) — three earlier attempts guessed
 * at this (a hand-traced path from an unrelated reference image, twice,
 * then a soft glow to dodge the alignment problem entirely) before the user
 * supplied their own hand-drawn NL outline directly and asked for it to be
 * used. This is that drawing: vtracer-traced from a screenshot of the
 * sketch, background rect dropped, each remaining fragment's real position
 * read via a live browser's `getBBox()` (not hand-parsed bezier math), then
 * recentered around the combined shape's own center — see nl-trace.ts's
 * header for the exact process.
 *
 * Rendered as many small same-color filled fragments rather than one
 * outline path, because that's what the source actually is: vtracer
 * reconstructs a pen stroke as overlapping filled regions, not a stroke
 * path, so a uniform fill across all of them reproduces the original line
 * art. Doesn't encode which Wadden island is the destination, so it's as
 * safe to ship as the coastline it sits next to. */
export { NL_TRACE_WIDTH, NL_TRACE_HEIGHT, NL_TRACE_PATHS } from './nl-trace';

/**
 * Four real Wadden-island silhouettes, west to east, from the user's own
 * hand-drawn reference (same vtracer/getBBox/recenter process as the NL
 * trace above — see wadden-trace.ts's header). Only cluster 1 (Ameland) is
 * actually used now — the separate 4-island chain this set used to supply
 * (Texel/Vlieland/Ameland/Schiermonnikoog, shown at wide zoom before the
 * close-up) was removed in favour of zooming in over NL_TRACE_PATHS' own
 * hand-drawn dash for the approach; see geodata-secret.ts's AMELAND_POINT
 * comment. Clusters 0/2/3 stay exported (and this file's header comment
 * intact) rather than deleted, in case a future pass wants that chain
 * back. Says nothing about *where* any island is, only what they look
 * like — actual positions stay in geodata-secret.ts. */
export {
  WADDEN_CLUSTER_0,
  WADDEN_CLUSTER_1,
  WADDEN_CLUSTER_2,
  WADDEN_CLUSTER_3,
} from './wadden-trace';

export type ZoomPoint2D = readonly [x: number, y: number];

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type ChannelSegment = { d: string; strokeWidth: number };

/**
 * Deterministic pseudo-random branching generator for the Wadden channel
 * network (Act 4) — REVEAL.md §4's own sanctioned fallback ("hoofdgeul
 * vanaf het zeegat, recursief vertakkend met afnemende breedte en lichte
 * willekeur") when real bathymetry isn't available, which it isn't here.
 * Seeded (mulberry32) so the output is stable across reloads rather than
 * reshuffling every render. The algorithm itself is destination-agnostic —
 * it only becomes destination-revealing once called with Ameland-specific
 * `origin`/`toward` points, which is why THOSE points live in
 * geodata-secret.ts and get passed in as arguments from the gated payload,
 * never hardcoded here.
 */
export function generateChannels(
  origin: ZoomPoint2D,
  toward: ZoomPoint2D,
  seed = 1,
): ChannelSegment[] {
  const rand = mulberry32(seed);
  const segments: ChannelSegment[] = [];

  // Segment length used to be a flat 18-32 units regardless of how far
  // apart origin/toward actually are — fine if they happened to be ~40+
  // units apart, but Terschelling/Ameland are only ~12.4 apart, so even
  // the FIRST segment alone overshot the entire gap by 1.5-2.5x before any
  // recursion, then kept wandering on jittered headings — reported back as
  // "the lines aren't connected to each other, but to another, not
  // visible island." Scaled relative to the real origin-to-toward
  // distance instead, tapering by depth, so the branching network stays
  // visually contained between the two points it's meant to connect
  // regardless of their actual real-world spacing.
  const totalDist = Math.hypot(toward[0] - origin[0], toward[1] - origin[1]) || 1;
  const baseLen = totalDist * 0.4;

  function branch(x: number, y: number, dx: number, dy: number, width: number, depth: number): void {
    if (width < 0.4 || depth > 4) return;
    const len = baseLen * Math.pow(0.75, depth) * (0.7 + rand() * 0.6);
    const jitter = (rand() - 0.5) * 0.6;
    const ndx = dx + jitter;
    const ndy = dy + jitter * 0.4;
    const mag = Math.hypot(ndx, ndy) || 1;
    const ux = ndx / mag;
    const uy = ndy / mag;
    // Same fix as len above: this used to be a flat ±3 units, which at the
    // old 18-32-unit segment length was a mild curve but at the new
    // distance-scaled (often much shorter) length would dominate the
    // segment and zigzag wildly. Scaled to the segment's own length instead.
    const midX = x + ux * len * 0.5 + (rand() - 0.5) * len * 0.3;
    const midY = y + uy * len * 0.5 + (rand() - 0.5) * len * 0.3;
    const endX = x + ux * len;
    const endY = y + uy * len;
    segments.push({ d: `M${x.toFixed(1)},${y.toFixed(1)} Q${midX.toFixed(1)},${midY.toFixed(1)} ${endX.toFixed(1)},${endY.toFixed(1)}`, strokeWidth: width });

    branch(endX, endY, ux, uy, width * (0.72 + rand() * 0.1), depth + 1);
    if (rand() > 0.35) {
      const branchAngle = (rand() - 0.5) * 1.4;
      const bdx = ux * Math.cos(branchAngle) - uy * Math.sin(branchAngle);
      const bdy = ux * Math.sin(branchAngle) + uy * Math.cos(branchAngle);
      branch(endX, endY, bdx, bdy, width * (0.45 + rand() * 0.15), depth + 1);
    }
  }

  const dx0 = toward[0] - origin[0];
  const dy0 = toward[1] - origin[1];
  branch(origin[0], origin[1], dx0, dy0, 2.6, 0);

  return segments;
}
