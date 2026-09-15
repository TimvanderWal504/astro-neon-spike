// REVEAL.md §3 — the seven-act timeline, encoded as pure data + pure
// functions so it's testable without a DOM (see scratch tests run during
// development). All times are seconds, matching the doc's own table.

export type ActId = 'prologue' | 'lock' | 'dive1' | 'falseBottom' | 'dive2' | 'inversion' | 'name';

export type Act = {
  id: ActId;
  start: number;
  duration: number;
  /** Whether scroll can offset `t` within this act (REVEAL.md §7). */
  scrollScrubbed: boolean;
};

export const TOTAL_DURATION_S = 36.0;

export const ACTS: readonly Act[] = [
  { id: 'prologue', start: 0.0, duration: 5.0, scrollScrubbed: false },
  { id: 'lock', start: 5.0, duration: 6.0, scrollScrubbed: false },
  { id: 'dive1', start: 11.0, duration: 7.0, scrollScrubbed: true },
  { id: 'falseBottom', start: 18.0, duration: 5.0, scrollScrubbed: false },
  { id: 'dive2', start: 23.0, duration: 8.0, scrollScrubbed: true },
  { id: 'inversion', start: 31.0, duration: 2.5, scrollScrubbed: false },
  { id: 'name', start: 33.5, duration: 2.5, scrollScrubbed: false },
];

export type ActState = {
  act: Act;
  /** 0-1 progress within this act's own duration. */
  localT: number;
};

/** Which act is active at elapsed time `tSeconds`, and how far into it. Clamps to the last act past the end (§7's clock never runs backward or loops). */
export function getActState(tSeconds: number): ActState {
  const clamped = Math.max(0, tSeconds);
  for (let i = ACTS.length - 1; i >= 0; i--) {
    const act = ACTS[i];
    if (clamped >= act.start) {
      const localT = Math.min(1, (clamped - act.start) / act.duration);
      return { act, localT };
    }
  }
  return { act: ACTS[0], localT: 0 };
}

export function isScrollScrubbedAt(tSeconds: number): boolean {
  return getActState(tSeconds).act.scrollScrubbed;
}

/**
 * REVEAL.md §7 "elastisch scrubben": the clock always advances; scroll only
 * ever pushes a clamped, spring-returning offset on top of it. Pure state
 * update so it's callable from a rAF loop or a test the same way.
 */
export type ScrubState = { offsetS: number; velocity: number };

const SCRUB_CLAMP_S = 0.8;
const SPRING_STIFFNESS = 120;
const SPRING_DAMPING = 18;

export function pushScrubOffset(state: ScrubState, scrollDeltaPx: number, sensitivity: number): ScrubState {
  const next = state.offsetS + scrollDeltaPx * sensitivity;
  return { offsetS: Math.max(-SCRUB_CLAMP_S, Math.min(SCRUB_CLAMP_S, next)), velocity: state.velocity };
}

/** One spring-integration step (semi-implicit Euler) pulling `offsetS` back toward 0. `dt` in seconds. */
export function stepScrubSpring(state: ScrubState, dt: number): ScrubState {
  const force = -SPRING_STIFFNESS * state.offsetS - SPRING_DAMPING * state.velocity;
  const velocity = state.velocity + force * dt;
  const offsetS = state.offsetS + velocity * dt;
  // Settle fully once close enough — an eternally-decaying spring never
  // quite reaches exactly 0, which would keep scroll sensitivity "on"
  // forever at a vanishingly small but nonzero offset.
  if (Math.abs(offsetS) < 1e-4 && Math.abs(velocity) < 1e-4) {
    return { offsetS: 0, velocity: 0 };
  }
  return { offsetS, velocity };
}
