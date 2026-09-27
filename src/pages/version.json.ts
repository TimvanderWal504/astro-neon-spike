import type { APIRoute } from 'astro';

// GET /version.json — which build is live right now. Prerendered into a
// plain static file, NOT an API route: it holds nothing but a build id, so
// it needs no function, no DB and no place in AD-2's list of API routes.
// An open page compares this against the id it was itself built with and
// offers a reload once they differ (see the update banner in
// src/pages/[trip]/index.astro). A new deploy replaces the file along with
// the rest of the static output, and the client fetches it with
// cache: 'no-store', so there's no stale copy to wait out.
export const prerender = true;

export const GET: APIRoute = () =>
  new Response(JSON.stringify({ buildId: __BUILD_ID__ }), {
    headers: { 'Content-Type': 'application/json' },
  });
