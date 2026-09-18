import type { ZoomPoint } from '../interpolate-zoom';
import { ISLAND_SHAPE } from './island-trace';

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
// import this module. Exported/property names in here avoid the real
// destination name too (ISLAND_POINT, not AMELAND_POINT; islandDeep, not
// amelandDeep) — not because this file ships anywhere, but because
// trip-state.ts and index.astro's client script mirror these exact names,
// and THAT file's identifiers do compile into the public bundle.
//
// REVEAL.md §4 amendment, 2026-09-15 (continued from geodata-public.ts): no
// mapshaper/topojson/real geodata source is available in this environment,
// so everything below is a stylized placeholder or a procedural fallback,
// not traced geography — see geodata-public.ts's header for the full
// reasoning. LOD0 (#europe-coastline) is the one exception, already public
// and already shipped.
//
// All coordinates share the existing hero-map-svg viewBox ("80 0 790 790").

// ISLAND_POINT is now derived, not measured. Both nl-trace.ts (the
// mainland) and island-trace.ts (Ameland's own traced shape) come from the
// SAME real provinces-map SVG the user supplied, recentered around the
// SAME mainland-origin point — so Ameland's true real-world position
// relative to the Netherlands falls straight out of that shared coordinate
// space instead of needing a separate calibration pass. This replaces two
// earlier approaches that both needed hand-measurement: positioning
// against the real traced coastline (#europe-coastline) while showing a
// separately-drawn, mismatched island chain, and later fragment-clustering
// a hand-drawn sketch's own ink dashes.
//
// Computed as NL_CENTER + NL_SCALE * islandPointInTraceSpace, mirroring
// the same NL_CENTER={391,410}/NL_SCALE=70/NL_TRACE_WIDTH transform
// index.astro applies to nl-trace.ts's own fragment — see
// island-trace.ts's header for where the trace-space point comes from.
// Lands at (399.58, 370.39), a couple of units from the earlier
// hand-measured (405, 372), which was a reasonable independent check that
// NL_CENTER's own calibration was sound.
const ISLAND_POINT: readonly [number, number] = [399.5804943219773, 370.3941215764863];

// Viewport "width" (w) at each stage, relative to the wide Europe frame's
// width (790, matching the shared viewBox) as 1x.
const W_1X = 790;
// The dive's final target. Checked at 10x/22x/45x/60x/90x against the new
// real Ameland trace (island-trace.ts): holds up as crisp, recognizable
// coastline through 45x — meaningfully deeper than the old hand-drawn
// dash's 22x cap, since this trace has real coastal detail instead of a
// pencil wobble. By 60x it's still readable but starting to soften; by 90x
// the underlying 1-unit trace grid shows through as visible pixel-stepping
// (not blur — a vector line's own point density, not a raster/GPU-scaling
// artifact). 45x stays comfortably short of that.
const W_45X = W_1X / 45;

// Only the destination's own camera target and shape are secret now. The
// search phase's stops are public (geodata-public.ts's DECOY_STOPS) —
// they're the wrong answers, so gating them bought nothing. The hop
// waypoints and the old Terschelling/nlCoast/33x-settle targets that used
// to sit here are gone with the acts and the island-chain approach that
// used them.
export const CAMERA_KEYPOINTS = {
  wide: [475, 395, W_1X] as ZoomPoint,
  /** The dive's single target — one continuous move from the last search
   * stop straight here, no intermediate settle. */
  islandDeep: [ISLAND_POINT[0], ISLAND_POINT[1], W_45X] as ZoomPoint,
} as const;

export { ISLAND_SHAPE };
