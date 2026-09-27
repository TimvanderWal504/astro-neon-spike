// Shared JSON envelope helpers (AD-8 / Consistency Conventions): every API
// route under src/pages/api/ answers `{ok:true,data}` / `{ok:false,error}`
// through these two, so the page and the admin can parse any response the
// same way.

export function jsonOk(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  return new Response(JSON.stringify({ ok: true, data }), {
    status: 200,
    ...init,
    headers,
  });
}

export function jsonError(status: number, error: string): Response {
  return new Response(JSON.stringify({ ok: false, error }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
