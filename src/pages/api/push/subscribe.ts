import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';
import { getSql } from '../../../lib/db';
import { jsonError, jsonOk } from '../../../lib/http';

// POST /api/push/subscribe — public write exception (AD-3): unauthenticated
// by design, scoped narrowly to storing a tripSlug-scoped push subscription
// for story 8's fan-out (AD-4). Writes only `{endpoint, tripSlug, keys}` —
// nothing else.
export const prerender = false;

// `endpoint` is a public write this server later fetches server-side
// (src/lib/push.ts), so scheme-restricting it to `https:` shrinks the SSRF
// surface — a `javascript:`/`file:`/internal-host URL is rejected here
// before it ever reaches the DB.
function isWellFormedHttpsUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0) {
    return false;
  }
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError(400, 'Ongeldige aanvraag.');
    }

    if (typeof body !== 'object' || body === null) {
      return jsonError(400, 'Ongeldige aanvraag.');
    }

    const { tripSlug, endpoint, keys } = body as Record<string, unknown>;

    if (typeof tripSlug !== 'string' || tripSlug.length === 0) {
      return jsonError(400, 'tripSlug ontbreekt of is ongeldig.');
    }

    // Validated against real content, same pattern as admin/toggle.ts — a
    // 400 here, never a DB write for an unknown trip.
    const trips = await getCollection('trips');
    const trip = trips.find((entry) => entry.id === tripSlug);
    if (!trip) {
      return jsonError(400, `Onbekende trip: ${tripSlug}`);
    }

    if (!isWellFormedHttpsUrl(endpoint)) {
      return jsonError(400, 'endpoint ontbreekt of is geen geldige https-URL.');
    }

    if (typeof keys !== 'object' || keys === null) {
      return jsonError(400, 'keys ontbreekt of is ongeldig.');
    }
    const { p256dh, auth } = keys as Record<string, unknown>;
    if (!isNonEmptyString(p256dh) || !isNonEmptyString(auth)) {
      return jsonError(400, 'keys.p256dh of keys.auth ontbreekt of is ongeldig.');
    }

    // Upsert on `endpoint` (its own primary key): re-subscribing the same
    // endpoint updates in place, never duplicates — one device holds at
    // most one trip subscription at a time (AD-7).
    const sql = getSql();
    await sql`
      INSERT INTO push_subscriptions (endpoint, trip_slug, p256dh, auth)
      VALUES (${endpoint}, ${tripSlug}, ${p256dh}, ${auth})
      ON CONFLICT (endpoint) DO UPDATE SET
        trip_slug = EXCLUDED.trip_slug,
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth
    `;

    return jsonOk({});
  } catch (err) {
    console.error('push/subscribe failed:', err);
    return jsonError(500, 'Er ging iets mis.');
  }
};
