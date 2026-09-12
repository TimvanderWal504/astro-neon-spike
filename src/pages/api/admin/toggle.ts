import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';
import { SESSION_COOKIE_NAME, verifySession } from '../../../lib/admin-auth';
import { jsonError, jsonOk } from '../../../lib/http';
import { sendChapterUnlockedPush } from '../../../lib/push';
import { setChapterUnlocked } from '../../../lib/trip-state';

// POST /api/admin/toggle — authenticated-only chapter unlock (AD-3). Story 5
// implements the write itself; story 8 adds the push fan-out (AD-4): only on
// a false→true transition, awaited before the response is returned (a
// fire-and-forget send could be silently dropped if Vercel freezes/
// terminates the function right after the response is sent), and never as
// part of a Postgres transaction with the write itself — the push send is an
// external HTTP call and can't join one.
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
    // ids before writing. Kept as the found chapter (not a boolean) so its
    // title is available for the push fan-out below without a second lookup.
    const chapter = trip.data.chapters.find((c) => c.id === chapterId);
    if (!chapter) {
      return jsonError(400, `Onbekend hoofdstuk: ${chapterId}`);
    }

    const result = await setChapterUnlocked(tripSlug, chapterId, unlocked);

    // Fan-out fires only on a false→true transition (never true→true or any
    // false transition) — detected from setChapterUnlocked's own atomic
    // RETURNING, no separate read. Awaited so the response can't be sent
    // (and the function potentially frozen/terminated) before the send
    // completes; a send failure is logged but never fails this response.
    if (result.previousUnlocked !== true && result.unlocked === true) {
      try {
        await sendChapterUnlockedPush(tripSlug, chapter.title);
      } catch (err) {
        console.error('admin/toggle: push fan-out failed:', err);
      }
    }

    return jsonOk({ chapterId, unlocked: result.unlocked });
  } catch (err) {
    console.error('admin/toggle failed:', err);
    return jsonError(500, 'Er ging iets mis.');
  }
};
