-- 0002_admin_login_attempts: per-IP passcode attempt counter (AD-5 rate
-- limit). src/lib/admin-auth.ts's checkRateLimit reads/writes this table via
-- one atomic upsert (INSERT ... ON CONFLICT ... RETURNING) — never a
-- separate SELECT then write, so two concurrent requests from the same IP
-- can never both slip past the 5-attempts/15-minute cap.
CREATE TABLE admin_login_attempts (
  ip text NOT NULL PRIMARY KEY,
  attempts integer NOT NULL,
  window_start timestamptz NOT NULL
);
