import { createHmac, timingSafeEqual } from 'node:crypto';
import { getSql } from './db';

// Admin auth primitives (AD-5): IP extraction for the rate limiter, the
// atomic per-IP attempt counter, timing-safe passcode comparison, and the
// signed session cookie sign/verify pair. Shared by the login route and the
// admin page (both need `verifySession`).

export const SESSION_COOKIE_NAME = 'admin_session';
export const SESSION_MAX_AGE_SECONDS = 90 * 24 * 60 * 60; // 90 days
const RATE_LIMIT_MAX_ATTEMPTS = 5;

/**
 * Client IP for the rate limiter. Trusts only the LAST entry in
 * `x-forwarded-for` — the value Vercel's own edge appends and vouches for.
 * Earlier entries in the header are client-supplied and can be spoofed,
 * letting an attacker rotate a fake leading IP per request to bypass the
 * limiter entirely (see this story's Spec Change Log). Falls back to a
 * fixed 'unknown' bucket when the header is absent, per spec.
 */
export function getClientIp(request: Request): string {
  const header = request.headers.get('x-forwarded-for');
  if (!header) return 'unknown';

  const entries = header
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  if (entries.length === 0) return 'unknown';
  return entries[entries.length - 1];
}

export type RateLimitResult = {
  allowed: boolean;
  attempts: number;
};

/**
 * Atomic check-and-increment (Design Notes): one upsert with `RETURNING` —
 * never a separate `SELECT` then write, so concurrent requests from the
 * same IP can never both slip past the cap. A fixed 15-minute window resets
 * the counter to 1 once expired.
 */
export async function checkRateLimit(ip: string): Promise<RateLimitResult> {
  const sql = getSql();
  const rows = (await sql`
    INSERT INTO admin_login_attempts (ip, attempts, window_start) VALUES (${ip}, 1, now())
    ON CONFLICT (ip) DO UPDATE SET
      attempts = CASE WHEN admin_login_attempts.window_start < now() - interval '15 minutes'
                       THEN 1 ELSE admin_login_attempts.attempts + 1 END,
      window_start = CASE WHEN admin_login_attempts.window_start < now() - interval '15 minutes'
                           THEN now() ELSE admin_login_attempts.window_start END
    RETURNING attempts
  `) as { attempts: number }[];

  const attempts = rows[0]?.attempts ?? RATE_LIMIT_MAX_ATTEMPTS + 1;
  return { allowed: attempts <= RATE_LIMIT_MAX_ATTEMPTS, attempts };
}

/**
 * Clears an IP's rate-limit row on successful login, so a legitimate re-auth
 * (new device, cleared cookies) doesn't keep eating into the same 15-minute
 * budget as an attacker's failed attempts. Called only after a passcode
 * verifies — never before, so a failed attempt still counts as normal.
 */
export async function resetRateLimit(ip: string): Promise<void> {
  const sql = getSql();
  await sql`DELETE FROM admin_login_attempts WHERE ip = ${ip}`;
}

/**
 * Timing-safe passcode comparison against `process.env.ADMIN_PASSCODE`
 * (read by the caller, never at module scope). `timingSafeEqual` throws on
 * length mismatch, so a differing length is handled explicitly rather than
 * short-circuiting on `.length` alone (which would itself leak length via
 * timing) — a dummy equal-length comparison keeps the two branches'
 * work comparable before returning false.
 */
export function verifyPasscode(submitted: string, expected: string): boolean {
  const submittedBuf = Buffer.from(submitted, 'utf8');
  const expectedBuf = Buffer.from(expected, 'utf8');

  if (submittedBuf.length !== expectedBuf.length) {
    timingSafeEqual(expectedBuf, expectedBuf);
    return false;
  }

  return timingSafeEqual(submittedBuf, expectedBuf);
}

/**
 * Signs a session cookie value: `${expiresAt}.${hmacHex}`, where `hmacHex`
 * is `HMAC-SHA256(COOKIE_SIGNING_SECRET, String(expiresAt))`. No
 * server-side session storage — the cookie is self-verifying.
 */
export function signSession(secret: string, maxAgeSeconds: number = SESSION_MAX_AGE_SECONDS): string {
  const expiresAt = Date.now() + maxAgeSeconds * 1000;
  const hmacHex = createHmac('sha256', secret).update(String(expiresAt)).digest('hex');
  return `${expiresAt}.${hmacHex}`;
}

/**
 * Verifies a session cookie value. Fails closed (`false`, never throws) on
 * any malformed shape: wrong split count, non-numeric `expiresAt`,
 * non-hex/mismatched-length signature, or an expired `expiresAt`.
 */
export function verifySession(cookieValue: string | undefined | null, secret: string): boolean {
  try {
    if (!cookieValue) return false;

    const parts = cookieValue.split('.');
    if (parts.length !== 2) return false;

    const [expiresAtStr, hmacHex] = parts;
    if (!expiresAtStr || !hmacHex) return false;

    const expiresAt = Number(expiresAtStr);
    if (!Number.isFinite(expiresAt)) return false;

    const expectedHmacHex = createHmac('sha256', secret).update(expiresAtStr).digest('hex');
    const expectedBuf = Buffer.from(expectedHmacHex, 'hex');
    const actualBuf = Buffer.from(hmacHex, 'hex');

    if (expectedBuf.length !== actualBuf.length) return false;
    if (!timingSafeEqual(expectedBuf, actualBuf)) return false;

    return expiresAt > Date.now();
  } catch {
    return false;
  }
}
