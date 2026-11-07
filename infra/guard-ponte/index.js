/* DRG-Guard — ponte Cloudflare -> Render para *.drglobal.com.br (07/11/2026).
 * Com drglobal.com.br numa zona Cloudflare e o Render também atrás da Cloudflare,
 * o CNAME direto dá "Error 1000 — DNS points to prohibited IP". Este Worker pega o
 * pedido do condomínio e o repassa a drg-guard.onrender.com, dizendo em
 * X-Forwarded-Host qual condomínio é (o Guard lê esse cabeçalho em resolveTenant). */
const ORIGEM = 'drg-guard.onrender.com';
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const host = url.hostname;
    url.hostname = ORIGEM;
    const headers = new Headers(request.headers);
    headers.set('X-Forwarded-Host', host);
    headers.set('X-Forwarded-Proto', 'https');
    const ip = request.headers.get('CF-Connecting-IP');
    if (ip) headers.set('X-Forwarded-For', ip);
    const init = { method: request.method, headers, redirect: 'manual' };
    if (request.method !== 'GET' && request.method !== 'HEAD') init.body = request.body;
    const resp = await fetch(url.toString(), init);
    /* Redirecionamento absoluto para o onrender volta para o endereço do condomínio. */
    const loc = resp.headers.get('Location');
    if (loc && loc.includes(ORIGEM)) {
      const r = new Response(resp.body, resp);
      r.headers.set('Location', loc.split(ORIGEM).join(host));
      return r;
    }
    return resp;
  },
};
