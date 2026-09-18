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
  { name: 'Madrid', country: 'Spanje', coord: '40.25°N 3.42°W', x: 202, y: 636, w: 310, reason: 'Wegens El Niño geen sneeuw. uitwijken' },
  { name: 'Londen', country: 'Engeland', coord: "51.51°N 0.13°W", x: 305, y: 415, w: 300, reason: 'Brexit-formulieren nog in behandeling. koers bijstellen' },
  { name: 'Zwolle', country: 'Nederland', coord: '52.51°N 6.09°O', x: 388, y: 415, w: 280, reason: 'Te dichtbij. Blijf zoeken.' },
];

/**
 * The Netherlands outline (Act 2 backdrop) — three earlier attempts guessed
 * at this (a hand-traced path from an unrelated reference image, twice,
 * then a soft glow to dodge the alignment problem entirely), then the
 * user's own hand-drawn NL sketch, which traced as overlapping shadow/ink
 * fragments and still left the IJsselmeer and Zeeland's waters solid-filled
 * ("nog een oranje achtergrond") — an artifact of the hand-drawn source
 * itself. This is the real replacement: a Netherlands provinces vector
 * illustration the user supplied directly, vtracer-traced. The country and
 * province borders trace as ONE path of disjoint filled subpaths
 * reconstructing the border-line ink — confirmed by isolating it alone: a
 * clean outline map, no solid interior fill, nothing to filter. See
 * nl-trace.ts's header for the exact process.
 *
 * Doesn't encode which Wadden island is the destination — that shape lives
 * in geodata-secret.ts instead (see island-trace.ts) — so this mainland
 * outline is as safe to ship as the coastline it sits next to. */
export { NL_TRACE_WIDTH, NL_TRACE_HEIGHT, NL_TRACE_PATHS } from './nl-trace';

