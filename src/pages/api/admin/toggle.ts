import type { APIRoute } from 'astro';

// POST /api/admin/toggle — authenticated-only chapter unlock + push fan-out
// in one transaction (AD-3, AD-4). Story 5 implements.
export const prerender = false;

export const POST: APIRoute = async () => {
  return new Response(JSON.stringify({ ok: false, error: 'not implemented' }), {
    status: 501,
    headers: { 'Content-Type': 'application/json' },
  });
};
