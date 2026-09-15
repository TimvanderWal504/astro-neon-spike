// PUBLIC reveal geodata — safe to import from the page's client `<script>`
// block. Nothing in this file encodes where Ameland actually is: no anchor
// point, no camera keypoints, no island positions. That data lives in
// `geodata-secret.ts` instead, specifically because a client `<script>`
// import gets bundled into the JS every visitor's browser downloads on page
// load, regardless of unlock state — unlike the gated `/api/trip/[slug]`
// response, a client bundle import has no gate at all. See
// `geodata-secret.ts`'s own header comment for the full reasoning.

/**
 * Netherlands outline (Act 2 backdrop) — this time calibrated against the
 * REAL rendered coastline instead of guessed from an unrelated reference
 * image (twice) or replaced with a glow to dodge the problem (once). The
 * calibration: froze the live camera transform mid-sequence, read its
 * exact applied `scale()`/`translate()` values back out of the DOM (not
 * predicted from timing — actual values), screenshotted the real coastline
 * with the highlight layer hidden, and inverted the same transform formula
 * to convert visually-read pixel coordinates back into this file's world
 * coordinate space. Result: the real Netherlands is only about 75x45
 * units here, not the 170x160 the earlier two attempts used — the country
 * is genuinely much smaller relative to this viewBox than either previous
 * pass assumed, which was as much the problem as the exact border shape.
 * Deliberately modest vertex count (a recognizable silhouette: the
 * southwest river-mouth notch, the west coast, the northern bulge, the
 * eastern border) rather than a highly detailed trace — this is a "sell
 * moment" highlight, not a survey map. Coordinates share
 * #europe-coastline's own viewBox ("80 0 790 790"). Doesn't encode which
 * Wadden island is the destination, so it's as safe to ship as the
 * coastline it sits next to. */
export const LOD1_NL_OUTLINE =
  'M356,428 ' +
  'Q360,412 367,400 ' + // west coast, rising north
  'Q378,394 394,391 ' + // curving toward the north-central bulge
  'Q408,389 420,388 ' + // northern coast
  'Q426,390 428,395 ' + // northeast corner, toward the German border
  'Q426,408 423,421 ' + // eastern (German) border heading south
  'Q410,427 394,431 ' + // southern (Belgian) border
  'Q380,430 367,429 ' + // back along the south
  'Q358,429 356,428 Z';

/**
 * One barrier-island silhouette — a rounded dune-covered "head" tapering
 * into a thin curving sand-spit "tail" — traced from the user-supplied
 * Wadden-chain reference image rather than the plain ellipses this
 * replaced. Every real Wadden island (Texel through Schiermonnikoog) shares
 * this same family shape (longshore drift builds them the same way), so
 * one reusable path, placed/rotated/scaled per island, reads truer than
 * five hand-drawn one-offs would. Local coordinate space: roughly
 * -16..16 on x, -5..5 on y, head toward -x, tail curling toward +x — safe
 * to ship client-side since it says nothing about *where* any island is,
 * only what one looks like. Actual island positions (which is Ameland,
 * which is Terschelling) live in geodata-secret.ts. */
export const ISLAND_SHAPE =
  'M-16,-1.5 C-16,-4.5 -10,-5.5 -3,-5 ' +
  'C4,-4.5 10,-3 14,-0.5 ' +
  'C16,0.7 15,2 11,1.6 ' +
  'C6,1 1,2.4 -5,2 ' +
  'C-10,1.6 -14,2.2 -16,0.5 Z';

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
