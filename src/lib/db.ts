import { neon } from '@neondatabase/serverless';

// Memoized Neon HTTP client. DATABASE_URL is read lazily on first call, never
// at module scope, so a fresh clone with DATABASE_URL unset can still boot
// `pnpm dev` — nothing touches process.env until a route actually calls
// getSql(). Unsuitable for transactional DDL (see migrations/README.md); it's
// the right, simpler choice for the single-statement request-time reads and
// writes stories 3, 5, 8, and 9 do.
let sql: ReturnType<typeof neon> | undefined;

export function getSql() {
  if (!sql) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl?.trim()) {
      throw new Error('DATABASE_URL is not set. See .env.example.');
    }
    sql = neon(databaseUrl);
  }
  return sql;
}
