// Per-chapter illustration markup — SERVER-SIDE ONLY, reached exclusively
// through `getTripState`/`redactTripState` (see trip-state.ts).
//
// These three scenes used to be inlined directly in [trip]/index.astro's
// chapter slots, keyed off the chapter id. That put them in the
// prerendered static shell: `display:none` hid them from the page, but the
// markup still shipped to every visitor, so view-source showed a beach
// blokart rig, a brewery kettle and a dune walk long before any of those
// chapters unlocked. Hiding with CSS is not gating (AD-2).
//
// Moving them here puts them behind the gate the trip content already uses:
// `getTripState` attaches the rendered string to its chapter, and
// `redactTripState` drops it along with every other real field whenever the
// chapter is locked — so a locked chapter's illustration never leaves the
// server, exactly like its title and description. The client injects it on
// unlock (see index.astro's loadTripState).
//
// Keyed by `svgVariant` rather than chapter id: the variant is what the
// content model already uses to pick a scene, and it keeps this module from
// caring which trip or chapter ordering it is serving.
//
// The markup below is a verbatim port of the previous inline SVG — same
// geometry, same viewBoxes, same SMIL animations, same class names (the
// reveal engine's `.reveal-bird` / `.reveal-wave` CSS still drives them
// once injected). Only the JSX `accentColor` bindings became template
// interpolations.

type ChapterVisualRenderer = (accentColor: string) => string;

