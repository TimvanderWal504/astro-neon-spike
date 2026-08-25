# Bouwbrief — Ameland Vriendenweekend PWA

Handoff-document voor de agent die de echte applicatie bouwt. Alles hieronder is
vastgesteld tijdens het ontwerptraject in Claude Design (`Main.dc.html`,
`Admin.dc.html`, `canvas.json` in deze map, en de gepubliceerde preview op
https://claude.ai/code/artifact/ba875795-4021-4056-8f39-72cf95402255). Die
bestanden zijn de **visuele en interactie-bron van waarheid**: bekijk ze eerst,
dit document legt uit *waarom* ze zo zijn opgebouwd en wat er nog ontbreekt om
er een echte, werkende PWA van te maken.

## Wat dit is

Een geheime, hype-opbouwende microsite voor een weekend weg (2–4 oktober 2026)
met 7 vrienden naar Ameland, georganiseerd door Tim. Niet iedereen weet vooraf
waar ze naartoe gaan of wat er gaat gebeuren — de site onthult het programma
stuk voor stuk, tijdsgebonden, met een aankondigingsmoment per hoofdstuk. Het
ontwerp is opgezet als **herbruikbare template** voor toekomstige tripjes, dus
content/config moet data-gedreven zijn, niet hardcoded per trip.

## Functionele eisen

1. **PWA, installeerbaar** — de "Installeren"-sectie in `Main.dc.html` toont al
   de Android- en iOS-instructies. Er is nog geen echte manifest/service
   worker; die moeten gebouwd worden.
2. **Push-notificaties** wanneer een nieuw hoofdstuk wordt vrijgegeven door de
   organizer. Dit is de kernreden voor "PWA op het scherm zetten" in de UX-copy
   — zonder werkende notificaties mist de site haar belangrijkste functie.
3. **Organizer/admin-view** (`Admin.dc.html`) die **altijd alles laat zien**,
   inclusief nog-vergrendelde hoofdstukken, met aan/uit-toggles per hoofdstuk.
   **Let op — dit is nog puur visueel, niet functioneel**: `Admin.dc.html` en
   `Main.dc.html` zijn twee losstaande, geïsoleerde canvas-artboards zonder
   gedeelde state. `Main.dc.html` bevat op dit moment **geen enkele**
   conditionele logica op basis van `unlocked` — elk hoofdstuk (Bestemming,
   Vrijdag, Blokarten, Brouwerij, Zondag) rendert altijd, hoe de toggle in
   Admin ook staat. Dit is dus niet "een bestaande koppeling die nog aan een
   backend moet hangen" — de gating-logica zelf (een hoofdstuk verbergen/tonen
   op basis van `unlocked`) moet nog gebouwd worden, plus de gedeelde
   opslag/backend erachter, plus de push-notificatie die een toggle triggert.
4. **Paklijst is altijd zichtbaar**, ook als er nog hoofdstukken op slot staan
   (`alwaysOn` in `Admin.dc.html`, de floating knop in `Main.dc.html`). Nooit
   achter de reveal-gate plaatsen.
5. **Drie "cinematische" hoofdstukken** met grandeur-behandeling: Bestemming
   (met de vizier/Europa-scan-intro), Blokarten, Brouwerij. De rest (Vrijdag,
   Zondag) is "knap" — gepolijst maar ingetogen, geen zware SVG-choreografie.
   Hou dit onderscheid aan bij het toevoegen van nieuwe hoofdstukken.
6. **Cinematische momenten spelen één keer automatisch af** zodra ze in beeld
   scrollen, en zijn daarna herspeelbaar via een "Bekijk opnieuw"-knop.

## Datamodel (nog te bouwen — nu hardcoded in de mockup)

- **Hoofdstukken**: `bestemming`, `vrijdag`, `blokarten`, `brouwerij`,
  `zondag`, elk met een `unlocked`-boolean die de organizer zet. Vrijdag en
  Zondag staan in de huidige planning feitelijk al vast qua tijd, maar het
  systeem moet generiek blijven (elk hoofdstuk kan getoggled worden — zie
  `Admin.dc.html` regel ~90-96 voor de huidige rij-definitie).
