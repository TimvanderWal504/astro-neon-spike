import type { ZoomPoint } from '../interpolate-zoom';

// REVEAL.md §4 (Geodata) amendment, 2026-09-15: this codebase has no
// mapshaper/topojson tooling and no path to real PDOK/Natural Earth data in
// this environment. Per §4's own explicit fallback ("procedureel genereren
// is een volwaardige uitkomst, geen nederlaag") and §8's phase order ("Fase 1
// en 2 gaan over camerawerk met lelijke placeholder-art. Bouw niet eerst
// mooie statische frames"), LOD1-3 below are deliberately simple stylized
// placeholders, not traced geography — the camera mechanism is the thing
// that needs to be correct first. LOD0 is the one exception: it reuses the
// existing hand-traced #europe-coastline already shipped on this page
// (index.astro's ambient hero-map), not a placeholder.
//
// All four LOD layers and every camera keypoint below share ONE coordinate
// space: the existing hero-map-svg's own viewBox ("80 0 790 790"), the exact
// space #europe-coastline is already drawn in. This is deliberate, not
// arbitrary — REVEAL.md §10 warns that mismatched per-LOD projections make
// the camera "schuiven" (drift) during crossfades; reusing one proven space
// sidesteps that entirely instead of risking it with a fresh one.

// The Ameland anchor (393, 392) is NOT a new guess — it's the exact point
// index.astro's existing dive sequence already hand-pinpointed against the
// traced coastline (see its own comment: "the point that maps back to
// absolute (393,392), the Ameland anchor"). Reused here rather than
// re-derived. The Terschelling point is a small westward offset from it
// (Terschelling sits just west of Ameland in the real Wadden chain) and,
// like the LOD1-3 placeholders, needs visual confirmation once seen — it
// was not traced, it was estimated.
export const AMELAND_POINT: readonly [number, number] = [393, 392];
export const TERSCHELLING_POINT: readonly [number, number] = [378, 390];

// Reused verbatim from the existing fixedScanLockMove keyframe (index.astro)
// — the same "hop between a few other countries" waypoints already tuned
// and shipped in the CSS-only version this replaces.
const HOP_A: readonly [number, number] = [311, 230];
const HOP_B: readonly [number, number] = [554, 216];
const HOP_C: readonly [number, number] = [360, 402];

// Viewport "width" (w) at each stage, derived from REVEAL.md §3's own stated
// zoom multiples relative to the wide Europe frame's width (790, matching
// the shared viewBox) as 1x: 18x at the end of Duik I, 85x at the end of
// Duik II. Acts 0/1 stay at 1x (nothing has zoomed yet); Act 1's search
// hops stay wide-ish (a reticle hunting across the continent, not yet
// diving) before Act 2 does the real 1x -> 18x zoom.
const W_1X = 790;
const W_18X = W_1X / 18;
const W_33X = W_1X / 33; // Act 3's eastward swing, interpreted as continuing to zoom moderately past 18x — see note below
const W_85X = W_1X / 85;

// REVEAL.md doesn't give an explicit end-zoom for Act 3's swing (§3 only
// says "snel, laag" — fast, low), so 33x is this implementation's own
// interpretation: partway between Duik I's 18x and Duik II's 85x, on the
// basis that "laag" (low) reads as already past 18x, with Duik II carrying
// the rest of the zoom to 85x. Needs confirming once seen, same as the
// Terschelling point above.
export const CAMERA_KEYPOINTS = {
  /** Acts 0-1 start: full continent, nothing located yet. */
  wide: [475, 395, W_1X] as ZoomPoint,
  /** Act 1 (Lock): the reticle's own hunt, before the first lock. */
  hopA: [HOP_A[0], HOP_A[1], W_1X * 0.9] as ZoomPoint,
  hopB: [HOP_B[0], HOP_B[1], W_1X * 0.85] as ZoomPoint,
  hopC: [HOP_C[0], HOP_C[1], W_1X * 0.9] as ZoomPoint,
  /** Act 1 end / Act 2 start: locked onto the general NL coast, not yet a specific island. */
  lockedCoast: [400, 380, W_1X * 0.6] as ZoomPoint,
  /** Act 2 (Duik I) end / Act 3 start: the long haul lands near the Wadden chain, ~18x. */
  nlCoast: [TERSCHELLING_POINT[0] - 6, TERSCHELLING_POINT[1] - 4, W_18X] as ZoomPoint,
  /** Act 3, 18.0-18.6s: camera settles specifically on Terschelling. */
  terschelling: [TERSCHELLING_POINT[0], TERSCHELLING_POINT[1], W_18X] as ZoomPoint,
  /** Act 3 end, after the mismatch and the eastward swing to Ameland. */
  ameland33x: [AMELAND_POINT[0], AMELAND_POINT[1], W_33X] as ZoomPoint,
  /** Act 4 (Duik II) end: deep in the Wad, ~85x, the final lock. */
  amelandDeep: [AMELAND_POINT[0], AMELAND_POINT[1], W_85X] as ZoomPoint,
} as const;

