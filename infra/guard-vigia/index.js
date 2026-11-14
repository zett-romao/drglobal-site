/* 🚨 DRG-Guard — VIGIA DE QUEDA (14/11/2026, do dono: "alerta de queda… fora do Guard").
 *
 * Roda na Cloudflare, de minuto em minuto, FORA do Render: um Guard caído não avisa que
 * caiu. Confere o /api/health pelo domínio (adm.drglobal.com.br) e pela rota de reserva
 * (drg-guard.onrender.com) e manda WhatsApp (modelo aprovado da Meta, direto na API —
 * não depende do Guard estar no ar) e e-mail (Resend) ao dono:
 *   🔴 caiu (servidor fora)  ·  🟠 domínio fora mas a reserva responde  ·  🟡 memória alta
 *   🔁 lembrete a cada 30 min enquanto durar  ·  ✅ voltou (com quanto tempo ficou fora)
 *
 * 🔒 Repositório PÚBLICO: nada de número, token ou chave aqui. Tudo em `wrangler secret put`:
 *    DESTINO (55DDDNÚMERO), WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, WHATSAPP_TEMPLATE,
 *    RESEND_API_KEY, EMAIL_DESTINO, CHAVE_TESTE.
 * Estado (para avisar só na MUDANÇA, não a cada minuto) no KV `VIGIA`: grava só quando muda.
 * Teste manual: GET https://drg-guard-vigia.<conta>.workers.dev/teste?k=<CHAVE_TESTE>
 */
const ALVOS = {
  dominio: 'https://adm.drglobal.com.br/api/health',
  reserva: 'https://drg-guard.onrender.com/api/health',
};
const LEMBRETE_MIN = 30;
const MEMORIA_ALTA = 0.8;           // heap usado / limite
const TIMEOUT_MS = 12000;

async function medir(url) {
  const t0 = Date.now();
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { 'user-agent': 'drg-guard-vigia' }, cf: { cacheTtl: 0 } });
    const ms = Date.now() - t0;
    if (!r.ok) return { ok: false, motivo: `HTTP ${r.status}`, ms };
    const j = await r.json().catch(() => null);
    if (!j || j.ok !== true) return { ok: false, motivo: 'resposta sem ok:true', ms };
    const m = j.memoria || {};
    const mem = m.limiteHeapMb ? m.usadoHeapMb / m.limiteHeapMb : 0;
    return { ok: true, ms, mem, heap: m.usadoHeapMb, limite: m.limiteHeapMb };
  } catch (e) {
    return { ok: false, motivo: e && e.name === 'TimeoutError' ? `sem resposta em ${TIMEOUT_MS / 1000}s` : String(e && e.message || e), ms: Date.now() - t0 };
  }
}

/* Mede duas vezes antes de chamar de queda: um soluço de rede não acorda o dono. */
async function medirFirme(url) {
  const a = await medir(url);
  if (a.ok) return a;
  await new Promise((r) => setTimeout(r, 15000));
  return medir(url);
}

function classificar(dom, res) {
  if (dom.ok && res.ok) {
    const mem = Math.max(dom.mem || 0, res.mem || 0);
    return mem >= MEMORIA_ALTA ? { estado: 'memoria', mem, heap: dom.heap || res.heap, limite: dom.limite || res.limite } : { estado: 'ok' };
  }
  if (!dom.ok && res.ok) return { estado: 'dominio', motivo: dom.motivo };
  if (dom.ok && !res.ok) return { estado: 'ok' };     // reserva fora e o domínio no ar: nada a fazer agora
  return { estado: 'fora', motivo: dom.motivo || res.motivo };
}

