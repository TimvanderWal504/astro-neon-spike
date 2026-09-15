// REVEAL.md §1: "d3-interpolate, alleen interpolateZoom" — vendored rather
// than pulled in as a dependency (the function is ~40 lines and this keeps
// the site's zero-runtime-dependency status), but the algorithm itself is
// NOT reinvented — this is a faithful TypeScript port of d3-interpolate's
// interpolateZoom (Van Wijk & Nuij, "Smooth and efficient zooming and
// panning", INFOVIS 2003), MIT licensed, https://github.com/d3/d3-interpolate.
// REVEAL.md is explicit that a hand-rolled camera path "er altijd net
// verkeerd uitziet" (always looks subtly wrong) — this is why.

export type ZoomPoint = readonly [x: number, y: number, w: number];
export type ZoomInterpolator = ((t: number) => ZoomPoint) & { duration: number };

const EPSILON2 = 1e-12;
const RHO = Math.SQRT2;
const RHO2 = RHO * RHO;
const RHO4 = RHO2 * RHO2;

function cosh(x: number): number {
  const e = Math.exp(x);
  return (e + 1 / e) / 2;
}

function sinh(x: number): number {
  const e = Math.exp(x);
  return (e - 1 / e) / 2;
}

function tanh(x: number): number {
  const e = Math.exp(2 * x);
  return (e - 1) / (e + 1);
}

/**
 * Returns an interpolator between two `[x, y, w]` points, where `w` is the
 * width of the viewport (bigger `w` = more zoomed out). `interpolator(t)`
 * for `t` in [0, 1] gives the camera's position along a path that pans and
 * zooms simultaneously in a way that reads as one continuous, constant-feeling
 * motion. `interpolator.duration` is the path's own "natural" duration in
 * milliseconds if you want the true Van Wijk & Nuij pacing — REVEAL.md's
 * timeline (§3) instead drives `t` from fixed act durations, so this is
 * exposed for reference/debugging, not used to time anything directly.
 */
export function interpolateZoom(p0: ZoomPoint, p1: ZoomPoint): ZoomInterpolator {
  const [ux0, uy0, w0] = p0;
  const [ux1, uy1, w1] = p1;
  const dx = ux1 - ux0;
  const dy = uy1 - uy0;
  const d2 = dx * dx + dy * dy;

  let i: (t: number) => ZoomPoint;
  let S: number;

  if (d2 < EPSILON2) {
    // Start and end points coincide (or are extremely close): degrade to a
    // pure zoom, no pan — the general formula below divides by d1 (sqrt(d2))
    // and blows up as d2 -> 0.
    S = Math.log(w1 / w0) / RHO;
    i = (t: number) => [ux0 + t * dx, uy0 + t * dy, w0 * Math.exp(RHO * t * S)];
  } else {
    const d1 = Math.sqrt(d2);
    const b0 = (w1 * w1 - w0 * w0 + RHO4 * d2) / (2 * w0 * RHO2 * d1);
    const b1 = (w1 * w1 - w0 * w0 - RHO4 * d2) / (2 * w1 * RHO2 * d1);
    const r0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0);
    const r1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1);
    S = (r1 - r0) / RHO;
    i = (t: number) => {
      const s = t * S;
      const coshr0 = cosh(r0);
      const u = (w0 / (RHO2 * d1)) * (coshr0 * tanh(RHO * s + r0) - sinh(r0));
      return [ux0 + u * dx, uy0 + u * dy, (w0 * coshr0) / cosh(RHO * s + r0)];
    };
  }

  const interpolator = i as ZoomInterpolator;
  interpolator.duration = (S * 1000 * RHO) / Math.SQRT2;
  return interpolator;
}
