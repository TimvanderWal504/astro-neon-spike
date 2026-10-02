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

  // Admin-sent notifications are best-effort: a failure here must not take
  // down the chapter state the page depends on.
  let notifications: Awaited<ReturnType<typeof listNotifications>> = [];
  try {
    notifications = await listNotifications(slug);
  } catch (err) {
    console.error(`listNotifications(${slug}) failed:`, err);
  }

  return jsonOk({ ...redactTripState(state), notifications });
};
