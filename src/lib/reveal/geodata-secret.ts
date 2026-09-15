import type { ZoomPoint } from '../interpolate-zoom';

// SECRET reveal geodata — SERVER-SIDE ONLY. Never import this from
// index.astro's client `<script>` block, or anywhere else that ends up in a
// browser-shipped bundle.
//
// Why this needs its own file, not just "be careful": a client `<script>`
// import gets compiled into the page's JS bundle and downloaded by EVERY
// visitor on page load — that bundle has no unlock check at all, unlike
// `/api/trip/[slug]`'s redaction. Every value in this file is derived from
// (or literally is) where Ameland sits — bundling it client-side would leak
// the destination geometrically even with zero destination text anywhere,
// defeating the exact gate this whole reveal feature was built to respect.
// The only legitimate way these values reach a browser is inside
// `revealData` in the gated API response, exactly like coordinate/placeName
// already do — see `trip-state.ts`, which is the one place allowed to
// import this module.
//
// REVEAL.md §4 amendment, 2026-09-15 (continued from geodata-public.ts): no
// mapshaper/topojson/real geodata source is available in this environment,
// so everything below is a stylized placeholder or a procedural fallback,
// not traced geography — see geodata-public.ts's header for the full
// reasoning. LOD0 (#europe-coastline) is the one exception, already public
// and already shipped.
//
// All coordinates share the existing hero-map-svg viewBox ("80 0 790 790").

// The Ameland anchor (393, 392) is NOT a new guess — it's the exact point
// index.astro's existing dive sequence already hand-pinpointed against the
// traced coastline. Reused here rather than re-derived. The Terschelling
// point is a westward offset from it (Terschelling sits just west of
// Ameland in the real Wadden chain), widened from the original -15 to -33
// once real island silhouettes (see LOD2_ISLANDS below) replaced the old
// ellipses — the actual island shapes need more room than two abstract
// dots did to read as separate islands rather than overlapping.
const AMELAND_POINT: readonly [number, number] = [393, 392];
const TERSCHELLING_POINT: readonly [number, number] = [360, 388];

// Reused verbatim from the existing fixedScanLockMove keyframe (index.astro)
// — the same "hop between a few other countries" waypoints already tuned
// and shipped in the CSS-only version this replaces.
const HOP_A: readonly [number, number] = [311, 230];
const HOP_B: readonly [number, number] = [554, 216];
const HOP_C: readonly [number, number] = [360, 402];

// Viewport "width" (w) at each stage, derived from REVEAL.md §3's own stated
// zoom multiples relative to the wide Europe frame's width (790, matching
// the shared viewBox) as 1x: 18x at the end of Duik I, 85x at the end of
// Duik II.
const W_1X = 790;
const W_18X = W_1X / 18;
// REVEAL.md doesn't give an explicit end-zoom for Act 3's swing (§3 only
// says "snel, laag" — fast, low), so 33x is this implementation's own
// interpretation: partway between Duik I's 18x and Duik II's 85x. Needs
// confirming once seen, same as the Terschelling point above.
const W_33X = W_1X / 33;
const W_85X = W_1X / 85;

export const CAMERA_KEYPOINTS = {
  wide: [475, 395, W_1X] as ZoomPoint,
  hopA: [HOP_A[0], HOP_A[1], W_1X * 0.9] as ZoomPoint,
  hopB: [HOP_B[0], HOP_B[1], W_1X * 0.85] as ZoomPoint,
  hopC: [HOP_C[0], HOP_C[1], W_1X * 0.9] as ZoomPoint,
  lockedCoast: [400, 380, W_1X * 0.6] as ZoomPoint,
  nlCoast: [TERSCHELLING_POINT[0] - 6, TERSCHELLING_POINT[1] - 4, W_18X] as ZoomPoint,
  terschelling: [TERSCHELLING_POINT[0], TERSCHELLING_POINT[1], W_18X] as ZoomPoint,
  ameland33x: [AMELAND_POINT[0], AMELAND_POINT[1], W_33X] as ZoomPoint,
  amelandDeep: [AMELAND_POINT[0], AMELAND_POINT[1], W_85X] as ZoomPoint,
} as const;

/** Five Wadden islands, west to east — Texel, Vlieland, Terschelling,
 * Ameland, Schiermonnikoog — each an instance of geodata-public.ts's
 * shared ISLAND_SHAPE (rendered client-side as
 * `translate(cx,cy) rotate(rotation) scale(scale)`), not a one-off path per
 * island. `rotation` follows the chain's real west-to-east tilt (each
 * island's head-to-tail axis angled up and to the right, matching the
 * user-supplied reference); `scale` follows the real islands' relative
 * sizes (Terschelling and Ameland are the two big ones, Vlieland and
 * Schiermonnikoog noticeably smaller, Texel the largest of all). */
export const LOD2_ISLANDS: readonly { cx: number; cy: number; rotation: number; scale: number }[] = [
  { cx: AMELAND_POINT[0] - 105, cy: AMELAND_POINT[1] + 22, rotation: -18, scale: 1.15 }, // Texel
  { cx: AMELAND_POINT[0] - 68, cy: AMELAND_POINT[1] + 14, rotation: -16, scale: 0.6 }, // Vlieland
  { cx: TERSCHELLING_POINT[0], cy: TERSCHELLING_POINT[1], rotation: -14, scale: 1 }, // Terschelling
  { cx: AMELAND_POINT[0], cy: AMELAND_POINT[1], rotation: -12, scale: 1 }, // Ameland
  { cx: AMELAND_POINT[0] + 34, cy: AMELAND_POINT[1] - 8, rotation: -10, scale: 0.55 }, // Schiermonnikoog
];

/** Ameland close-up (Act 4 deepest point / Act 5): the same ISLAND_SHAPE
 * family as LOD2's own Ameland entry, just larger and re-centered for a
 * close-up framing, plus three village-position dots (Nes, Ballum, Hollum,
 * west to east along the island's inhabited south side). */
export const LOD3_AMELAND = {
  cx: AMELAND_POINT[0],
  cy: AMELAND_POINT[1],
  rotation: -12,
  scale: 2.4,
  villages: [
    { x: AMELAND_POINT[0] - 16, y: AMELAND_POINT[1] + 4 },
    { x: AMELAND_POINT[0] - 2, y: AMELAND_POINT[1] + 2 },
    { x: AMELAND_POINT[0] + 14, y: AMELAND_POINT[1] + 3 },
  ] as { x: number; y: number }[],
};

/** Origin/target for the Act-4 channel generator (geodata-public.ts's
 * `generateChannels`) — kept here, not in the public module, since these
 * two points alone are enough to place the channels at the real location. */
export const CHANNEL_ENDPOINTS = {
  origin: TERSCHELLING_POINT,
  toward: AMELAND_POINT,
  seed: 7,
};
