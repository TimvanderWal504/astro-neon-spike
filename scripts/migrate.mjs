#!/usr/bin/env node
// Migration runner, per migrations/README.md's documented convention:
// plain numbered SQL files under migrations/, applied in numeric order,
// exactly once. Each file's DDL and its `_migrations` ledger insert are
// committed in one transaction. Uses the plain `pg` package (a Pool) —
// never `@neondatabase/serverless`'s `neon()` HTTP driver, which only
// supports single, non-transactional statements.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Pool } = pg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const migrationsDir = path.join(projectRoot, 'migrations');

// Minimal .env loader for this standalone script (astro/vite's automatic
// .env loading doesn't apply here — this runs via plain `node`, not astro).
// A DATABASE_URL already present in the real shell env always wins, which
// keeps the documented production usage intact:
//   DATABASE_URL=<prod-connection-string> pnpm migrate
function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, 'utf8');
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    if (!key || key in process.env) continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

if (!process.env.DATABASE_URL) {
  // Vite/Astro-style priority order (later files win), local-dev only.
  for (const file of ['.env', '.env.local', '.env.development', '.env.development.local']) {
    loadEnvFile(path.join(projectRoot, file));
  }
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString?.trim()) {
  console.error(
    'DATABASE_URL is not set. Set it in .env.development (local) or pass it inline ' +
      '(DATABASE_URL=<connection-string> pnpm migrate). See .env.example / SETUP.md.',
  );
  process.exit(1);
}

// Neon requires SSL; a plain local Postgres typically doesn't have it configured.
const needsSsl = /sslmode=require|neon\.tech/i.test(connectionString);

function listMigrationFiles() {
  if (!existsSync(migrationsDir)) return [];
  return readdirSync(migrationsDir)
    .filter((name) => /^\d+.*\.sql$/.test(name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

async function main() {
  const pool = new Pool({
    connectionString,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
  });

  let client;
  try {
    // Connecting is inside the try too: if it fails (bad credentials,
    // unreachable DB), the finally below still runs and closes the pool
    // instead of leaking it.
    client = await pool.connect();

    // The runner bootstraps the ledger table itself — no migration file
    // owns it, so 0001_init.sql is free to assume it already exists.
    await client.query(
      `CREATE TABLE IF NOT EXISTS _migrations (
         id text PRIMARY KEY,
         applied_at timestamptz NOT NULL DEFAULT now()
       )`,
    );

    const { rows: appliedRows } = await client.query('SELECT id FROM _migrations');
    const applied = new Set(appliedRows.map((row) => row.id));

    const pending = listMigrationFiles().filter((file) => !applied.has(file));

    if (pending.length === 0) {
      console.log('No pending migrations. Database is up to date.');
      return;
    }

    for (const file of pending) {
      const sql = readFileSync(path.join(migrationsDir, file), 'utf8');
      console.log(`Applying ${file}...`);
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO _migrations (id) VALUES ($1)', [file]);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${file} failed and was rolled back: ${err.message}`, {
          cause: err,
        });
      }
      console.log(`Applied ${file}.`);
    }

    console.log(`Applied ${pending.length} migration(s).`);
  } finally {
    // Only release if connect() actually succeeded — nothing to release
    // otherwise. pool.end() always runs, on any failure path.
    if (client) client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Migration run failed:', err);
  process.exitCode = 1;
});