- **Content per hoofdstuk**: titel, tijd/datum, locatie, beschrijving,
  eventueel SVG/illustratie-varianten. Nu hardcoded in `Main.dc.html`; moet een
  content-config worden (JSON/CMS/whatever) zodat het sjabloon herbruikbaar is
  voor een volgende trip.
- **Paklijst**: array van `{id, label}`, met per-gebruiker aangevinkte status
  (`state.checked` in de mockup — nu ook lokaal, niet gepersisteerd of
  per-gebruiker). Overweeg of dit gedeeld moet zijn (iedereen ziet dezelfde
  lijst) of per persoon.
- **Trip-metadata**: startdatum (`2026-10-02T11:30:00`, gebruikt voor de
  "dagen tot vertrek"-teller), accentkleur (nu een `data-props`-optie met 4
  presets: `#E3A64A #C97B3D #7FA98A #5B8A99`).

## Design-taal (al vastgesteld, gebruik als brand-tokens)

- **Fonts**: Space Grotesk (body), Bodoni Moda (display/koppen, `.display`
  klasse), JetBrains Mono (cijfers/labels, `.mono` klasse) — via Google Fonts.
- **Kleuren**: donkere achtergrond `#0a0d0c`, tekst `#f4f1ea`, gedempt grijs
  `#9a9a91`/`#c9c6bc`, één accentkleur (configureerbaar).
- **Sfeer**: Apple/Samsung/Google product-launch-aesthetic — macro-whitespace,
  custom cubic-bezier easing (nooit `linear`/`ease-in-out` default), GPU-safe
  animaties (alleen `transform`/`opacity`), expliciet **geen AI-slop** (geen
  generieke gradients, geen standaard iconen-sets, geen center-bias zonder
  reden).
- Er ligt een `body::after` fractal-noise overlay (`mix-blend-mode:overlay`,
  opacity 0.035) en een `AMBIENT GLOW`-laag (fixed, radial gradients,
  `mix-blend-mode:screen`) die het hele scroll-traject dezelfde lichtbron
  geven — beide zijn puur decoratief en moeten 1:1 overgenomen worden.

## Animatiesystemen — wat er al staat en hoe het werkt

Alles hieronder is pure CSS + een kleine IntersectionObserver-laag in
`Main.dc.html`'s `<script data-dc-script>`. Dit is direct herbruikbaar in een
echte build (React/Vue/vanilla, maakt niet uit), het is geen canvas-specifieke
trucage.

- **Reveal-systeem**: `.reveal` / `.reveal-fade` / `.cinematic-reveal` starten
  onzichtbaar, krijgen `.is-visible` via een `IntersectionObserver`
  (`threshold: 0.2`, eenmalig, daarna `unobserve`). Bij
  `prefers-reduced-motion: reduce` of ontbrekende `IntersectionObserver`
  krijgt alles direct `.is-visible` — geen animatie, meteen eindstaat.
- **Staggered cascade**: `.reveal-d1`…`.reveal-d5` zijn transition-delay
  modifiers (90/180/270/360/450ms) voor rijen/chips die na elkaar in beeld
  vallen.
- **Cinematische tekst-choreografie**: `.ct-eyebrow` / `.ct-title` /
  `.ct-copy` / `.ct-cta` bewegen elk op hun eigen beat (i.p.v. één blok-fade),
  gescoped via `.cinematic-reveal.is-visible .ct-*`.
- **SVG line-draw**: `stroke-dasharray`/`stroke-dashoffset` met een ruim
  dasharray-getal (groter dan de werkelijke padlengte) — hoeft niet exact te
  matchen, werkt gewoon met elke overschatting.
- **Geneste `<g>`-structuur**: buitenste `<g>` draagt alleen een
  CSS-class-gedreven transform, binnenste `<g transform="...">` houdt een
  statische SVG-transform vast — voorkomt conflicten tussen CSS-transform en
  SVG-attribuut-transform. Gebruikt bij Blokarten (rig/mast/zeil) en
  Brouwerij (ketel/hop).
