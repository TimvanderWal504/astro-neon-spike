import type { APIRoute } from 'astro';
import { jsonError, jsonOk } from '../../../lib/http';
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

  return jsonOk(redactTripState(state));
};
