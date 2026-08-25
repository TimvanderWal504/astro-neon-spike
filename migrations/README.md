# Migrations

## Convention

Plain numbered SQL files, no external migration framework:

```
migrations/
  0001_init.sql
  0002_add_something.sql
  ...
```

- Each file is applied **in numeric order**, exactly once.
- Each file's DDL **and** its corresponding insert into the `_migrations`
  ledger table are committed in **one transaction**. If the DDL fails, the
  ledger insert never happens and the migration is retried next run; if the
  ledger insert fails, the DDL is rolled back too — the two can never
  disagree about what's actually applied.
- The runner bootstraps the `_migrations` ledger table itself (e.g.
  `CREATE TABLE IF NOT EXISTS _migrations (id text primary key, applied_at
  timestamptz not null default now())`, or equivalent) the first time it
  runs. **No migration file owns that** — `0001_init.sql` is free to assume
  the ledger already exists.
- The runner uses a `Pool`/`pg`-based connection (the plain `pg` package),
  **never** the `@neondatabase/serverless` HTTP driver (`neon()`) that
  `src/lib/db.ts` uses for request-time reads/writes. The HTTP driver only
  supports single, non-transactional statements — it cannot run the
  transactional DDL this convention depends on.

## Applying migrations

**Local (dev branch):** run the (future) migration script against the dev
`DATABASE_URL` from your local `.env`:

```
pnpm migrate
```

**Production:** Vercel's build does **not** run migrations automatically —
there is no other automated path. Apply manually, pointed at the prod Neon
branch's connection string, before or alongside a deploy that depends on the
new schema:

```
DATABASE_URL=<prod-connection-string> pnpm migrate
```

## Status

The runner script (`scripts/migrate.mjs`) is **not implemented yet** — this
story only documents the convention. See
`_bmad-output/implementation-artifacts/deferred-work.md` for the deferred
implementation entry. It must land before whichever story first needs a real
table (stories 3, 5, 8, or 9 — whichever lands first).

## Adding a new migration

1. Create the next-numbered file, e.g. `migrations/0002_add_subscriptions.sql`.
2. Write plain DDL — no ORM, no framework-specific syntax.
3. Run `pnpm migrate` locally against the dev branch to verify it applies
   cleanly before committing.
4. When the corresponding story ships, apply the same file to prod manually
   per the command above.
