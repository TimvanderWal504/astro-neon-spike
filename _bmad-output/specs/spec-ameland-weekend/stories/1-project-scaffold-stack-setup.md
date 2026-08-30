---
title: 'Project scaffold & stack setup'
type: 'chore'
created: '2026-08-24'
status: 'done'
review_loop_iteration: 0
baseline_commit: 'NO_VCS'
context: ['{project-root}/_bmad-output/planning-artifacts/architecture/architecture-MoapMoap-2026-08-24/ARCHITECTURE-SPINE.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** No code exists yet for the Ameland Vriendenweekend PWA — no Astro project, no DB client, no content schema, no migration convention, and no documented env vars — so no later story has anywhere to build against.

**Approach:** Scaffold a local Astro 7.x project matching the architecture spine's Structural Seed, define `src/content.config.ts`'s TripContent schema via the Content Layer API (AD-7), pick and document one SQL migration convention (the runner script implementing it is deferred — see `deferred-work.md`), wire `src/lib/db.ts` to Neon via env var, initialize git, and write a manual setup guide + `.env.example` for the Vercel/Neon account provisioning only the human can do (interactive login). Package manager is pnpm — no npm/yarn anywhere (lockfile, scripts, docs).

## Boundaries & Constraints

**Always:**
- Stack pinned per ARCHITECTURE-SPINE.md: Astro latest 7.x as a caret range (`^7.x.x`) — the committed lockfile is the reproducibility guarantee, not a hand-pinned exact patch — `@astrojs/vercel` adapter targeting Node.js runtime (AD-8).
- pnpm is declared via a `"packageManager": "pnpm@x.y.z"` field in `package.json` (the exact version installed locally at scaffold time) so Vercel/corepack enforce it automatically; the explicit Vercel install-command override (`pnpm install`) is belt-and-braces on top of that, not the primary mechanism.
- Pin the Node.js version: `engines.node` in `package.json` plus a matching `.nvmrc`, and set the same version explicitly in Vercel's project settings (verify Vercel's current Node-runtime default at implementation time) — prevents a works-locally/breaks-on-deploy Node mismatch.
- `astro.config.mjs` sets `output: 'server'` explicitly — Astro 5+ defaults to `'static'`, which the Vercel adapter alone doesn't change, and this app's API routes are inherently dynamic. `src/pages/[trip]/index.astro` carries `export const prerender = true` (keeps the shell static per AD-1 despite the server-mode default); every `src/pages/api/**` route and `src/pages/[trip]/admin.astro` carry `export const prerender = false` (explicit and redundant under `output: 'server'`, but stated on each file so it survives a future output-mode change).
- `src/content.config.ts` (Content Layer API — Astro 5+; **not** the pre-Astro-5 `src/content/config.ts` + `type: 'content'` pattern, which no-ops silently under Astro 7) defines a `glob()` loader over `src/content/trips/` (pattern scoped to `**/*.json` so it can't match `.gitkeep`) with a Zod schema encoding AD-7's TripContent shape exactly: `{slug, startDate, accentColor, chapters: [{id, order, kind: 'cinematic'|'knap', title, time, location, description, svgVariant}], packingList: [{id, label}]}`; `time`/`location` nullable; never includes `unlocked` or checked-state, not even as a default. Entries are one JSON file per trip, named `<slug>.json` by convention, but `slug` in the schema is the only source of truth for identity: the loader's `generateId` derives the collection entry id from `data.slug`, not the filename (verify the exact Content Layer API for this at implementation time) — filename and schema field can never silently disagree.
- `chapters[].id` and `packingList[].id` double as the Neon foreign keys stories 5 and 9 key rows on. The schema must `.refine()`-enforce uniqueness within each array, and carry a one-line comment: these ids are a stable public contract, never renamed (renaming orphans existing unlock/checked state).
- API endpoints live under `src/pages/api/**` — Astro only routes server endpoints (`.ts`/`.js` exporting HTTP-method handlers) from `src/pages/`; a sibling `src/api/` tree is never served.
- `src/lib/db.ts` exports a memoized `getSql()` (or equivalent) — no top-level `neon(process.env.DATABASE_URL!)` client construction at module scope. The DB client is only ever built lazily, on first call, inside a function. This is what makes "dev server boots with `DATABASE_URL` unset" actually true rather than accidentally true.
- Follow the Structural Seed's directory layout exactly (ARCHITECTURE-SPINE.md "Structural Seed"). Files later stories own are created as empty stubs/placeholders only — no logic. **Exception:** `public/sw.js` is not created in this story at all (see Never).
- Document exactly one migration convention in `migrations/README.md` (no runner implementation in this story — see Never): plain numbered SQL files (`0001_*.sql`, ...), applied via a future `Pool`/`pg`-based script — never the HTTP `neon()` driver, which can't run transactional DDL — with each file's DDL and its `_migrations` ledger insert committed in one transaction, and the runner itself bootstrapping `_migrations` (no migration file owns that). Document the prod-apply path too: a manual `DATABASE_URL=<prod-connection-string> pnpm migrate` step: Vercel's build does not run migrations automatically, and no other path exists.
- `astro check` is wired as a `typecheck` script (via `@astrojs/check` + `typescript` devDependencies) — this story's entire point is a typed data contract, so a way to actually check the types must exist from day one.
- `.gitignore` includes `.astro/` (generated by `astro sync`/`astro check`) alongside node_modules, .env, .vercel, dist.
- `.env.example` lists every env var the whole project will eventually need, each with a comment on purpose + consuming story + how to generate it: `ADMIN_PASSCODE` (story 4, e.g. `openssl rand -base64 32`), `COOKIE_SIGNING_SECRET` (story 4, `openssl rand -base64 32`), `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` (story 8, `pnpm dlx web-push generate-vapid-keys`), `DATABASE_URL` (this story, from Neon).
- Initialize a git repository at the project root with an initial commit.
- Produce `SETUP.md`: a numbered manual guide covering account/project creation on Vercel, importing this repo, adding Neon via the Vercel Marketplace integration (dev+prod branches per AD-9), generating and copying secrets (per `.env.example`'s commands) + connection strings into Vercel's env var settings and a local `.env`, and pinning Vercel's Node version to match `.nvmrc`.

**Ask First:** Any deviation from the Structural Seed's directory layout. Introducing a migration-tool dependency instead of hand-rolled SQL scripts.

**Never:** Do not attempt to log into or create actual Vercel/Neon accounts or cloud resources — documented as a manual step in `SETUP.md`, not automated here. Do not implement any API route logic, auth, push, or animation — later stories own those; this story only creates stub files and structure. Do not seed `unlocked`/packing-checked defaults anywhere in the content schema. Do not add `@vite-pwa/astro` or any PWA build plugin (caps at Astro ^5.0.0; manifest/SW are hand-written in story 7). Do not create `public/sw.js` in this story — a stale/misbehaving service worker is the hardest class of bug to recover from in PWA land, and locking in one file's location isn't worth that risk; story 7 creates it from scratch. Do not construct the Neon HTTP client at module scope in `src/lib/db.ts`. Do not build `scripts/migrate.mjs` in this story — the convention is documented, the runner implementation is deferred (`deferred-work.md`) and must land before whichever later story first needs a real table.

</frozen-after-approval>

## Code Map

Greenfield project — no existing code. Paths below are new, matching ARCHITECTURE-SPINE.md's Structural Seed.

- `package.json` -- Astro `^7.x.x` + `@astrojs/vercel` + `@neondatabase/serverless` + `@astrojs/check`/`typescript` (dev); `"packageManager": "pnpm@x.y.z"`; `engines.node`; scripts: dev, build, preview, typecheck (no `migrate` yet — deferred).
- `.nvmrc` -- pins the same Node version as `engines.node`.
- `pnpm-lock.yaml` -- committed lockfile.
- `astro.config.mjs` -- Vercel adapter, Node.js runtime, `output: 'server'`.
- `tsconfig.json` -- Astro's default strict config.
- `.gitignore` -- node_modules, .env, .vercel, dist, `.astro/`.
- `.env.example` -- all 4 project secrets, documented with purpose + generation command (see Always above).
- `src/content.config.ts` -- Content Layer API: `glob()` loader (`**/*.json`) over `src/content/trips/`, `generateId` from `data.slug` + TripContent Zod schema (AD-7), with `.refine()` uniqueness on `chapters[].id`/`packingList[].id`.
- `src/content/trips/.gitkeep` -- story 2 adds the real `<slug>.json` Ameland entry here.
- `src/pages/[trip]/index.astro` -- stub with `export const prerender = true`; stories 3 implements.
- `src/pages/[trip]/admin.astro` -- stub with `export const prerender = false`; stories 4-5 implement.
- `src/pages/api/trip/[slug].ts`, `src/pages/api/admin/toggle.ts`, `src/pages/api/push/subscribe.ts` -- stubs, each with `export const prerender = false`; stories 3, 5, 8 implement. (No `src/pages/api/packing/check.ts` stub: AD-6 was reversed to per-device `localStorage` tracking during story 9's planning, 2026-08-30 — packing state never becomes a server route, so story 9 implements no API route at all. An earlier scaffolding pass had created this stub before the reversal; it has since been deleted.)
- `src/islands/.gitkeep` -- placeholder.
- `src/lib/db.ts` -- Neon HTTP client (`neon()`) behind a memoized `getSql()`, reading `DATABASE_URL` lazily on first call, not at module scope.
- `src/lib/push.ts` -- stub; story 8 implements.
- `public/manifest.json` -- minimal valid manifest (name, icons, start_url, display); not yet linked from any page — story 7 wires it up for real.
- `migrations/README.md` -- documents the convention (numbered SQL files, transactional apply, `_migrations` ledger) and the manual prod-migration step. No `scripts/migrate.mjs` yet — deferred, see `deferred-work.md`.
- `SETUP.md` -- manual Vercel/Neon provisioning guide.
- `AGENTS.md` -- edit the existing "Running and verifying" TODO line inside the `bmad:context` block with real dev/build/typecheck commands (a future `bmad-project-context` refresh may reconcile this further).

## Tasks & Acceptance

**Execution:**
- [x] `package.json`, `astro.config.mjs`, `.nvmrc` -- Scaffold Astro `^7.x.x` with the Vercel Node.js-runtime adapter and `output: 'server'` using pnpm; set `packageManager`, `engines.node` -- establishes the toolchain every later story builds on, reproducibly, and avoids the static/dynamic build-error mismatch a default `output: 'static'` would cause.
- [x] `.gitignore` + `git init` + initial commit -- Initialize version control -- no VCS currently exists; needed for Vercel's GitHub-based deploy flow.
- [x] `src/content.config.ts` -- Define the TripContent Zod schema exactly per AD-7 via the Content Layer API (`glob()` loader, `**/*.json` pattern, over `src/content/trips/`, `generateId` from `data.slug`), with `.refine()` uniqueness on `chapters[].id`/`packingList[].id` -- the data contract stories 2, 3, and 10 build against; the pre-Astro-5 `src/content/config.ts` path silently no-ops under Astro 7, and deriving id from `slug` prevents filename/field disagreement.
- [x] `src/lib/db.ts` -- Neon HTTP client behind a memoized `getSql()`, lazily reading `DATABASE_URL` on first call (never at module scope) -- the single DB entry point stories 3, 5, 8, 9 reuse; makes the "boots with no `DATABASE_URL`" AC actually hold.
- [x] `migrations/README.md` -- Document the migration convention: numbered SQL files, applied via a future `Pool`/`pg`-based runner (never the HTTP driver, which can't run transactional DDL), each file + its `_migrations` ledger insert in one transaction, plus the manual `DATABASE_URL=<prod> pnpm migrate` prod-apply step -- stories 3, 5, 8, 9 each add a table/column and need one shared convention to follow; the runner implementation itself is deferred (`deferred-work.md`).
- [x] `.env.example` -- List every env var with purpose, consuming story, and the exact command to generate it -- prevents later stories from inventing their own var names or generation method.
- [x] `typecheck` script wired to `astro check` (+ `@astrojs/check`/`typescript` devDeps) -- Verifies the typed data contract this story exists to establish actually typechecks.
- [x] Stub files for `src/pages/[trip]/*.astro`, `src/pages/api/**/*.ts`, `src/lib/push.ts`, `public/manifest.json` (minimal valid, unlinked) -- Files matching the Structural Seed, with endpoints under `src/pages/api/` (Astro only routes server endpoints from `src/pages/`), `prerender = true` on `index.astro` and `prerender = false` on `admin.astro` + every API route -- gives every later story a fixed, pre-agreed, actually-routable, build-clean location instead of deciding layout ad hoc. `public/sw.js` is explicitly excluded (see Never).
- [x] `SETUP.md` -- Numbered manual guide: create the Vercel project, import the repo, add Neon via Vercel Marketplace (dev+prod branches), pin Vercel's Node version to `.nvmrc`, generate + populate real secret values -- cloud account/project creation needs interactive login and can't be automated.

**Acceptance Criteria:**
- Given a fresh clone with `DATABASE_URL` unset, when `pnpm dev` runs, then the dev server starts without throwing, because `src/lib/db.ts` never touches `process.env.DATABASE_URL` at module scope — only inside `getSql()`, called lazily on first use.
- Given `migrations/README.md`, when a developer needs a new table for a later story, then they can follow the documented convention (including how it reaches prod) without inventing or asking about one.
- Given the stub `src/pages/api/**` routes and `[trip]/admin.astro` are dynamic (no `getStaticPaths()`), when `pnpm build` runs, then it completes with zero errors — because each carries `export const prerender = false` and `[trip]/index.astro` carries `export const prerender = true`, not because of `output: 'server'` alone.
- Given a `<slug>.json` content entry, when it's loaded via `getCollection`, then the entry's id equals its `slug` field (derived via `generateId`), never the filename independently of that field.
- Given `SETUP.md`, when the human follows it end-to-end, then they have a Vercel project deployed from this repo, a Neon dev+prod branch pair, and all four secrets set in both Vercel's dashboard and a local `.env`.

## Design Notes

Stub files exist only to lock in the Structural Seed's layout before later stories start — each stub should be inert enough that no later story mistakes it for a finished contract (e.g. an API stub returns a `501`/TODO, never a fake success response).

Migration convention default: plain numbered SQL files (`migrations/0001_init.sql`, `0002_...sql`, created by whichever story first needs one), documented now, implemented later — see `deferred-work.md`. No external migration framework, consistent with the project's otherwise-minimal-dependency stance.

`src/lib/db.ts`'s `neon()` HTTP client is the right (and simpler) choice for the single-statement request-time reads/writes stories 3, 5, 8, 9 do; it's unsuitable for transactional DDL, which is exactly why the (deferred) migration runner uses `Pool`/`pg` instead.

pnpm's `packageManager` field is the mechanism Vercel actually honors for enforcing the package manager (via corepack); the explicit install-command override in `SETUP.md` is a second layer on top, not a substitute.

`output: 'server'` plus per-file `prerender` flags (rather than leaving Astro's default `'static'` output in place) is what actually makes `pnpm build` succeed: a static-output build requires `getStaticPaths()` on any dynamic route, which none of this story's stubs have. Deriving the content collection's id from the `slug` field (not the filename) via `generateId` means there is exactly one source of truth for a trip's identity — the filename convention (`<slug>.json`) is for humans only, never load-bearing.

## Verification

**Commands:**
- `pnpm install` -- expected: installs cleanly using pnpm's lockfile, no npm/yarn lockfile present.
- `pnpm typecheck` (`astro check`) -- expected: zero type errors against the TripContent schema and stub files.
- `pnpm dev` -- expected: dev server starts cleanly, even with `DATABASE_URL` unset.
- `pnpm build` -- expected: production build completes with zero errors via the Vercel adapter.

**Manual checks (if no CLI):**
- With `pnpm dev` running, hit each of the four `src/pages/api/**` stub endpoints (e.g. `curl localhost:4321/api/trip/test`) and confirm a real HTTP response (not a 404) -- proves the routing fix actually took, not just that the files exist.
- `.env.example` lists all four secrets, each with a comment and a generation command.
- `SETUP.md` is a complete, followable, numbered guide with no gaps, including pinning Vercel's Node version.
- `git log` shows an initial commit; working tree is otherwise clean.

## Spec Change Log

## Suggested Review Order

**Data contract (AD-7)**

- Entry point: the TripContent schema every later story builds against, with the id-derivation and three uniqueness refines added by review.
  [`content.config.ts:43`](../../../../src/content.config.ts#L43)

- Loader ties collection identity to the `slug` field, not the filename — the fix for a routing/data-integrity blocker found during spec review.
  [`content.config.ts:73`](../../../../src/content.config.ts#L73)

**Build/output mode (AD-1)**

- `output: 'server'` is the mechanism that makes the dynamic API stubs buildable at all under Astro 5+'s static default.
  [`astro.config.mjs:7`](../../../../astro.config.mjs#L7)

- Static shell opts back into prerendering with `getStaticPaths()`, the other half of the build-fixing pair.
  [`[trip]/index.astro:7`](../../../../src/pages/[trip]/index.astro#L7)

- Dynamic admin route stays server-rendered by explicit, redundant declaration — defensive against a future output-mode change.
  [`[trip]/admin.astro:4`](../../../../src/pages/[trip]/admin.astro#L4)

**DB client**

- Memoized, lazily-initialized client — the reason `pnpm dev` boots with `DATABASE_URL` unset; whitespace-only guard added by review.
  [`db.ts:11`](../../../../src/lib/db.ts#L11)

**Migration convention (documented, not implemented)**

- Convention is written down now so stories 3/5/8/9 don't each invent one; the runner itself is deferred work.
  [`migrations/README.md:1`](../../../../migrations/README.md#L1)

**Stub routes**

- Representative API stub: `prerender = false`, `501` in the project's `{ok, error}` envelope — same shape across all four.
  [`api/trip/[slug].ts:5`](../../../../src/pages/api/trip/[slug].ts#L5)

**Peripherals**

- Toolchain pin: pnpm via `packageManager`, exact Node via `engines`, caret-ranged Astro relying on the lockfile for reproducibility.
  [`package.json:1`](../../../../package.json#L1)

- Manual cloud-provisioning guide — the human-only steps this story deliberately can't automate.
  [`SETUP.md:1`](../../../../SETUP.md#L1)

- Every future env var documented with purpose and generation command up front.
  [`.env.example:1`](../../../../.env.example#L1)
