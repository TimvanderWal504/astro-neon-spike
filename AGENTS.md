<!-- bmad:context -->
<!-- Verified 2026-08-25 — git initialized, initial commit made (story 1-1-project-scaffold-stack-setup). Managed by bmad-project-context; edits inside this block are replaced on refresh. Keep anything you want preserved outside the markers. -->

## MoapMoap — Ameland Vriendenweekend PWA

A secret, progressive-reveal trip site for 7 friends (2–4 Oct 2026), built as a reusable content-config template for future trips. Astro 7.x + Vercel Functions (Node runtime) + Neon Postgres: a static shell that fetches live, gating-redacted content. Story 1 (scaffold) is done — `SPEC.md` and `ARCHITECTURE-SPINE.md` are the contract; `BUILD_BRIEF.md` and the `.dc.html` mockups are the locked visual/interaction source of truth.

## Policy

- Never edit `design/ameland-weekend/Main.dc.html`, `Admin.dc.html`, or `BUILD_BRIEF.md` — frozen visual/interaction source of truth; port from them, don't redesign.

## Where things are

- Contract: `_bmad-output/specs/spec-ameland-weekend/SPEC.md` (capabilities/constraints/non-goals) + `_bmad-output/planning-artifacts/architecture/architecture-MoapMoap-2026-08-24/ARCHITECTURE-SPINE.md` (AD-1…AD-9, binding invariants) — read both before touching anything under `src/api/` or `src/content/`.
- Story tracking: `_bmad-output/implementation-artifacts/sprint-status.yaml`; stories in `_bmad-output/specs/spec-ameland-weekend/stories.yaml` (flat ids "1"–"10", no `epics.md` — see that file's header comment for the epic-1 mapping convention before resolving a story key).

## Running and verifying

- Package manager is pnpm only — no npm/yarn. `pnpm install` to set up.
- `pnpm dev` — starts the Astro dev server; boots cleanly even with `DATABASE_URL` unset (`src/lib/db.ts` reads it lazily, never at module scope).
- `pnpm build` — production build via the `@astrojs/vercel` Node-runtime adapter.
- `pnpm typecheck` — runs `astro check` against the TripContent schema (`src/content.config.ts`) and all stub files.
- `DATABASE_URL` points at a Neon branch (see `.env.example` + `SETUP.md`); no migration runner exists yet (`migrations/README.md` documents the convention, implementation deferred — see `_bmad-output/implementation-artifacts/deferred-work.md`).

## Vercel plugin

The `vercel/vercel-plugin` Claude Code plugin is installed. Two separate auth paths exist, verified 2026-08-25:
- **Official Vercel MCP** (`mcp.vercel.com`, OAuth, pre-authorized) — **read-only**: `list_teams`/`list_projects`/`get_project`/`list_deployments` work; this is documented as read-only in its initial release, don't expect write tools (`deploy_to_vercel` etc.) to actually mutate anything even though they appear in the tool list.
- **Local `vercel` CLI** — not installed/authenticated by default. `pnpm add -g vercel`, then `vercel login` (device-code flow: prints a URL + code, needs a human to approve in-browser — background the command and wait, don't block on it). Once approved, the CLI session stays authenticated for the rest of that machine/user profile. `vercel link --yes --project astro-neon-spike --scope hobby-dd78` links this repo. After that, **all of it is scriptable**: `vercel env ls/add/rm`, `vercel deploy --prod --yes` all worked non-interactively.

**Verified end-to-end** (2026-08-25): Neon integration was already installed (`STORAGE_*` env vars, Production+Development scope) and all 5 app secrets (`DATABASE_URL`, `ADMIN_PASSCODE`, `COOKIE_SIGNING_SECRET`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, Production+Preview scope) were already set — likely done manually via the dashboard before the CLI path was tried. Triggered a real `vercel deploy --prod --yes`, confirmed live: `https://astro-neon-spike.vercel.app/manifest.json` → 200, `/api/trip/test` → 501 `{"ok":false,"error":"not implemented"}` as designed. So `SETUP.md` steps 3-6 are genuinely agent-completable in a session with CLI access — the earlier "not yet verified" caveat is resolved.

**Found via this**: Vercel only supports *major* Node version selection, not exact patch — `package.json`'s `engines.node` was `"24.19.0"` and triggered a build warning every deploy ("only major Node.js Version can be selected"). Fixed to `"24.x"`; `.nvmrc` stays exact (`24.19.0`) since that's for local nvm/fnm, which does support patch pins.

## Known pitfalls

- `<svg>` elements clip to their own box by default (UA `overflow: hidden`) — scaling content inside one with a CSS transform won't visually grow past it. Set `overflow: visible` explicitly on any `<svg>` that needs to scale past its box (hit in the viewfinder/Europa-scan layer) — already fixed once in the mockup, don't reintroduce it.

<!-- /bmad:context -->
