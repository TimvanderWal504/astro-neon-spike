import type { APIRoute } from 'astro';
import {
  checkRateLimit,
  getClientIp,
  resetRateLimit,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  signSession,
  verifyPasscode,
} from '../../../lib/admin-auth';
import { jsonError, jsonOk } from '../../../lib/http';

// POST /api/admin/login — passcode check gated by a Neon-backed per-IP
// rate limiter (AD-5). On success, sets a signed, httpOnly session cookie.
export const prerender = false;

// Generous upper bound on a submitted passcode — well above any real
// passcode length, just enough to reject abusive payloads before they ever
// reach checkRateLimit/verifyPasscode's Buffer.from.
const MAX_PASSCODE_LENGTH = 256;

export const POST: APIRoute = async ({ request, cookies }) => {
  // Config gate first: either var unset at request time is a hard 500,
  // never a silent pass-through. Read lazily here, never at module scope.
  const adminPasscode = process.env.ADMIN_PASSCODE;
  const cookieSigningSecret = process.env.COOKIE_SIGNING_SECRET;
  if (!adminPasscode || !cookieSigningSecret) {
    console.error('admin/login: ADMIN_PASSCODE or COOKIE_SIGNING_SECRET is not set.');
    return jsonError(500, 'Server is niet geconfigureerd voor admin-login.');
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch (err) {
    return jsonError(400, 'Ongeldige aanvraag.');
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    typeof (body as Record<string, unknown>).passcode !== 'string'
  ) {
    return jsonError(400, 'Toegangscode ontbreekt of is ongeldig.');
  }
  const passcode = (body as { passcode: string }).passcode;

  if (passcode.length > MAX_PASSCODE_LENGTH) {
    return jsonError(400, 'Toegangscode is te lang.');
  }

  // Rate limit is checked (and incremented) before the passcode is ever
  // compared — a malformed/oversized body above never reaches here, so it's
  // never counted toward the limit.
  const ip = getClientIp(request);
  let rateLimit;
  try {
    rateLimit = await checkRateLimit(ip);
  } catch (err) {
    console.error('admin/login: checkRateLimit failed:', err);
    return jsonError(500, 'Er ging iets mis. Probeer het opnieuw.');
  }

  if (!rateLimit.allowed) {
    return jsonError(429, 'Te veel pogingen. Probeer het later opnieuw.');
  }

  if (!verifyPasscode(passcode, adminPasscode)) {
    return jsonError(401, 'Onjuiste toegangscode.');
  }

  // Successful login: clear this IP's rate-limit row so a legitimate
  // re-auth doesn't keep sharing the same 15-minute budget as failed
  // attempts. Best-effort — a failure here must not block a real login.
  try {
    await resetRateLimit(ip);
  } catch (err) {
    console.error('admin/login: resetRateLimit failed:', err);
  }

  const sessionValue = signSession(cookieSigningSecret);
  cookies.set(SESSION_COOKIE_NAME, sessionValue, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: '/',
  });

  return jsonOk({ authenticated: true });
};
