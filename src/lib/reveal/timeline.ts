// REVEAL.md §3 — the seven-act timeline, encoded as pure data + pure
// functions so it's testable without a DOM (see scratch tests run during
// development). All times are seconds, matching the doc's own table.

export type ActId = 'prologue' | 'search' | 'dive' | 'inversion' | 'name';

export type Act = {
  id: ActId;
  start: number;
  duration: number;
  /** Whether scroll can offset `t` within this act (REVEAL.md §7). */
  scrollScrubbed: boolean;
};

export const TOTAL_DURATION_S = 45.0;

/** How long each rejected candidate holds the screen, in seconds. Six of
 * them fill `search`'s 30s — change one and the other must follow. */
export const SECONDS_PER_STOP = 5.0;

// Restructured from the original 7 acts (REVEAL.md §3) after the search
// phase turned out to be the part that worked and the Terschelling false
// bottom the part that didn't: the old `lock` hopped between three unnamed
// waypoints that meant nothing, then `falseBottom` dived onto Terschelling
// and corrected to Ameland — which rendered two near-identical islands and
// read as the same island twice.
//
// Now the hunt IS the sequence: six named, rejected candidates at 5s each
// (geodata-public.ts's DECOY_STOPS), ending on Zwolle — right country,
// still wrong — which does the false bottom's job without needing a second
// island on screen at all. Only then does the camera dive to Ameland.
export const ACTS: readonly Act[] = [
  { id: 'prologue', start: 0.0, duration: 5.0, scrollScrubbed: false },
  { id: 'search', start: 5.0, duration: 30.0, scrollScrubbed: false },
  { id: 'dive', start: 35.0, duration: 5.0, scrollScrubbed: true },
  { id: 'inversion', start: 40.0, duration: 2.5, scrollScrubbed: false },
  { id: 'name', start: 42.5, duration: 2.5, scrollScrubbed: false },
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
