# Site D.R. Global — drglobal.com.br

Site institucional da **D.R. Global Gestão de Condomínios** (HTML/CSS/JS estático, sem build).
Substitui o site do Construtor de Sites da Hostinger (06/11/2026), que prendia o domínio à Hostinger.

- `index.html` — página única (serviços, sobre, diferenciais, clientes, imobiliária, contato).
- `styles.css` — cores do vetor oficial da marca: marinho `#232553`, dourado `#B29B51`.
- `site.js` — menu ☰, entrada suave, formulário → WhatsApp **(11) 5296-0840** com a mensagem pronta
  (botão nunca mudo: trava, "⏳", responde em verde/vermelho, destrava).
- `servicos/ sobre/ contato/ blog-list/` — redirecionam os endereços antigos para as seções.
- **Logo:** recortada do vetor oficial `G:\Meu Drive\Logos\Logo_D.R.Global_Editavel.ai` — nunca redesenhar.
  Só sobre fundo branco (no rodapé escuro ela vai num cartão branco).
- Fotos: Unsplash (licença livre), versões `.webp` em `img/fotos/`.

## Publicação
GitHub Pages (branch `main`, raiz). O arquivo `CNAME.depois-do-dns` vira `CNAME` (conteúdo `drglobal.com.br`)
**só depois** que o DNS do domínio sair da Hostinger e apontar para o GitHub Pages.

Testar local: `npx http-server -p 8765 .`
