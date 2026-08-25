// Shared JSON envelope helpers (AD-8 / Consistency Conventions): all 4 API
// routes share `{ok:true,data}` / `{ok:false,error}`. Story 3 introduces this
// helper and is the first route to use it; the other 3 stub routes still
// hand-roll the shape until their own stories land.

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