const hora = (ms) => new Date(ms).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
const duracao = (ms) => { const m = Math.round(ms / 60000); return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`; };

function texto(c, desde, agora, lembrete) {
  const pre = lembrete ? `🔁 Continua (há ${duracao(agora - desde)}): ` : '';
  if (c.estado === 'fora') return `${pre}🔴 DRG-Guard FORA DO AR desde ${hora(desde)}. Domínio e reserva (onrender) sem resposta: ${c.motivo}. Olhar o painel do Render (Events/Logs).`;
  if (c.estado === 'dominio') return `${pre}🟠 DRG-Guard: o DOMÍNIO *.drglobal.com.br não responde desde ${hora(desde)} (${c.motivo}), mas o servidor está vivo pela reserva drg-guard.onrender.com. Conferir DNS/Cloudflare (registro * cinza).`;
  if (c.estado === 'memoria') return `${pre}🟡 DRG-Guard com MEMÓRIA ALTA: ${c.heap} de ${c.limite} MB (${Math.round(c.mem * 100)}%) desde ${hora(desde)}. Risco de reinício (heap OOM).`;
  return '';
}

/* 👥 QUEM avisar (14/11/2026, do dono: "no meu usuário ou no de quem eu permitir"): a lista
   vem do Guard (Configuração › 🚨 Alertas de queda) e fica guardada no KV — se o Guard cair,
   vale a última lista lida. Antes da 1ª leitura (ou sem GUARD_VIGIA_TOKEN), vale DESTINO/EMAIL_DESTINO. */
const LISTA_MIN = 10;
async function atualizarLista(env, forcar) {
  if (!env.GUARD_VIGIA_TOKEN) return null;
  const ant = await env.VIGIA.get('destinos', 'json');
  if (!forcar && ant && Date.now() - ant.em < LISTA_MIN * 60000) return ant;
  try {
    const r = await fetch(`${new URL(ALVOS.dominio).origin}/svc/vigia/destinos`, { headers: { authorization: `Bearer ${env.GUARD_VIGIA_TOKEN}` }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!r.ok) return ant;
    const j = await r.json();
    const nova = { em: Date.now(), destinos: Array.isArray(j.destinos) ? j.destinos : [] };
    if (!ant || JSON.stringify(ant.destinos) !== JSON.stringify(nova.destinos) || Date.now() - ant.em > 6 * 3600000) await env.VIGIA.put('destinos', JSON.stringify(nova));
    return nova;
  } catch (_) { return ant; }
}
async function alvos(env) {
  const l = await env.VIGIA.get('destinos', 'json');
  if (l && Array.isArray(l.destinos)) return l.destinos;
  return [{ nome: 'dono', whatsapp: env.DESTINO || '', email: env.EMAIL_DESTINO || '' }];
}

async function enviarWa(env, para, msg) {
  if (!(env.WHATSAPP_TOKEN && env.WHATSAPP_PHONE_ID && env.WHATSAPP_TEMPLATE && para)) return null;
  const r = await fetch(`https://graph.facebook.com/v21.0/${env.WHATSAPP_PHONE_ID}/messages`, {
    method: 'POST',
    headers: { authorization: `Bearer ${env.WHATSAPP_TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: para, type: 'template',
      template: { name: env.WHATSAPP_TEMPLATE, language: { code: env.WHATSAPP_LANG || 'pt_BR' },
        components: [{ type: 'body', parameters: [{ type: 'text', text: msg.slice(0, 900) }] }] } }),
  }).catch((e) => ({ ok: false, status: 0, text: async () => String(e) }));
  return `whatsapp ${r.status}${r.ok ? '' : ' ' + (await r.text()).slice(0, 160)}`;
}
async function enviarEmail(env, para, msg) {
  if (!(env.RESEND_API_KEY && para)) return null;
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: env.EMAIL_DE || 'DRG-Guard Vigia <vigia@drglobal.com.br>', to: [para], subject: msg.slice(0, 90), text: msg }),
  }).catch((e) => ({ ok: false, status: 0, text: async () => String(e) }));
  return `email ${r.status}${r.ok ? '' : ' ' + (await r.text()).slice(0, 160)}`;
}
async function avisar(env, msg) {
  const lista = await alvos(env);
  const vistos = new Set(); const out = [];
  for (const d of lista) {
    const wa = String(d.whatsapp || '').replace(/\D/g, '');
    const em = String(d.email || '').trim().toLowerCase();
    const r = [];
    if (wa && !vistos.has(wa)) { vistos.add(wa); const x = await enviarWa(env, wa, msg); if (x) r.push(x); }
    if (em && !vistos.has(em)) { vistos.add(em); const x = await enviarEmail(env, em, msg); if (x) r.push(x); }
    if (r.length) out.push(`${d.nome || '?'}: ${r.join(', ')}`);
  }
  return { enviados: out.length, canal: out.join(' · ') || 'nenhum canal configurado' };
}

async function rodada(env) {
  const agora = Date.now();
  const [dom, res] = await Promise.all([medirFirme(ALVOS.dominio), medirFirme(ALVOS.reserva)]);
  if (dom.ok) await atualizarLista(env, false);
  const c = classificar(dom, res);
  const ant = (await env.VIGIA.get('estado', 'json')) || { estado: 'ok', desde: agora, aviso: 0 };
  if (c.estado !== ant.estado) {
    let msg;
    if (c.estado === 'ok') msg = `✅ DRG-Guard VOLTOU às ${hora(agora)} (ficou ${ant.estado === 'memoria' ? 'com memória alta' : 'com problema'} por ${duracao(agora - ant.desde)}).`;
    else msg = texto(c, agora, agora, false);
    const { canal } = await avisar(env, msg);
    await env.VIGIA.put('estado', JSON.stringify({ estado: c.estado, desde: agora, aviso: agora, canal }));
    return { mudou: true, c, canal };
  }
  if (c.estado !== 'ok' && agora - (ant.aviso || 0) >= LEMBRETE_MIN * 60000) {
    const { canal } = await avisar(env, texto(c, ant.desde, agora, true));
    await env.VIGIA.put('estado', JSON.stringify({ ...ant, aviso: agora, canal }));
    return { lembrete: true, c, canal };
  }
  return { c, dom, res };
}

export default {
  async scheduled(_ev, env, ctx) { ctx.waitUntil(rodada(env)); },
  async fetch(req, env) {
    const u = new URL(req.url);
    const bearer = String(req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    const peloGuard = Boolean(env.GUARD_VIGIA_TOKEN) && bearer === env.GUARD_VIGIA_TOKEN;
    const autorizado = (env.CHAVE_TESTE && u.searchParams.get('k') === env.CHAVE_TESTE) || peloGuard;
    if (u.pathname === '/teste' && autorizado) {
      await atualizarLista(env, true);
      const r = await avisar(env, `🧪 Teste do vigia do DRG-Guard (${hora(Date.now())}). Se chegou, os alertas de queda chegam aqui.`);
      return Response.json({ ok: true, ...r });
    }
    if (u.pathname === '/estado' && autorizado) {
      return Response.json({ estado: await env.VIGIA.get('estado', 'json'), agora: await rodada(env) });
    }
    return new Response('drg-guard-vigia', { status: 404 });
  },
};