- **CSS Scroll-Driven Animations** (`animation-timeline: view()` /
  `scroll()`), progressive enhancement via `@supports`: `.parallax-drift`
  (continue achtergrond-drift) en `.hero-scrub` (hero krimpt/vervaagt tijdens
  scrollen weg). Val hier niet op terug als enige mechanisme — check
  browserondersteuning en behoud de IntersectionObserver-baseline.
- **Replay-mechanisme**: `triggerPulse(section)` verwijdert `.is-visible`,
  forceert een reflow (`void el.offsetWidth`), voegt de class terug toe via
  `requestAnimationFrame` — daarmee herstart elke CSS-animatie die aan die
  class hangt. Plus een korte box-shadow "pulse" op de sectie zelf.
- **`prefers-reduced-motion: reduce`**: uitgebreid blok dat élk geanimeerd
  element naar zijn eindstaat zet met `animation: none`/`transition: none`.
  Nieuwe animaties moeten hier hun eigen fallback-regel krijgen — vergeet dit
  niet bij uitbreiden.

### De vizier/Europa-scan-laag (het meest complexe onderdeel)

Eén **persistente, `position:fixed`** laag (niet per-sectie) met een vage
Europa-kaart + bewegend vizier, zichtbaar achter hero/chips/installeren als
oneindige ambient loop. Zodra `#bestemming` in beeld scrollt (via
`body:has(#bestemming.is-visible)`), schakelt dezelfde laag om naar een
gescripte sequentie: Europa schaalt fors op (vult het scherm), het vizier
springt tussen een paar andere landen (dramatisch effect), vergrendelt op
Nederland met een flits, en duikt dan door (extreme scale + fade) om de
boot-scene te onthullen. Zie de `fixed-scan-*`-classes en
`@keyframes fixedScan*` in `Main.dc.html`.

**Kritieke valkuil, net gefixt — niet opnieuw introduceren**: elk `<svg>`
root-element heeft **standaard `overflow: hidden`** in de UA-stylesheet van
elke browser. Als je content binnen een svg opschaalt met een CSS-transform
om "het scherm te vullen", blijft die content geclipt tot de oorspronkelijke
CSS-box van de svg, ongeacht hoe hoog de scale-factor is — het lijkt dan alsof
"schalen niet werkt", terwijl het probleem clipping is. Fix: zet expliciet
`overflow: visible` op elk `<svg>`-element waarvan de inhoud buiten zijn eigen
box moet kunnen groeien. Dit is standaard CSS-gedrag, geen canvas-quirk — dus
dit moet in de echte build precies zo terugkomen.

## Bewust nog niet ingevuld / uitgesteld

- **Zondag-programma**: bewust een "?" in de content — placeholder, niet per
  ongeluk vergeten.
- **Paklijst-items**: expliciet een voorbeeldlijst, geen definitieve lijst.
- **Echte foto/video**: alle illustraties zijn nu handgetekende SVG-lijnkunst
  (geen echte foto's/video van Ameland, blokarten, de brouwerij). Kan met
  echt beeldmateriaal aangevuld/vervangen worden.
- **hyperframes (github.com/heygen-com/hyperframes)**: een lokale
  Node/FFmpeg/headless-Chrome renderpijplijn, eerder in dit traject bekeken
  voor een eventuele losse MP4-teaser (niet inline in de site, want die kan
  geen video afspelen in de canvas-sandbox — die beperking geldt niet meer in
  een echte build). Toen bewust uitgesteld tot "de echte app-bouw" — dat is nu.
  Ter info: lokaal was Node aanwezig, FFmpeg niet geïnstalleerd.
- **Admin-authenticatie**: er is geen auth-laag ontworpen. De organizer-view
  moet in de echte build worden afgeschermd (wachtwoord/link/whatever) — in
  de mockup is het gewoon een los artboard, voor iedereen bereikbaar die de
  URL kent.

## Bronbestanden in deze map

- `Main.dc.html` — publieke pagina, single-scroll reveal.
- `Admin.dc.html` — organizer-overzicht, alles zichtbaar inclusief op-slot.
- `canvas.json` — layout van de twee artboards (alleen relevant binnen Claude
  Design, geen onderdeel van de echte build).
- `ameland-vriendenweekend.html` — gegenereerde/geseede canvas-preview, ook
  niet relevant voor de echte build (bouwtool-output).
