/* D.R. Global (drglobal.com.br) — comportamento do site.
 *  1) menu ☰ (o estado mora no body); clicar num link fecha o menu e a página rola até a seção;
 *  2) topo ganha sombra ao rolar; link do menu da seção visível fica marcado;
 *  3) seções aparecem suavemente ao rolar;
 *  4) formulário → abre o WhatsApp da D.R. Global com a mensagem pronta.
 *     Botão nunca mudo: trava no clique, mostra "⏳", responde em verde/vermelho, destrava.
 */
(function () {
  var WHATS = '551152960840';
  var body = document.body;
  var burger = document.getElementById('burger');

  // 1) menu
  function fechaMenu() { body.classList.remove('menu-aberto'); burger.setAttribute('aria-expanded', 'false'); }
  burger.addEventListener('click', function () {
    var abre = !body.classList.contains('menu-aberto');
    body.classList.toggle('menu-aberto', abre);
    burger.setAttribute('aria-expanded', abre ? 'true' : 'false');
  });
  document.querySelectorAll('.topo__menu a').forEach(function (a) { a.addEventListener('click', fechaMenu); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') fechaMenu(); });

  // 2) sombra do topo + link ativo
  var topo = document.getElementById('topo');
  function aoRolar() { topo.classList.toggle('rolou', window.scrollY > 10); }
  window.addEventListener('scroll', aoRolar, { passive: true }); aoRolar();
  var links = {};
  document.querySelectorAll('.topo__menu a[href^="#"]').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
  if ('IntersectionObserver' in window) {
    var obsSecao = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting && links[e.target.id]) {
          Object.keys(links).forEach(function (k) { links[k].classList.remove('ativo'); });
          links[e.target.id].classList.add('ativo');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('main section[id]').forEach(function (s) { obsSecao.observe(s); });

    // 3) entrada suave
    var alvos = document.querySelectorAll('.secao__titulo, .card, .dupla__foto, .dupla__texto, .diferencial, .depoimento, .contato__info, .form, .faixa-imob__grade');
    var obsRevela = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('visivel'); obsRevela.unobserve(e.target); } });
    }, { threshold: 0.12 });
    alvos.forEach(function (el) { el.classList.add('revela'); obsRevela.observe(el); });
  }

  // 4) formulário → WhatsApp
  var form = document.getElementById('form-contato');
  var aviso = form.querySelector('.form__aviso');
  var btn = form.querySelector('button[type="submit"]');
  var textoOriginal = btn.textContent;
  function mostra(tipo, msg) { aviso.className = 'form__aviso ' + tipo; aviso.textContent = msg; }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (btn.disabled) return;
    var d = {}; new FormData(form).forEach(function (v, k) { d[k] = String(v).trim(); });
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email || '')) { mostra('erro', 'Informe um e-mail válido.'); form.email.focus(); return; }
    if (!d.mensagem) { mostra('erro', 'Escreva a sua mensagem.'); form.mensagem.focus(); return; }
    btn.disabled = true; btn.textContent = '⏳ Abrindo o WhatsApp... aguarde';
    var texto = 'Olá! Contato pelo site drglobal.com.br' +
      '\n\nNome: ' + (d.nome || '-') +
      '\nCondomínio: ' + (d.condominio || '-') +
      '\nE-mail: ' + d.email +
      '\nTelefone: ' + (d.telefone || '-') +
      '\n\n' + d.mensagem;
    var janela = window.open('https://wa.me/' + WHATS + '?text=' + encodeURIComponent(texto), '_blank');
    if (janela) { try { janela.opener = null; } catch (_) { /* outra origem */ } }
    setTimeout(function () {
      if (janela) {
        mostra('ok', '✓ WhatsApp aberto com a sua mensagem — é só tocar em Enviar por lá.');
        form.reset();
      } else {
        mostra('erro', 'O navegador bloqueou o WhatsApp. Chame no (11) 5296-0840 ou permita pop-ups.');
      }
      btn.disabled = false; btn.textContent = textoOriginal;
    }, 700);
  });

  var ano = document.getElementById('ano'); if (ano) ano.textContent = new Date().getFullYear();
})();
