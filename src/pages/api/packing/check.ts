import type { APIRoute } from 'astro';

// POST /api/packing/check — public write exception (AD-3), set-state (not
// toggle) semantics: {id, checked} (AD-6). Story 9 implements.
export const prerender = false;

export const POST: APIRoute = async () => {
  return new Response(JSON.stringify({ ok: false, error: 'not implemented' }), {
    status: 501,
    headers: { 'Content-Type': 'application/json' },
  });
};
