import type { APIRoute } from 'astro';

// POST /api/push/subscribe — public write exception (AD-3), stores a
// tripSlug-scoped push subscription. Story 8 implements.
export const prerender = false;

export const POST: APIRoute = async () => {
  return new Response(JSON.stringify({ ok: false, error: 'not implemented' }), {
    status: 501,
    headers: { 'Content-Type': 'application/json' },
  });
};
