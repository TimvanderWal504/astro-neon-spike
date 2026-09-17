import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';
import { SESSION_COOKIE_NAME, verifySession } from '../../../lib/admin-auth';
import { jsonError, jsonOk } from '../../../lib/http';
import { sendCustomNotification } from '../../../lib/push';

// POST /api/admin/notify — authenticated-only admin broadcast (AD-3):
// sends an admin-authored push notification to every subscriber of a trip.
// Same auth/validation conventions as admin/toggle.ts, but here the push
// fan-out result (sent/failed/total) IS the response payload rather than a
// side effect on a DB write, so it's always awaited and returned.
export const prerender = false;

const MAX_TITLE_LENGTH = 100;
const MAX_BODY_LENGTH = 500;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Independently re-verify the session cookie before touching anything —
    // same pattern as admin.astro/toggle.ts.
    const cookieSigningSecret = process.env.COOKIE_SIGNING_SECRET;
    const sessionCookie = cookies.get(SESSION_COOKIE_NAME)?.value;
    const isAuthenticated = Boolean(
      cookieSigningSecret && verifySession(sessionCookie, cookieSigningSecret),
    );
    if (!isAuthenticated) {
      return jsonError(401, 'Niet geauthenticeerd.');
    }

    let requestBody: unknown;
    try {
      requestBody = await request.json();
    } catch {
      return jsonError(400, 'Ongeldige aanvraag.');
    }

    if (typeof requestBody !== 'object' || requestBody === null) {
      return jsonError(400, 'Ongeldige aanvraag.');
    }

    const { tripSlug, title, body } = requestBody as Record<string, unknown>;

    if (
      typeof tripSlug !== 'string' ||
      tripSlug.length === 0 ||
      typeof title !== 'string' ||
      title.trim().length === 0 ||
      title.length > MAX_TITLE_LENGTH ||
      typeof body !== 'string' ||
      body.trim().length === 0 ||
      body.length > MAX_BODY_LENGTH
    ) {
      return jsonError(400, 'tripSlug, title of body ontbreekt of is ongeldig.');
    }

    // The session cookie is global, not trip-scoped, so an unknown tripSlug
    // is only ever caught here — same reasoning as admin/toggle.ts.
    const trips = await getCollection('trips');
    const trip = trips.find((entry) => entry.id === tripSlug);
    if (!trip) {
      return jsonError(400, `Onbekende trip: ${tripSlug}`);
    }

    const result = await sendCustomNotification(tripSlug, title.trim(), body.trim());

    return jsonOk(result);
  } catch (err) {
    console.error('admin/notify failed:', err);
    return jsonError(500, 'Er ging iets mis.');
  }
};
