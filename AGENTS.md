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

The `vercel/vercel-plugin` Claude Code plugin is installed and has live, authenticated access to the real Vercel account (confirmed: `list_teams`/`list_projects` return the actual `astro-neon-spike` project under team `hobby-dd78`, `prj_6K6SK52Isov3qNkwyQgQjMWgq95y`). This changes a premise `SETUP.md` and story 1's spec were written under — that cloud provisioning is 100% human-only because agents can't do interactive browser logins:
- Agents in a session with this plugin can now read deployments/logs/env vars directly (`get_deployment`, `get_runtime_logs`, `get_runtime_errors`, `list_deployments`) and there are skills for deploying (`vercel:deploy`), env var sync (`vercel:env`), and Marketplace integrations (`vercel:marketplace`, `vercel:bootstrap`) — i.e. some of `SETUP.md`'s remaining manual steps (Neon integration, secret population) may now be agent-assistable, not purely manual.
- Not yet verified end-to-end: whether `vercel:marketplace`/Marketplace-integration tools can actually complete the Neon integration (step 3) autonomously, or still bottleneck on a one-time interactive consent. Confirm before assuming full automation.
- This capability is tied to the plugin being installed in the active session — don't assume it's present without checking (e.g. `list_teams`) first, since a fresh/different session may not have it.

## Known pitfalls

- `<svg>` elements clip to their own box by default (UA `overflow: hidden`) — scaling content inside one with a CSS transform won't visually grow past it. Set `overflow: visible` explicitly on any `<svg>` that needs to scale past its box (hit in the viewfinder/Europa-scan layer) — already fixed once in the mockup, don't reintroduce it.

<!-- /bmad:context -->
