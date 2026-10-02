import type { APIRoute } from 'astro';
import { jsonError, jsonOk } from '../../../lib/http';
import { listNotifications } from '../../../lib/push';
import { getTripState, redactTripState } from '../../../lib/trip-state';

// GET /api/trip/[slug] — redacted trip state for the public page (AD-2).
// The authenticated, unredacted admin variant is a separate route built in
// story 4/5; it is not implemented here.
export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const slug = params.slug;
  if (!slug) {
    return jsonError(404, 'Unknown trip.');
  }

  let state;
  try {
    state = await getTripState(slug);
  } catch (err) {
    console.error(`getTripState(${slug}) failed:`, err);
    return jsonError(500, 'Something went wrong loading the trip.');
  }

  if (!state) {
    return jsonError(404, `Unknown trip: ${slug}`);
  }

  // Notifications are best-effort: a failure here must not take down the
  // chapter state the page depends on. A chapter-unlock notification
  // carries the chapter title, so it is dropped again if that chapter is
  // locked (AD-2 gating still holds after a re-lock).
  let notifications: { id: number; title: string; body: string; createdAt: string }[] = [];
  try {
    const lockedChapterIds = new Set(
      state.chapters.filter((chapter) => !chapter.unlocked).map((chapter) => chapter.id),
    );
    notifications = (await listNotifications(slug))
      .filter((n) => n.chapterId === null || !lockedChapterIds.has(n.chapterId))
      .map(({ id, title, body, createdAt }) => ({ id, title, body, createdAt }));
  } catch (err) {
    console.error(`listNotifications(${slug}) failed:`, err);
  }

  return jsonOk({ ...redactTripState(state), notifications });
};
