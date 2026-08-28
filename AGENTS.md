<!-- bmad:context -->
<!-- Verified 2026-08-28 against 314be7db0a902d389b49486ea21efd8efdf5f9f4. Managed by bmad-project-context; edits inside this block are replaced on refresh. Keep anything you want preserved outside the markers. -->

## MoapMoap — Ameland Vriendenweekend PWA

A secret, progressive-reveal trip site for 7 friends (2–4 Oct 2026), built as a reusable content-config template for future trips. Astro 7.x + Vercel Functions (Node runtime) + Neon Postgres: a static shell that fetches live, gating-redacted content. `SPEC.md` and `ARCHITECTURE-SPINE.md` are the contract; `BUILD_BRIEF.md` and the `.dc.html` mockups are the locked visual/interaction source of truth.

## Policy

- If you are editing `design/ameland-weekend/Main.dc.html`, `Admin.dc.html`, or `BUILD_BRIEF.md`, please notify the user. TThese files represent the established visual and interaction standard and must remain unchanged unless explicit authorization is provided. Proceed only once the user approves the proposed edits.
- Trip slugs must never reveal the destination — the slug drives the public URL guests click to reach a locked surprise reveal (the Bestemming chapter); a giveaway slug defeats the reveal before it happens.

## Where things are

- Contract: `_bmad-output/specs/spec-ameland-weekend/SPEC.md` (capabilities/constraints/non-goals) + `_bmad-output/planning-artifacts/architecture/architecture-MoapMoap-2026-08-24/ARCHITECTURE-SPINE.md` (AD-1…AD-9, binding invariants) — read both before touching anything under `src/api/` or `src/content/`.
- Story tracking: `_bmad-output/implementation-artifacts/sprint-status.yaml`; stories in `_bmad-output/specs/spec-ameland-weekend/stories.yaml` (flat ids "1"–"10", no `epics.md` — see that file's header comment for the epic-1 mapping convention before resolving a story key).

## Running and verifying

- Package manager is pnpm only — no npm/yarn. `pnpm install` to set up.
- `pnpm dev` — starts the Astro dev server; boots cleanly even with `DATABASE_URL` unset (`src/lib/db.ts` reads it lazily, never at module scope). On this machine it does **not** reliably pick up `DATABASE_URL` from `.env.development` — export it in the shell before launching `astro dev`, or any route calling `getSql()` throws "DATABASE_URL is not set". (`pnpm migrate` has its own env loader and is unaffected.)
- `pnpm build` — production build via the `@astrojs/vercel` Node-runtime adapter.
- `pnpm typecheck` — runs `astro check` against the TripContent schema (`src/content.config.ts`) and all stub files.
- `pnpm migrate` — applies `migrations/*.sql` in numeric order via `scripts/migrate.mjs` (transactional DDL + `_migrations` ledger, safe to re-run). Prod has no automated path: apply manually with `DATABASE_URL=<prod-connection-string> pnpm migrate`.
- Vercel CLI isn't installed/authenticated by default. The official Vercel MCP (`mcp.vercel.com`) is read-only. To deploy or manage env vars: `pnpm add -g vercel`, `vercel login` (device-code flow, needs a human to approve in-browser), then `vercel link --yes --project astro-neon-spike --scope hobby-dd78` — after that `vercel env` / `vercel deploy --prod --yes` work non-interactively.

## Conventions that differ from defaults

- Client IP from `x-forwarded-for` must use the **last** entry, never the first — the first entry is client-spoofable and lets an attacker rotate it per request to bypass rate limiting (`src/lib/admin-auth.ts`; caught by story 4's code review, AD-5).

## Known pitfalls

- `<svg>` elements clip to their own box by default (UA `overflow: hidden`) — scaling content inside one with a CSS transform won't visually grow past it. Set `overflow: visible` explicitly on any `<svg>` that needs to scale past its box (hit in the viewfinder/Europa-scan layer) — already fixed once in the mockup, don't reintroduce it.
- Vercel only supports selecting a *major* Node version in the dashboard, not an exact patch — keep `package.json`'s `engines.node` at `"24.x"` (not the exact `.nvmrc` patch), or every deploy warns.

<!-- /bmad:context -->
