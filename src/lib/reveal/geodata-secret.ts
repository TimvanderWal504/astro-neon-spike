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

// AMELAND_POINT changed meaning entirely in this revision. It used to be
// (393, 392) — a point pinpointed against the REAL traced coastline
// (#europe-coastline), used to position a separately-drawn island chain
// next to it. That approach is gone: the request was to remove the
// separate island-chain SVG and zoom in on Ameland using the NL sketch
// itself (nl-trace.ts) as the approach.
//
// The NL sketch has its OWN internal geography, independent of the real
// coastline's — confirmed by rendering the old (393,392) on top of the NL
// trace, which landed inside the IJsselmeer's solid-shaded area, nowhere
// near the actual hand-drawn Wadden dashes along the sketch's north coast.
// The two datasets don't share a coordinate mapping just because they
// share a viewBox.
//
// (405, 372) is a NEW point, measured directly against nl-trace.ts: its
// 120 ink fragments cluster into 5 separately-drawn dashes along the north
// coast, west to east, matching the real Wadden chain's own order (Texel,
// Vlieland, Terschelling, Ameland, Schiermonnikoog) — confirmed by
// isolating the northern small fragments (height < 15, y < 380) and
// grouping them by x-position. This is the 4th cluster's fragment-weighted
// center. Checked at 20x/50x/85x zoom: recognizable as a small distinct
// shape through about 20-25x, reading as abstract ribbon fragments beyond
// that — which is why the final zoom target below stops at 40x rather
// than pushing to the old 85x, and why a separately-illustrated close-up
// (LOD3 below) still exists for the arrival itself.
const AMELAND_POINT: readonly [number, number] = [405, 372];

// Viewport "width" (w) at each stage, relative to the wide Europe frame's
// width (790, matching the shared viewBox) as 1x.
const W_1X = 790;
// The dive's final target. Was 85x (W_1X/85) when a separate, purpose-
// traced island chain carried the deepest zoom; now that the approach
// itself is the NL sketch's own small hand-drawn dash (only legible to
// about 20-25x, see AMELAND_POINT's comment), pushing to 85x would zoom
// far past what anything on screen was drawn to support. 40x is chosen to
// match LOD3_AMELAND's own scale below — see that constant's comment.
const W_40X = W_1X / 40;

// Only the destination's own camera target is secret now. The search
// phase's stops are public (geodata-public.ts's DECOY_STOPS) — they're the
// wrong answers, so gating them bought nothing. The hop waypoints and the
// old Terschelling/nlCoast/33x-settle targets that used to sit here are
// gone with the acts and the island-chain approach that used them.
export const CAMERA_KEYPOINTS = {
  wide: [475, 395, W_1X] as ZoomPoint,
  /** The dive's single target — one continuous move from the last search
   * stop straight here, no intermediate settle. */
  amelandDeep: [AMELAND_POINT[0], AMELAND_POINT[1], W_40X] as ZoomPoint,
} as const;

// LOD3 (the Ameland close-up, the only traced island shape left — see its
// own comment) targets ~60% of frame width at zoom 40 (the dive's final
// target, see W_40X above), against cluster 1's real traced width
// (w≈76.0, geodata-public.ts's WADDEN_CLUSTER_1, from the user's own
// hand-drawn reference): scale = 0.6 * (790/40) / 76 ≈ 0.156.
/** Ameland close-up: the ONLY traced island shape now (WADDEN_CLUSTER_1),
 * replacing what used to be a 4-island chain (Texel/Vlieland/Ameland/
 * Schiermonnikoog) shown at wide zoom. That chain is gone entirely — the
 * camera now approaches over the NL sketch's own small hand-drawn dash
 * (see AMELAND_POINT) instead of a separately-illustrated overview, and
 * this shape only takes over for the close-up itself, once the sketch's
 * own dash is too small to read. `traceIndex` still selects
 * WADDEN_CLUSTER_1 the same way the old chain's Ameland entry did.
 *
 * Village dots (Hollum, Ballum, Nes — west to east along the island's
 * inhabited south side): the previous scale (0.0987, calibrated for a
 * since-removed 85x arrival) had these hand-measured via isPointInFill
 * against the real silhouette at that exact scale. Scaling the shape up
 * to 0.156 (a factor of ~1.581) without touching the offsets would put
 * every dot at the wrong fraction of the now-bigger silhouette, so they're
 * scaled by that same factor to preserve where they landed. */
const VILLAGE_RESCALE = 0.156 / 0.0987;
export const LOD3_AMELAND = {
  cx: AMELAND_POINT[0],
  cy: AMELAND_POINT[1],
  rotation: -4,
  scale: 0.156,
  traceIndex: 1 as const,
  villages: [
    { x: AMELAND_POINT[0] - 2.8 * VILLAGE_RESCALE, y: AMELAND_POINT[1] + 0.8 * VILLAGE_RESCALE }, // Hollum
    { x: AMELAND_POINT[0] - 0.5 * VILLAGE_RESCALE, y: AMELAND_POINT[1] + 0.04 * VILLAGE_RESCALE }, // Ballum
    { x: AMELAND_POINT[0] + 2.0 * VILLAGE_RESCALE, y: AMELAND_POINT[1] - 1.13 * VILLAGE_RESCALE }, // Nes
  ] as { x: number; y: number }[],
};

/** Origin/target for the channel generator (geodata-public.ts's
 * `generateChannels`) — kept here, not in the public module, since these
 * two points alone are enough to place the channels at the real location.
 * Narrowed from a -9/-3 offset to -4/-2: that wider offset was tuned
 * against the old (393,392) point's own surroundings and, measured
 * against the new (405,372), would land inside the neighbouring
 * Terschelling dash rather than open water next to Ameland's own. */
export const CHANNEL_ENDPOINTS = {
  origin: [AMELAND_POINT[0] - 4, AMELAND_POINT[1] - 2] as readonly [number, number],
  toward: AMELAND_POINT,
  seed: 7,
};
