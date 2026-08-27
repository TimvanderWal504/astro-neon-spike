import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';
import { SESSION_COOKIE_NAME, verifySession } from '../../../lib/admin-auth';
import { jsonError, jsonOk } from '../../../lib/http';
import { setChapterUnlocked } from '../../../lib/trip-state';

// POST /api/admin/toggle — authenticated-only chapter unlock (AD-3). Story 5
// implements the write itself; story 8 later adds the push fan-out (AD-4)
// inside the same transaction as `setChapterUnlocked`, without touching this
// route's auth/parsing/response shape.
export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Independently re-verify the session cookie — same lazy
    // process.env.COOKIE_SIGNING_SECRET read + verifySession pattern as
    // admin.astro/login.ts — before touching the DB. Unauthenticated
    // requests get 401 with no DB call.
    const cookieSigningSecret = process.env.COOKIE_SIGNING_SECRET;
    const sessionCookie = cookies.get(SESSION_COOKIE_NAME)?.value;
    const isAuthenticated = Boolean(
      cookieSigningSecret && verifySession(sessionCookie, cookieSigningSecret),
    );
    if (!isAuthenticated) {
      return jsonError(401, 'Niet geauthenticeerd.');
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError(400, 'Ongeldige aanvraag.');
    }

    if (typeof body !== 'object' || body === null) {
      return jsonError(400, 'Ongeldige aanvraag.');
    }

    const { tripSlug, chapterId, unlocked } = body as Record<string, unknown>;

    // Strict types — no truthy coercion on `unlocked`.
    if (
      typeof tripSlug !== 'string' ||
      tripSlug.length === 0 ||
      typeof chapterId !== 'string' ||
      chapterId.length === 0 ||
      typeof unlocked !== 'boolean'
    ) {
      return jsonError(400, 'tripSlug, chapterId of unlocked ontbreekt of is ongeldig.');
    }

    // The session cookie is global, not trip-scoped, so an unknown tripSlug
    // is only ever caught here.
    const trips = await getCollection('trips');
    const trip = trips.find((entry) => entry.id === tripSlug);
    if (!trip) {
      return jsonError(400, `Onbekende trip: ${tripSlug}`);
    }

    // chapterId must be validated against that trip's real content chapter
    // ids before writing.
    const chapterExists = trip.data.chapters.some((chapter) => chapter.id === chapterId);
    if (!chapterExists) {
      return jsonError(400, `Onbekend hoofdstuk: ${chapterId}`);
    }

    const result = await setChapterUnlocked(tripSlug, chapterId, unlocked);
    return jsonOk({ chapterId, unlocked: result });
  } catch (err) {
    console.error('admin/toggle failed:', err);
    return jsonError(500, 'Er ging iets mis.');
  }
};