// --- LOD1-3 placeholder geometry -------------------------------------
// Deliberately simple (circles and short paths, not traced coastlines) per
// the phase-ordering note at the top of this file. `vector-effect="non-
// scaling-stroke"` is applied where these are rendered (index.astro), not
// here — these are just coordinates and path strings.

export const LOD1_NL_OUTLINE =
  'M 340,340 C 360,300 420,290 460,310 C 500,300 540,320 550,360 ' +
  'C 570,390 560,430 520,440 C 480,460 420,455 400,430 C 370,420 330,390 340,340 Z';

/**
 * Deterministic pseudo-random branching generator for the Wadden channel
 * network (Act 4) — REVEAL.md §4's own sanctioned fallback ("hoofdgeul
 * vanaf het zeegat, recursief vertakkend met afnemende breedte en lichte
 * willekeur") when real bathymetry isn't available, which it isn't here.
 * Seeded (mulberry32) so the output is stable across builds/reloads rather
 * than reshuffling every render.
 */
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
 * Generates one main channel from `origin` heading roughly toward `toward`,
 * branching recursively with shrinking width — reads as tidal geulen
 * without being a real survey.
 */
export function generateChannels(
  origin: readonly [number, number],
  toward: readonly [number, number],
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

/** Five Wadden islands as simple elongated blobs, west to east — Texel,
 * Vlieland, Terschelling, Ameland, Schiermonnikoog — positioned relative to
 * the Ameland anchor rather than independently guessed. */
export const LOD2_ISLANDS: readonly { cx: number; cy: number; rx: number; ry: number }[] = [
  { cx: AMELAND_POINT[0] - 42, cy: AMELAND_POINT[1] + 6, rx: 9, ry: 3.2 },
  { cx: AMELAND_POINT[0] - 26, cy: AMELAND_POINT[1] + 3, rx: 7, ry: 2.6 },
  { cx: TERSCHELLING_POINT[0], cy: TERSCHELLING_POINT[1], rx: 10, ry: 3.4 },
  { cx: AMELAND_POINT[0], cy: AMELAND_POINT[1], rx: 11, ry: 3.6 },
  { cx: AMELAND_POINT[0] + 24, cy: AMELAND_POINT[1] - 2, rx: 8, ry: 2.8 },
];

/** Ameland close-up (Act 4 deepest point / Act 5): a simple elongated
 * island outline plus three village-position dots (Nes, Ballum, Hollum,
 * roughly west to east per the real island). */
export const LOD3_AMELAND = {
  outline: `M ${AMELAND_POINT[0] - 12},${AMELAND_POINT[1] + 2} Q ${AMELAND_POINT[0]},${AMELAND_POINT[1] - 4} ${AMELAND_POINT[0] + 13},${AMELAND_POINT[1] + 1} Q ${AMELAND_POINT[0]},${AMELAND_POINT[1] + 5} ${AMELAND_POINT[0] - 12},${AMELAND_POINT[1] + 2} Z`,
  villages: [
    { x: AMELAND_POINT[0] - 6, y: AMELAND_POINT[1] + 1 },
    { x: AMELAND_POINT[0], y: AMELAND_POINT[1] },
    { x: AMELAND_POINT[0] + 6, y: AMELAND_POINT[1] + 1 },
  ],
};
