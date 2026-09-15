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
// traced coastline. Reused here rather than re-derived.
//
// The Terschelling point was widened from the original -15 offset to -33
// at one point (to give real island silhouettes more room than two
// abstract dots needed), but that moved the camera's Act-3 settle target
// off the actual traced coastline — confirmed via screenshot: the reticle
// ended up centered over open water, with the coastline itself sitting in
// a corner of the frame instead of under it. Reverted to a small offset
// close to the original, still-unverified-but-at-least-coastline-adjacent
// value. Island spacing is instead handled by LOD2_ISLANDS' own offsets
// below (which don't move the camera, only where islands are drawn), not
// by relocating the one point the camera actually settles on.
const AMELAND_POINT: readonly [number, number] = [393, 392];
const TERSCHELLING_POINT: readonly [number, number] = [381, 389];

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

// Scale values below are computed, not guessed — the earlier ones (Ameland
// at scale 1) were sized as if the camera would eventually zoom in ~6-7x
// further than it actually does, so by the time LOD2 reached full opacity
// the island was already bigger than the screen: pure fill with no
// visible edge, reported back as "still blobs, I cannot see the outlines."
//
// ISLAND_SHAPE spans about 30 local units wide (x: -16..14). The screen's
// visible width in viewBox units at zoom Z is `790 / Z` (790 = the shared
// viewBox's own width, "1x"). Solving `30 * scale = targetFraction *
// (790 / Z)` for scale, at the zoom level each layer is actually visible:
// LOD2 (island-chain overview) targets ~55% of frame width at zoom ~30
// (roughly where it now fades in, see the fadeInOut thresholds in
// index.astro's tick()): scale = 0.55 * 790 / (30 * 30) ≈ 0.48.
/** Five Wadden islands, west to east — Texel, Vlieland, Terschelling,
 * Ameland, Schiermonnikoog — each an instance of geodata-public.ts's
 * shared ISLAND_SHAPE (rendered client-side as
 * `translate(cx,cy) rotate(rotation) scale(scale)`), not a one-off path per
 * island. `rotation` follows the chain's real west-to-east tilt (each
 * island's head-to-tail axis angled up and to the right, matching the
 * user-supplied reference); `scale` follows the real islands' relative
 * sizes (Terschelling and Ameland are the two big ones, Vlieland and
 * Schiermonnikoog noticeably smaller, Texel the largest of all) around
 * that computed 0.48 baseline for Ameland. */
export const LOD2_ISLANDS: readonly { cx: number; cy: number; rotation: number; scale: number }[] = [
  { cx: AMELAND_POINT[0] - 105, cy: AMELAND_POINT[1] + 22, rotation: -18, scale: 0.55 }, // Texel
  { cx: AMELAND_POINT[0] - 68, cy: AMELAND_POINT[1] + 14, rotation: -16, scale: 0.28 }, // Vlieland
  { cx: TERSCHELLING_POINT[0], cy: TERSCHELLING_POINT[1], rotation: -14, scale: 0.48 }, // Terschelling
  { cx: AMELAND_POINT[0], cy: AMELAND_POINT[1], rotation: -12, scale: 0.48 }, // Ameland
  { cx: AMELAND_POINT[0] + 34, cy: AMELAND_POINT[1] - 8, rotation: -10, scale: 0.26 }, // Schiermonnikoog
];

// LOD3 (the Ameland close-up) targets ~75% of frame width at zoom ~78
// (near the deepest point the camera actually reaches, 85x):
// scale = 0.75 * 790 / (30 * 78) ≈ 0.25.
/** Ameland close-up (Act 4 deepest point / Act 5): the same ISLAND_SHAPE
 * family as LOD2's own Ameland entry, just larger and re-centered for a
 * close-up framing, plus three village-position dots (Nes, Ballum, Hollum,
 * west to east along the island's inhabited south side) — offsets scaled
 * down to match this shape's actual footprint at 0.25 (the old ±14..16
 * offsets were sized for the old scale-2.4 version and would have placed
 * every village dot well outside the new, correctly-sized outline). */
export const LOD3_AMELAND = {
  cx: AMELAND_POINT[0],
  cy: AMELAND_POINT[1],
  rotation: -12,
  scale: 0.25,
  villages: [
    { x: AMELAND_POINT[0] - 3.5, y: AMELAND_POINT[1] + 0.5 },
    { x: AMELAND_POINT[0] - 0.5, y: AMELAND_POINT[1] + 0.2 },
    { x: AMELAND_POINT[0] + 3, y: AMELAND_POINT[1] + 0.4 },
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
