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
// traced coastline. Reused here rather than re-derived, and it's now also
// the anchor the public DECOY_STOPS' own projection was fitted against.
//
// Terschelling used to live here too, as the false bottom's settle target.
// It's gone entirely: it never stopped reading as "Ameland shown twice"
// (it shared Ameland's traced silhouette, sat 12 units away, and the
// channel ran between them), and the job it did — "so close, still wrong"
// — is now done by Zwolle in the search phase, which can't be mistaken for
// an island because it isn't one.
const AMELAND_POINT: readonly [number, number] = [393, 392];

// Viewport "width" (w) at each stage, derived from REVEAL.md §3's own stated
// zoom multiples relative to the wide Europe frame's width (790, matching
// the shared viewBox) as 1x: 18x at the end of Duik I, 85x at the end of
// Duik II.
const W_1X = 790;
const W_85X = W_1X / 85;

// Only the destination's own camera targets are secret now. The search
// phase's stops are public (geodata-public.ts's DECOY_STOPS) — they're the
// wrong answers, so gating them bought nothing. The hop waypoints and the
// Terschelling/nlCoast targets that used to sit here are gone with the
// acts that used them.
export const CAMERA_KEYPOINTS = {
  wide: [475, 395, W_1X] as ZoomPoint,
  /** The dive's single target. An intermediate 33x settle used to sit
   * between Zwolle and here; it was cut so the dive arrives in one move. */
  amelandDeep: [AMELAND_POINT[0], AMELAND_POINT[1], W_85X] as ZoomPoint,
} as const;

// Scale values below are computed against each real traced shape's own
// actual width (geodata-public.ts's WADDEN_CLUSTER_0..3, from the user's
// own hand-drawn reference — see that file's header), not guessed. Same
// target-fraction-of-frame math as before (`shapeWidth * scale ≈
// targetFraction * (790 / zoom)`), just solved per real cluster width
// instead of one generic 30-unit placeholder shape, since the four real
// shapes aren't all the same size to begin with:
//   Texel      (cluster 0, w≈74.5): target ~55% @ zoom 30 → scale ≈ 0.2216
//   Ameland    (cluster 1, w≈76.0): same target → scale ≈ 0.1895
//   Schiermonnikoog (cluster 2, w≈69.0): target ~26% @ zoom 30 → scale ≈ 0.1130
//   Vlieland   (cluster 3, w≈48.2): target ~34% @ zoom 30 → scale ≈ 0.1742
/** The Wadden chain as context around the destination, west to east —
 * Texel, Vlieland, Ameland, Schiermonnikoog. `traceIndex` selects which of
 * geodata-public.ts's 4 real traced shapes (WADDEN_CLUSTER_0..3) to render.
 *
 * Terschelling is deliberately absent. It really does sit between Vlieland
 * and Ameland, but the source drawing only has 4 distinct island shapes, so
 * it had to reuse Ameland's silhouette — two identical shapes, 12 units
 * apart, which read as the destination rendered twice no matter what else
 * was tuned. Cluster 1 is now used exactly once, by Ameland itself, so
 * nothing on screen can be mistaken for it.
 *
 * `rotation` is mostly redundant (the traced shapes already carry the
 * sketch's own west-to-east tilt) but kept as a small per-island nudge. */
export const LOD2_ISLANDS: readonly { cx: number; cy: number; rotation: number; scale: number; traceIndex: 0 | 1 | 2 | 3 }[] = [
  { cx: AMELAND_POINT[0] - 105, cy: AMELAND_POINT[1] + 22, rotation: -6, scale: 0.2216, traceIndex: 0 }, // Texel
  { cx: AMELAND_POINT[0] - 68, cy: AMELAND_POINT[1] + 14, rotation: -4, scale: 0.1742, traceIndex: 3 }, // Vlieland
  { cx: AMELAND_POINT[0], cy: AMELAND_POINT[1], rotation: -4, scale: 0.1895, traceIndex: 1 }, // Ameland
  { cx: AMELAND_POINT[0] + 34, cy: AMELAND_POINT[1] - 8, rotation: -2, scale: 0.1130, traceIndex: 2 }, // Schiermonnikoog
];

// LOD3 (the Ameland close-up) targets ~75% of frame width at zoom ~78
// (near the deepest point the camera actually reaches, 85x), against
// cluster 1's real width (w≈76.0, same shape as LOD2's Ameland entry):
// scale = 0.75 * 790 / (76 * 78) ≈ 0.0987.
/** Ameland close-up: the same traced shape (WADDEN_CLUSTER_1,
 * `traceIndex`) as LOD2's own Ameland entry, just larger, plus three
 * village dots (Hollum, Ballum, Nes — west to east along the island's
 * inhabited south side) sized to this shape's footprint at scale 0.0987.
 *
 * The village y-offsets follow the silhouette's own diagonal rather than
 * sitting on one flat line. They used to be near-level (+0.5/+0.2/+0.4),
 * which only looked right while the `inversion` act rendered them as light
 * dots on a dark ground — off-island dots were still visible there. With
 * the inversion gone they're dark-on-amber, so a dot that misses the
 * island now vanishes into the background instead, and two of the three
 * did exactly that. */
export const LOD3_AMELAND = {
  cx: AMELAND_POINT[0],
  cy: AMELAND_POINT[1],
  rotation: -4,
  scale: 0.0987,
  traceIndex: 1 as const,
  villages: [
    { x: AMELAND_POINT[0] - 3.0, y: AMELAND_POINT[1] + 0.9 }, // Hollum
    { x: AMELAND_POINT[0] - 0.5, y: AMELAND_POINT[1] + 0.3 }, // Ballum
    { x: AMELAND_POINT[0] + 2.5, y: AMELAND_POINT[1] - 0.6 }, // Nes
  ] as { x: number; y: number }[],
};

/** Origin/target for the channel generator (geodata-public.ts's
 * `generateChannels`) — kept here, not in the public module, since these
 * two points alone are enough to place the channels at the real location.
 *
 * Used to run Terschelling -> Ameland, which put the tidal channels in the
 * water *between* two islands and left them pointing away from the one that
 * matters ("de vaargeul is onduidelijk en niet op Ameland gezet"). Now it
 * runs from the sea gap just west of Ameland toward the island itself, so
 * the channels fan out against Ameland's own coast rather than bridging to
 * somewhere else. */
export const CHANNEL_ENDPOINTS = {
  origin: [AMELAND_POINT[0] - 9, AMELAND_POINT[1] - 3] as readonly [number, number],
  toward: AMELAND_POINT,
  seed: 7,
};
