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
// (405, 372) is measured directly against nl-trace.ts: its 120 ink
// fragments cluster into 5 separately-drawn dashes along the north coast,
// west to east, matching the real Wadden chain's own order (Texel,
// Vlieland, Terschelling, Ameland, Schiermonnikoog) — confirmed by
// isolating the northern small fragments (height < 15, y < 380) and
// grouping them by x-position. This is the 4th cluster's fragment-weighted
// center.
const AMELAND_POINT: readonly [number, number] = [405, 372];

// Viewport "width" (w) at each stage, relative to the wide Europe frame's
// width (790, matching the shared viewBox) as 1x.
const W_1X = 790;
// The dive's final target. A separate, purpose-traced close-up shape
// (WADDEN_CLUSTER_1) used to carry the deepest zoom, reaching 85x — that
// shape is gone entirely now ("Je hebt nog steeds de eilanden svg staan.
// Ik vroeg of je deze weg wilde halen"), so the reveal is only ever the NL
// sketch's own small hand-drawn dash. Checked at 20x/50x/85x zoom: that
// dash reads as a small distinct shape through about 20-25x and as
// abstract ribbon fragments beyond that, so the dive stops at 22x —
// comfortably inside the legible range — rather than zooming past
// anything the sketch was actually drawn to support.
const W_22X = W_1X / 22;

// Only the destination's own camera target is secret now. The search
// phase's stops are public (geodata-public.ts's DECOY_STOPS) — they're the
// wrong answers, so gating them bought nothing. The hop waypoints and the
// old Terschelling/nlCoast/33x-settle targets that used to sit here are
// gone with the acts and the island-chain approach that used them.
export const CAMERA_KEYPOINTS = {
  wide: [475, 395, W_1X] as ZoomPoint,
  /** The dive's single target — one continuous move from the last search
   * stop straight here, no intermediate settle. */
  amelandDeep: [AMELAND_POINT[0], AMELAND_POINT[1], W_22X] as ZoomPoint,
} as const;

/** Origin/target for the channel generator (geodata-public.ts's
 * `generateChannels`) — kept here, not in the public module, since these
 * two points alone are enough to place the channels at the real location. */
export const CHANNEL_ENDPOINTS = {
  origin: [AMELAND_POINT[0] - 4, AMELAND_POINT[1] - 2] as readonly [number, number],
  toward: AMELAND_POINT,
  seed: 7,
};