const CHAPTER_VISUALS: Record<string, ChapterVisualRenderer> = {
  'blokarten-rig': (accentColor: string) => `
<svg class="chapter-illustration" viewBox="-40 -45 880 285" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
  <g transform="translate(740,-15)">
    <circle r="16" fill="none" stroke="${accentColor}" stroke-width="1.6" opacity="0.55" />
    <path d="M16,0 L26,0 M11.3,11.3 L18.4,18.4 M0,16 L0,26 M-11.3,11.3 L-18.4,18.4 M-16,0 L-26,0 M-11.3,-11.3 L-18.4,-18.4 M0,-16 L0,-26 M11.3,-11.3 L18.4,-18.4" stroke="${accentColor}" stroke-width="1.6" stroke-linecap="round" opacity="0.55" />
  </g>
  <g transform="translate(150,-8)">
    <g class="reveal-bird reveal-bird-1">
      <g class="reveal-bird-flap">
        <path d="M0,0 C-10,-7 -21,-6 -28,0 C-18,-1 -10,1 0,6 C10,1 18,-1 28,0 C21,-6 10,-7 0,0 Z" fill="${accentColor}" />
      </g>
    </g>
  </g>
  <g transform="translate(650,4)">
    <g class="reveal-bird reveal-bird-2">
      <g class="reveal-bird-flap">
        <path d="M0,0 C-9,-6 -18,-5 -24,0 C-15,-1 -9,1 0,5 C9,1 15,-1 24,0 C18,-5 9,-6 0,0 Z" fill="${accentColor}" />
      </g>
    </g>
  </g>
  <path class="reveal-wave reveal-wave-1" d="M-40,45 Q0,27 40,45 Q80,63 120,45 Q160,27 200,45 Q240,63 280,45 Q320,27 360,45 Q400,63 440,45 Q480,27 520,45 Q560,63 600,45 Q640,27 680,45 Q720,63 760,45 Q800,27 840,45" stroke="${accentColor}" stroke-width="1.8" opacity="0.4" fill="none" />
  <path class="reveal-wave reveal-wave-2" d="M-40,65 Q-20,53 20,65 Q60,77 100,65 Q140,53 180,65 Q220,77 260,65 Q300,53 340,65 Q380,77 420,65 Q460,53 500,65 Q540,77 580,65 Q620,53 660,65 Q700,77 740,65 Q780,53 820,65" stroke="${accentColor}" stroke-width="1.6" opacity="0.3" fill="none" />
  <path class="reveal-track" d="M-40,95 C160,80 320,105 500,90 C620,80 720,95 800,88" stroke="${accentColor}" stroke-width="1.6" opacity="0.35" fill="none" />
  <path class="reveal-track" d="M-40,190 C160,178 320,198 500,185 C620,177 720,192 800,183" stroke="${accentColor}" stroke-width="1" opacity="0.14" fill="none" />
  <g class="reveal-rig">
    <g transform="translate(368,-67) scale(0.68)">
      <animateTransform attributeName="transform" type="translate" values="0,0; 0,-4; 0,0" dur="0.15s" repeatCount="indefinite" additive="sum" />
      <circle cx="-10" cy="330" r="12" fill="none" stroke="${accentColor}" stroke-width="2" opacity="0.5" />
      <circle cx="-10" cy="330" r="5" fill="none" stroke="${accentColor}" stroke-width="2" opacity="0.35" />
      <line x1="30" y1="315" x2="15" y2="100" stroke="${accentColor}" stroke-width="5" stroke-linecap="round" />
      <line x1="30" y1="315" x2="105" y2="335" stroke="${accentColor}" stroke-width="3" />
      <line x1="15" y1="100" x2="90" y2="305" stroke="${accentColor}" stroke-width="1" stroke-dasharray="2,2" opacity="0.3" />
      <path d="M15,100 Q100,180 85,305 L30,315 Z" fill="${accentColor}" opacity="0.35" stroke="${accentColor}" stroke-width="3" stroke-linecap="round" />
      <path d="M15,100 Q70,180 65,305" fill="none" stroke="${accentColor}" stroke-width="2" opacity="0.45" />
      <path d="M25,150 C10,145 -5,142 -20,138" fill="none" stroke="${accentColor}" stroke-width="2.2" stroke-linecap="round" opacity="0.45" />
      <path d="M22,205 C6,200 -10,197 -26,193" fill="none" stroke="${accentColor}" stroke-width="2.2" stroke-linecap="round" opacity="0.4" />
      <path d="M20,260 C4,255 -12,252 -28,248" fill="none" stroke="${accentColor}" stroke-width="2.2" stroke-linecap="round" opacity="0.35" />
      <path d="M-5,335 L105,335 L30,315 Z" fill="none" stroke="${accentColor}" stroke-width="5" stroke-linejoin="round" />
      <circle cx="20" cy="295" r="9" fill="none" stroke="${accentColor}" stroke-width="2" opacity="0.6" />
      <path d="M15,304 L30,300 L25,325 L5,325 Z" fill="none" stroke="${accentColor}" stroke-width="2" stroke-linejoin="round" opacity="0.6" />
      <circle cx="15" cy="342" r="15" fill="none" stroke="${accentColor}" stroke-width="2" />
      <circle cx="15" cy="342" r="6" fill="none" stroke="${accentColor}" stroke-width="2" opacity="0.6" />
      <circle cx="15" cy="342" r="10" fill="none" stroke="${accentColor}" stroke-width="1" opacity="0.4" stroke-dasharray="8 4">
        <animateTransform attributeName="transform" type="rotate" from="0 15 342" to="360 15 342" dur="0.2s" repeatCount="indefinite" />
      </circle>
      <circle cx="105" cy="335" r="11" fill="none" stroke="${accentColor}" stroke-width="2" />
      <circle cx="105" cy="335" r="4" fill="none" stroke="${accentColor}" stroke-width="2" opacity="0.6" />
      <circle cx="105" cy="335" r="8" fill="none" stroke="${accentColor}" stroke-width="1" opacity="0.4" stroke-dasharray="6 3">
        <animateTransform attributeName="transform" type="rotate" from="0 105 335" to="360 105 335" dur="0.15s" repeatCount="indefinite" />
      </circle>
    </g>
  </g>
</svg>
`,

  'brouwerij-kettle': (accentColor: string) => `
<svg class="chapter-illustration" viewBox="260 500 280 195" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
  <g class="reveal-mug-left">
    <g transform="translate(345,600) rotate(14)">
      <path d="M-28,-40 L28,-40 L24,42 Q24,48 18,48 L-18,48 Q-24,48 -24,42 Z" fill="${accentColor}" opacity="0.1" />
      <path d="M-28,-40 L28,-40 L24,42 Q24,48 18,48 L-18,48 Q-24,48 -24,42 Z" stroke="${accentColor}" stroke-width="1.5" fill="none" />
      <path d="M-22,-30 L22,-30 L19,40 L-19,40 Z" fill="${accentColor}" opacity="0.22" />
      <path d="M-24,-30 L24,-30" stroke="${accentColor}" stroke-width="1" opacity="0.5" />
      <path
        d="M-30,-40 Q-22,-50 -14,-40 Q-6,-50 2,-40 Q10,-50 18,-40 Q26,-48 30,-40"
        stroke="${accentColor}"
        stroke-width="1.3"
        fill="none"
      />
      <path d="M-24,-14 C-50,-14 -50,26 -24,26" stroke="${accentColor}" stroke-width="1.5" fill="none" />
      <circle class="reveal-bubble reveal-bubble-1" cx="-6" cy="10" r="2.2" fill="${accentColor}" />
      <circle class="reveal-bubble reveal-bubble-2" cx="8" cy="-6" r="1.6" fill="${accentColor}" />
    </g>
  </g>
  <g class="reveal-mug-right">
    <g transform="translate(455,600) rotate(-14)">
      <path d="M-28,-40 L28,-40 L24,42 Q24,48 18,48 L-18,48 Q-24,48 -24,42 Z" fill="${accentColor}" opacity="0.1" />
      <path d="M-28,-40 L28,-40 L24,42 Q24,48 18,48 L-18,48 Q-24,48 -24,42 Z" stroke="${accentColor}" stroke-width="1.5" fill="none" />
      <path d="M-22,-30 L22,-30 L19,40 L-19,40 Z" fill="${accentColor}" opacity="0.22" />
      <path d="M-24,-30 L24,-30" stroke="${accentColor}" stroke-width="1" opacity="0.5" />
      <path
        d="M-30,-40 Q-22,-50 -14,-40 Q-6,-50 2,-40 Q10,-50 18,-40 Q26,-48 30,-40"
        stroke="${accentColor}"
        stroke-width="1.3"
        fill="none"
      />
      <path d="M24,-14 C50,-14 50,26 24,26" stroke="${accentColor}" stroke-width="1.5" fill="none" />
      <circle class="reveal-bubble reveal-bubble-3" cx="6" cy="8" r="2" fill="${accentColor}" />
    </g>
  </g>
  <g class="reveal-clink">
    <g transform="translate(400,552)">
      <path d="M0,-11 L0,11 M-11,0 L11,0 M-8,-8 L8,8 M-8,8 L8,-8" stroke="${accentColor}" stroke-width="1.4" />
      <circle cx="-16" cy="10" r="2" fill="${accentColor}" />
      <circle cx="17" cy="-6" r="1.6" fill="${accentColor}" />
    </g>
  </g>
</svg>
`,

  'duinexcursie-dunes': (accentColor: string) => `
<svg class="chapter-illustration" viewBox="-40 150 880 500" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
  <g class="reveal-bird">
    <g transform="translate(200,190)">
      <g class="reveal-bird-flap">
        <path
          d="M0,0 C-14,-10 -30,-8 -40,0 C-26,-2 -14,2 0,8 C14,2 26,-2 40,0 C30,-8 14,-10 0,0 Z"
          fill="${accentColor}"
        />
      </g>
    </g>
  </g>
  <path
    class="reveal-trail"
    d="M-40,470 C120,450 200,500 340,470 C460,445 560,490 680,460 C760,440 800,455 840,450"
    stroke="${accentColor}"
    stroke-width="2.4"
    stroke-linecap="round"
    fill="none"
  />
  <g class="reveal-dune-back">
    <g transform="translate(400,460)">
      <path
        d="M-420,160 C-320,10 -220,-10 -100,20 C20,50 120,-10 240,10 C340,26 400,70 420,160 Z"
        fill="${accentColor}"
        opacity="0.07"
      />
    </g>
  </g>
  <g class="reveal-dune">
    <g transform="translate(400,480)">
      <path
        d="M-400,150 C-320,-20 -260,-70 -180,-70 C-120,-70 -80,-30 -40,-20 C40,-8 100,-55 160,-55 C240,-55 320,20 400,150 Z"
        fill="${accentColor}"
        opacity="0.12"
      />
      <path
        d="M-400,150 C-320,-20 -260,-70 -180,-70 C-120,-70 -80,-30 -40,-20 C40,-8 100,-55 160,-55 C240,-55 320,20 400,150 Z"
        stroke="${accentColor}"
        stroke-width="1.5"
        fill="none"
      />
    </g>
  </g>
  <g class="reveal-grass reveal-grass-1">
    <g transform="translate(220,410)">
      <g class="reveal-grass-sway">
        <path d="M-6,0 C-10,-30 -4,-46 2,-58" stroke="${accentColor}" stroke-width="1.3" fill="none" />
        <path d="M0,0 C0,-34 4,-50 8,-64" stroke="${accentColor}" stroke-width="1.3" fill="none" />
        <path d="M6,0 C10,-28 14,-42 18,-52" stroke="${accentColor}" stroke-width="1.3" fill="none" />
      </g>
    </g>
  </g>
  <g class="reveal-grass reveal-grass-2">
    <g transform="translate(360,460)">
      <g class="reveal-grass-sway">
        <path d="M-6,0 C-10,-30 -4,-46 2,-58" stroke="${accentColor}" stroke-width="1.3" fill="none" />
        <path d="M0,0 C0,-34 4,-50 8,-64" stroke="${accentColor}" stroke-width="1.3" fill="none" />
        <path d="M6,0 C10,-28 14,-42 18,-52" stroke="${accentColor}" stroke-width="1.3" fill="none" />
      </g>
    </g>
  </g>
  <g class="reveal-grass reveal-grass-3">
    <g transform="translate(560,425)">
      <g class="reveal-grass-sway">
        <path d="M-6,0 C-10,-30 -4,-46 2,-58" stroke="${accentColor}" stroke-width="1.3" fill="none" />
        <path d="M0,0 C0,-34 4,-50 8,-64" stroke="${accentColor}" stroke-width="1.3" fill="none" />
        <path d="M6,0 C10,-28 14,-42 18,-52" stroke="${accentColor}" stroke-width="1.3" fill="none" />
      </g>
    </g>
  </g>
  <g class="reveal-rabbit">
    <g transform="translate(400,460)">
      <path
        d="M-14,10 C-14,-6 -4,-14 6,-12 C10,-20 16,-24 18,-18 C20,-14 16,-10 14,-8 C20,-4 22,4 16,10 C8,16 -8,16 -14,10 Z"
        fill="${accentColor}"
        opacity="0.14"
      />
      <path
        d="M-14,10 C-14,-6 -4,-14 6,-12 C10,-20 16,-24 18,-18 C20,-14 16,-10 14,-8 C20,-4 22,4 16,10 C8,16 -8,16 -14,10 Z"
        stroke="${accentColor}"
        stroke-width="1.2"
        fill="none"
      />
    </g>
  </g>
</svg>
`,};

/**
 * Rendered illustration for `svgVariant`, or `null` when that variant has
 * no scene of its own (the `knap-*` variants are text-only chapters).
 */
export function renderChapterVisual(svgVariant: string, accentColor: string): string | null {
  const render = CHAPTER_VISUALS[svgVariant];
  return render ? render(accentColor) : null;
}
