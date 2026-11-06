# Virada do DNS do drglobal.com.br — Hostinger → DNS do Registro.br

Fazer **à noite** (o Guard usa `*.drglobal.com.br`). Lista conferida no servidor da Hostinger em 06/11/2026.

## 0. Antes (de dia, não derruba nada)
- registro.br → drglobal.com.br → **Provedor de serviços → ALTERAR PROVEDOR → "NENHUM (0)" → Continuar**.
  Tira a HSTDOMAINS (Hostinger) do domínio; a renovação passa a ser paga direto ao Registro.br.

## 1. Registros a cadastrar no DNS do Registro.br (modo avançado)

| Tipo | Nome | Valor | Para quê |
|---|---|---|---|
| A | (raiz) | 185.199.108.153 | site (GitHub Pages) |
| A | (raiz) | 185.199.109.153 | site |
| A | (raiz) | 185.199.110.153 | site |
| A | (raiz) | 185.199.111.153 | site |
| CNAME | www | zett-romao.github.io | site |
| CNAME | * | drg-guard.onrender.com | 🔴 **Guard: todos os condomínios** |
| CNAME | _acme-challenge | drg-guard.verify.renderdns.com | 🔴 certificado do Guard (Render) |
| CNAME | _cf-custom-hostname | drg-guard.hostname.renderdns.com | 🔴 domínio do Guard (Render) |
| MX 10 | (raiz) | mx.zoho.com | e-mail Zoho |
| MX 20 | (raiz) | mx2.zoho.com | e-mail Zoho |
| MX 50 | (raiz) | mx3.zoho.com | e-mail Zoho |
| TXT | (raiz) | v=spf1 include:zohomail.com ~all | SPF (já **sem** a Hostinger) |
| TXT | (raiz) | zoho-verification=zb30362582.zmverify.zoho.com | verificação Zoho |
| TXT | zmail._domainkey | (a chave DKIM do Zoho — ver abaixo) | DKIM Zoho |
| TXT | _dmarc | v=DMARC1; p=none | DMARC |
| TXT | resend._domainkey | p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQD19PZpFIW9RyMHsYrHKMnZ0HnxUGXdvEsW5hzW0gBdHDNxNJsOmWUEYntPAOqOlXxiOaNrxyN7i0a1GWkP8vDQ2hzRyzAVx6zsgcBezDgXjKKXl/RFL0JoplsUG2q2bIoq96E+GVOCJI5lldpOKxdK3h/X2oZlFp21FwzJrIzwZwIDAQAB | e-mails automáticos (Resend) |
| MX 10 | send | feedback-smtp.sa-east-1.amazonses.com | Resend |
| TXT | send | v=spf1 include:amazonses.com ~all | Resend |
| CNAME | links | links1.resend-dns.com | Resend (links rastreados) |

DKIM Zoho (`zmail._domainkey`):
`v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAmQs6CLuCCnpzUYCj0ELfP7A9uiBGrbitGeL4R6SIuu0JEYheLHBt8y8ri+gYe9xtyDCi6UBc256cSgLSbR0qEYHxu6N/McMETZfI1VcsMzzNrQckCvEXuHOmaFUMoS8mOuZU18SBA6p+dXFYVHeiJdZlVqNnILUUB6L57V1PYxN/NVRL0Zsj/c6gEKEfP74wI0SYMVE94hRegPSqbbkO2ZjOcTDkj2pcjBDcuAuYUWLeObHtlwwiQpGTOvoolXv2wBSA3hVSJ+opZOjLCvJNHcCDfxZSYAxGneaYdydiU0WXqXKRmyepep9b8/uJu5xq2vvzPzfQd59OEvYeyPALwQIDAQAB`

Não recriar (eram da Hostinger e morrem com ela): `hostingermail-a/b/c._domainkey`, `autodiscover`, `autoconfig`, ALIAS `@` → hstgr.net.

## 2. ⚠ Conferir ANTES de virar
- O DNS do Registro.br aceita o curinga `*`? Sem ele, **todos os condomínios do Guard caem**.
  Se não aceitar, NÃO virar: cadastrar um CNAME por condomínio ou escolher outro DNS.

## 3. Depois de virar — testes
1. `castelo-branco.drglobal.com.br` (e outro condomínio) abre o Guard com cadeado.
2. drglobal.com.br e www abrem o site novo (aí renomear `CNAME.depois-do-dns` → `CNAME`, push,
   e em GitHub → Settings → Pages → Custom domain = drglobal.com.br + Enforce HTTPS).
3. E-mail: mandar e receber pelo Zoho; Zoho → Domínios → MX/SPF/DKIM "Verificar".
4. Um e-mail automático do Guard (Resend) chega.
5. Só então: cancelar a Hostinger (e desligar a renovação automática).
