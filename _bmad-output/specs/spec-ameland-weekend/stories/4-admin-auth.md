---
title: 'Admin auth'
type: 'feature'
created: '2026-08-26'
status: 'done'
review_loop_iteration: 1
baseline_commit: '032bc0f187668f72a462b69231c17de111436ae9'
context:
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-MoapMoap-2026-08-24/ARCHITECTURE-SPINE.md'
  - '{project-root}/migrations/README.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `/[trip]/admin.astro` is a TODO-stub shell from story 1 with no passcode gate; `ADMIN_PASSCODE` and `COOKIE_SIGNING_SECRET` are documented in `.env.example` but nothing reads them, so anyone who finds the admin URL sees an empty page and story 5/8's unlock/push writes have no gate protecting them.

**Approach:** A `POST /api/admin/login` route that checks a Neon-backed per-IP attempt counter (429 beyond 5/15min) before comparing the submitted passcode to `ADMIN_PASSCODE`, and on success sets an httpOnly, HMAC-signed, 90-day-`Max-Age` session cookie via `crypto` (no new dependency). `admin.astro` verifies that cookie server-side and renders either the passcode form or a minimal authenticated placeholder — story 5 fills the real chapter-toggle UI into that placeholder.

## Boundaries & Constraints

**Always:** Passcode check uses `crypto.timingSafeEqual` against `process.env.ADMIN_PASSCODE`, read lazily inside the handler (never module scope or client bundle). The rate-limit check-and-increment is one atomic upsert with `RETURNING` — never a separate `SELECT` then write — and runs before the passcode is compared. Client IP is the *last* `x-forwarded-for` entry (the value Vercel's own edge appends and vouches for; earlier entries can be client-supplied and spoofed), never the first; if the header is absent, bucket under a fixed `unknown` key. A malformed/unparsable body returns `400`, not counted toward the limit. Either env var unset at request time returns `500`, never a silent pass-through. Session cookie: `httpOnly`, `sameSite: 'lax'`, `Max-Age` 90 days, `secure` only when `process.env.NODE_ENV === 'production'` (browsers drop `secure` cookies over the plain-HTTP `pnpm dev` server), value signed `HMAC-SHA256`/`COOKIE_SIGNING_SECRET` and verified with `timingSafeEqual`. `verifySession` fails closed (`false`, never throws) on any malformed shape. Routes/pages keep `export const prerender = false` (already set on the stub). Migration follows `migrations/README.md`: numbered file, `pg` Pool, DDL+ledger in one transaction.

**Ask First:** If `ADMIN_PASSCODE` or `COOKIE_SIGNING_SECRET` is unset when the login route runs, HALT and ask rather than silently disabling the gate or using a hardcoded fallback secret.

**Never:** Build the chapter-row/unlock-toggle UI (story 5's `admin/toggle.ts` is a separate, already-stubbed route — do not touch it). Touch push-subscription or packing-list logic. Invent new visual language for the passcode form — reuse `index.astro`'s existing tokens (fonts, `#0a0d0c`/`#f4f1ea` palette, `.chapter-slot`-style card). Log or persist the raw passcode anywhere.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Correct passcode | `POST .../login {passcode:"<real>"}` | `200` + signed `Set-Cookie: admin_session` | N/A |
| Wrong passcode | `POST .../login {passcode:"wrong"}` | `401 {ok:false,error}` | counts toward limit |
| 6th attempt in window | 5 prior attempts, same IP, <15min | `429 {ok:false,error}` | passcode not compared |
| Window expired | last attempt >15min ago | counter resets to 1, proceeds | N/A |
| Valid session cookie | `GET /[trip]/admin` | authenticated placeholder, no form | N/A |
| Missing/tampered/malformed cookie | `GET /[trip]/admin` | passcode form renders | N/A |
| Malformed body | missing `passcode` / bad JSON | `400 {ok:false,error}` | not counted |
| Missing server config | either env var unset | `500 {ok:false,error}` | fails closed |

</frozen-after-approval>

## Code Map

- `migrations/0002_admin_login_attempts.sql` (NEW) -- `admin_login_attempts(ip text primary key, attempts integer not null, window_start timestamptz not null)`, styled after `0001_init.sql`.
- `src/lib/admin-auth.ts` (NEW) -- `getClientIp`, `checkRateLimit` (atomic upsert via `getSql()` from `src/lib/db.ts`), `verifyPasscode`/`signSession`/`verifySession` (timing-safe HMAC, fails closed).
- `src/pages/api/admin/login.ts` (NEW) -- `POST`, `prerender = false`; shape matches `src/pages/api/trip/[slug].ts` (`jsonOk`/`jsonError` from `src/lib/http.ts`, try/catch + `console.error`).
- `src/pages/[trip]/admin.astro` -- replace the story-1 TODO stub; verify cookie via `Astro.cookies`; render form or static placeholder (no trip-data fetch in this story).
- `src/lib/http.ts:6-21` -- reuse `jsonOk`/`jsonError` as-is.
- `.env.example` -- already documents both vars for story 4; no change needed.

## Tasks & Acceptance

**Execution:**
- [x] `migrations/0002_admin_login_attempts.sql` -- create the rate-limit table -- first table this story needs.
- [x] `src/lib/admin-auth.ts` -- IP extraction, atomic rate limiter, timing-safe passcode check, signed cookie sign/verify -- isolates logic the route and page both need.
- [x] `src/pages/api/admin/login.ts` -- wire the above per Boundaries (malformed-body/config checks, atomic rate-limit gate, passcode check, set cookie on success).
- [x] `src/pages/[trip]/admin.astro` -- verify cookie server-side; render on-brand passcode form (posts to the login route, reloads on `200`, inline error on `401`/`429`) or the authenticated placeholder.

**Acceptance Criteria:**
- Given a valid session cookie is sent back on a later `GET /[trip]/admin`, when the page renders, then the passcode form is skipped.
- Given the cookie value is edited by one character, when `GET /[trip]/admin` runs, then `verifySession` rejects it and the form renders.
- Given two requests from the same IP race in with 4 attempts already recorded, when both are processed, then the atomic increment ensures at most one reaches a 6th attempt before either sees 429 -- no race past the cap.

## Spec Change Log

- **Finding:** code review (blind-hunter, iteration 1) flagged that "Client IP is the first `x-forwarded-for` entry" is backwards — that entry is client-supplied/spoofable, letting an attacker rotate it per request and bypass the rate limiter entirely.
- **Amended:** the `Always` rule now specifies trusting the *last* `x-forwarded-for` entry (the one Vercel's edge appends), never the first.
- **Known-bad state avoided:** an attacker defeating AD-5's brute-force protection by spoofing the leading `x-forwarded-for` entry on each request.
- **KEEP:** everything else in the frozen intent (atomic rate-limit upsert, timing-safe comparisons, fail-closed cookie/session verification, 400/500/429 ordering) is unchanged and must survive re-derivation as-is.

## Design Notes

Signed cookie avoids server-side session storage: `value = `${expiresAt}.${hmacHex}`` where `hmacHex = hmac(COOKIE_SIGNING_SECRET, String(expiresAt))`. `verifySession` recomputes the HMAC (`timingSafeEqual`) and checks `expiresAt > Date.now()`; any malformed split returns `false` instead of throwing.

Atomic upsert avoids the check-then-write race (fixed 15-minute window, matches AD-5's "attempt counter" language, stays O(1)):
```sql
INSERT INTO admin_login_attempts (ip, attempts, window_start) VALUES ($1, 1, now())
ON CONFLICT (ip) DO UPDATE SET
  attempts = CASE WHEN admin_login_attempts.window_start < now() - interval '15 minutes'
                   THEN 1 ELSE admin_login_attempts.attempts + 1 END,
  window_start = CASE WHEN admin_login_attempts.window_start < now() - interval '15 minutes'
                       THEN now() ELSE admin_login_attempts.window_start END
RETURNING attempts;
```
`attempts > 5` on the returned row means 429, before the passcode is ever compared.

## Verification

**Commands:**
- `pnpm typecheck` -- expected: passes.
- `pnpm build` -- expected: succeeds.
- `pnpm migrate` (dev `DATABASE_URL`) -- expected: applies `0002_admin_login_attempts.sql`.

**Manual checks (if no CLI):**
- `curl -X POST /api/admin/login -d '{"passcode":"wrong"}' -H 'content-type: application/json'` x6 from the same origin -- 6th call returns 429.
- `curl -i -X POST /api/admin/login -d '{"passcode":"<real ADMIN_PASSCODE>"}' -H 'content-type: application/json'` -- response has `Set-Cookie: admin_session=...`.
- Reload `/[trip]/admin` with that cookie in the browser -- passcode form no longer shown.

## Suggested Review Order

**Rate limiting (core security logic, AD-5)**

- Trusts only the last `x-forwarded-for` entry -- the earlier entries are client-spoofable, fixed after review caught the reversed rule.
  [`admin-auth.ts:21`](../../../../src/lib/admin-auth.ts#L21)

- Atomic check-and-increment upsert -- a single `RETURNING` statement so two concurrent requests can never both slip past the cap.
  [`admin-auth.ts:45`](../../../../src/lib/admin-auth.ts#L45)

- Counter reset on a successful login -- so a legit re-auth doesn't eat into the same budget as failed attempts.
  [`admin-auth.ts:67`](../../../../src/lib/admin-auth.ts#L67)

- Rate-limit gate runs before the passcode is ever compared.
  [`login.ts:58`](../../../../src/pages/api/admin/login.ts#L58)

**Passcode & session verification**

- Timing-safe passcode comparison, including the mismatched-length branch.
  [`admin-auth.ts:80`](../../../../src/lib/admin-auth.ts#L80)

- Signed session cookie: `expiresAt` + HMAC, no server-side session storage.
  [`admin-auth.ts:97`](../../../../src/lib/admin-auth.ts#L97)

- `verifySession` fails closed -- never throws -- on any malformed cookie shape.
  [`admin-auth.ts:108`](../../../../src/lib/admin-auth.ts#L108)

- Missing-config fail-closed: unset `ADMIN_PASSCODE`/`COOKIE_SIGNING_SECRET` is a hard 500, never a silent pass-through.
  [`login.ts:25`](../../../../src/pages/api/admin/login.ts#L25)

- Cookie set only after a verified passcode; `secure` is environment-conditional so local dev still works.
  [`login.ts:82`](../../../../src/pages/api/admin/login.ts#L82)

**Admin page gate**

- Cookie verified server-side; an unset secret can never verify, so the page fails closed to the form.
  [`admin.astro:18`](../../../../src/pages/[trip]/admin.astro#L18)

- `private, no-store` response header -- defense-in-depth against a cookie-personalized page ever being cached.
  [`admin.astro:25`](../../../../src/pages/[trip]/admin.astro#L25)

- `noindex` on an admin/login surface.
  [`admin.astro:32`](../../../../src/pages/[trip]/admin.astro#L32)

- Error text carries `role="alert"` so screen readers announce a failed attempt.
  [`admin.astro:161`](../../../../src/pages/[trip]/admin.astro#L161)

**Migration**

- New per-IP attempt-counter table, styled after `0001_init.sql`'s convention.
  [`0002_admin_login_attempts.sql:6`](../../../../migrations/0002_admin_login_attempts.sql#L6)
