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
 * trace above — see wadden-trace.ts's header). The source sketch draws 4
 * distinct islands, not the 5 real Wadden islands (Texel, Vlieland,
 * Terschelling, Ameland, Schiermonnikoog) — geodata-secret.ts's
 * LOD2_ISLANDS assigns one of these 4 shapes to each of the 5 real
 * islands, reusing one shape for two of them. Says nothing about *where*
 * any island is, only what they look like — actual positions stay in
 * geodata-secret.ts. */
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

  function branch(x: number, y: number, dx: number, dy: number, width: number, depth: number): void {
    if (width < 0.4 || depth > 4) return;
    const len = 18 + rand() * 14;
    const jitter = (rand() - 0.5) * 0.6;
    const ndx = dx + jitter;
    const ndy = dy + jitter * 0.4;
    const mag = Math.hypot(ndx, ndy) || 1;
    const ux = ndx / mag;
    const uy = ndy / mag;
    const midX = x + ux * len * 0.5 + (rand() - 0.5) * 6;
    const midY = y + uy * len * 0.5 + (rand() - 0.5) * 6;
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
