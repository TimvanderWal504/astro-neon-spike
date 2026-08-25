import type { APIRoute } from 'astro';

// GET /api/trip/[slug] — redacted trip state for the public page, unredacted
// for the authenticated admin view (AD-2, AD-3). Story 3 implements.
export const prerender = false;

export const GET: APIRoute = async () => {
  return new Response(JSON.stringify({ ok: false, error: 'not implemented' }), {
    status: 501,
    headers: { 'Content-Type': 'application/json' },
  });
};
