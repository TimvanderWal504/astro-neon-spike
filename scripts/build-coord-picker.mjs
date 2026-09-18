// Dev-only: generates scripts/coordinaten-picker.html — a standalone page
// (no server, no build, just open it) for placing the reveal's camera
// stops by clicking the real coastline instead of computing them from a
// projection fit. Reports coordinates in the same viewBox space the
// sequence uses ("80 0 790 790"), and emits paste-ready TS.
//
// Says nothing about the destination: it only reports wherever you click.
import fs from 'node:fs';

const src = fs.readFileSync('src/pages/[trip]/index.astro', 'utf8');
const start = src.indexOf('<g id="europe-coastline"');
const groupEnd = src.indexOf('\n          </g>', start);
const coastline = src
  .slice(start, groupEnd + '\n          </g>'.length)
  .replace(/\{accentColor\}/g, '"#c98a3a"');

// Current values, so existing pins show where things sit today.
const stopsBlock = src.includes('DECOY_STOPS') ? null : null;
const geo = fs.readFileSync('src/lib/reveal/geodata-public.ts', 'utf8');
const rows = [...geo.matchAll(/\{ name: '([^']+)', country: '([^']+)', coord: ("[^"]*"|'[^']*'), x: (-?[\d.]+), y: (-?[\d.]+), w: (-?[\d.]+), reason: '([^']*)' \}/g)]
  .map((m) => ({ name: m[1], country: m[2], coord: m[3].slice(1, -1), x: +m[4], y: +m[5], w: +m[6], reason: m[7] }));

if (!rows.length) {
  console.error('Could not parse DECOY_STOPS — picker not written.');
  process.exit(1);
}

const gridLines = [];
for (let x = 100; x <= 850; x += 50) {
  gridLines.push(`<line x1="${x}" y1="0" x2="${x}" y2="790" stroke="#4488ff" stroke-width="0.6" opacity="0.35"/>`);
  gridLines.push(`<text x="${x + 2}" y="12" fill="#6fa8ff" font-size="9" font-family="monospace">${x}</text>`);
}
for (let y = 50; y <= 780; y += 50) {
  gridLines.push(`<line x1="80" y1="${y}" x2="870" y2="${y}" stroke="#4488ff" stroke-width="0.6" opacity="0.35"/>`);
  gridLines.push(`<text x="83" y="${y - 2}" fill="#6fa8ff" font-size="9" font-family="monospace">${y}</text>`);
}

const html = `<!DOCTYPE html>
<html lang="nl"><head><meta charset="utf-8"><title>Coördinaten prikken — reveal</title>
<style>
  body { margin:0; background:#0a0d0c; color:#f4f1ea; font-family:system-ui,sans-serif; display:flex; gap:16px; padding:16px; align-items:flex-start; }
  #map { flex:0 0 auto; border:1px solid #2a2f2d; border-radius:8px; cursor:crosshair; background:#0a0d0c; }
  aside { flex:1 1 320px; max-width:460px; }
  h1 { font-size:16px; margin:0 0 4px; }
  p.hint { font-size:13px; color:#9a9790; margin:0 0 14px; line-height:1.5; }
  ol { list-style:none; padding:0; margin:0 0 14px; }
  li { padding:8px 10px; border:1px solid #2a2f2d; border-radius:6px; margin-bottom:6px; cursor:pointer; font-size:13px; display:flex; justify-content:space-between; gap:8px; }
  li.sel { border-color:#c98a3a; background:rgba(201,138,58,.12); }
  li .co { font-family:monospace; color:#9a9790; }
  li.moved .co { color:#7ddc8f; }
  textarea { width:100%; height:190px; background:#111412; color:#f4f1ea; border:1px solid #2a2f2d; border-radius:6px; font-family:monospace; font-size:11px; padding:8px; }
  button { background:#c98a3a; color:#0a0d0c; border:0; border-radius:999px; padding:8px 14px; font-weight:600; cursor:pointer; margin-top:8px; }
  #warn { display:none; background:#3a1f1f; border:1px solid #7a3a3a; color:#ffb3b3; border-radius:6px; padding:10px 12px; font-size:13px; margin:0 0 14px; }
  #warn.show { display:block; }
  #reminder { background:#1f2f22; border:1px solid #3a7a4a; color:#a3e0b3; border-radius:6px; padding:10px 12px; font-size:13px; margin-top:8px; display:none; }
  #reminder.show { display:block; }
</style></head>
<body>
<svg id="map" viewBox="80 0 790 790" width="820" height="820" xmlns="http://www.w3.org/2000/svg">
  <defs>${coastline}</defs>
  <use href="#europe-coastline"/>
  ${gridLines.join('\n  ')}
  <g id="pins"></g>
</svg>
<aside>
  <h1>Coördinaten prikken</h1>
  <p class="hint">Klik links een plaats aan, klik daarna op de kaart waar het vizier moet landen. Groen = verplaatst. Onderaan staat de regel die ik één-op-één kan overnemen. Dit bestand heeft geen server en geen koppeling met Claude — de <strong>enige</strong> manier waarop een verplaatste pin bij Claude terechtkomt, is door het tekstvak te kopiëren en in de chat te plakken. Sluit je het tabblad zonder dat, dan blijft je werk hier bewaard (dit tabblad onthoudt het) maar heeft Claude het nooit gezien.</p>
  <p id="warn"></p>
  <ol id="list"></ol>
  <textarea id="out" readonly></textarea>
  <button id="copy">Kopieer</button>
  <p id="reminder">✓ Gekopieerd. <strong>Dit bestand verandert nu niets vanzelf</strong> — plak dit blok in de chat tegen Claude, anders gaat het verloren zodra je dit tabblad sluit.</p>
</aside>
<script>
// Nothing here reaches Claude on its own — this file has no server, no
// build step, nothing but this one browser tab. Everything below exists
// only to make that limit hard to miss, after a first round where the
// picker's whole point (the clicked coordinates) silently never left the
// tab: the "Kopieer" click looked like a completed action, so the paste
// step that actually mattered got skipped.
const BASELINE = ${JSON.stringify(rows)};
const STORAGE_KEY = 'reveal-coord-picker-v1';

let stops = BASELINE;
let moved = new Set();
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  // Only restore if it's the same stop list this was generated for —
  // if geodata-public.ts changed (new/renamed/reordered stops) since the
  // save, the indices in a saved 'moved' set would point at the wrong city.
  if (saved && saved.names && saved.names.join('|') === BASELINE.map((s) => s.name).join('|')) {
    stops = saved.stops;
    moved = new Set(saved.moved);
  }
} catch {
  // localStorage can be unavailable (e.g. file:// in some browsers); the
  // picker still works, it just won't survive a closed tab.
}

const svg = document.getElementById('map');
const pins = document.getElementById('pins');
const list = document.getElementById('list');
const out = document.getElementById('out');
const warn = document.getElementById('warn');
const reminder = document.getElementById('reminder');
let sel = 0;

function esc(s){ return String(s).replace(/'/g, "\\\\'"); }

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ names: stops.map((s) => s.name), stops, moved: [...moved] }));
  } catch {
    // best-effort; the in-memory state still works for this tab session.
  }
}

function render() {
  pins.innerHTML = stops.map((s, i) => \`
    <g>
      <circle cx="\${s.x}" cy="\${s.y}" r="\${i === sel ? 7 : 5}" fill="\${moved.has(i) ? '#7ddc8f' : '#ff3355'}" stroke="#0a0d0c" stroke-width="1.5"/>
      <text x="\${s.x + 10}" y="\${s.y + 4}" fill="\${moved.has(i) ? '#7ddc8f' : '#ff7788'}" font-size="13" font-family="monospace">\${s.name}</text>
    </g>\`).join('');

  list.innerHTML = stops.map((s, i) => \`
    <li class="\${i === sel ? 'sel' : ''} \${moved.has(i) ? 'moved' : ''}" data-i="\${i}">
      <span>\${s.name} <span style="color:#6d6a65">— \${s.country}</span></span>
      <span class="co">\${s.x}, \${s.y}</span>
    </li>\`).join('');
  [...list.querySelectorAll('li')].forEach((li) => li.onclick = () => { sel = +li.dataset.i; render(); });

  out.value = stops.map((s) =>
    \`  { name: '\${esc(s.name)}', country: '\${esc(s.country)}', coord: '\${esc(s.coord)}', x: \${s.x}, y: \${s.y}, w: \${s.w}, reason: '\${esc(s.reason)}' },\`
  ).join('\\n');

  if (moved.size > 0) {
    warn.className = 'show';
    warn.textContent = moved.size + ' van de ' + stops.length + ' plekken verplaatst, nog niet naar Claude geplakt. Klik Kopieer en plak het blok in de chat — dit tabblad sluiten stuurt niets vanzelf door.';
  } else {
    warn.className = '';
  }
}

svg.addEventListener('click', (e) => {
  if (e.target.closest('#pins')) return;
  const pt = svg.createSVGPoint();
  pt.x = e.clientX; pt.y = e.clientY;
  const p = pt.matrixTransform(svg.getScreenCTM().inverse());
  stops[sel].x = Math.round(p.x);
  stops[sel].y = Math.round(p.y);
  moved.add(sel);
  if (sel < stops.length - 1) sel++;
  persist();
  render();
});

document.getElementById('copy').onclick = () => {
  out.select();
  document.execCommand('copy');
  reminder.className = moved.size > 0 ? 'show' : '';
};
render();
</script>
</body></html>`;

fs.writeFileSync('scripts/coordinaten-picker.html', html);
console.log('scripts/coordinaten-picker.html geschreven —', rows.length, 'stops,', (html.length / 1024).toFixed(0), 'KB');
