/* Miraru — «Retomar por donde lo dejaste» (v2.18.1).
 *
 * Si cerraste el navegador o apagaste el PC a medio episodio en AnimeAV1 (la
 * extensión apunta el minuto), aquí sale una tarjeta para seguir justo ahí.
 * No es una ventana emergente: va dentro de la página, encima de lo demás que
 * haya en ese sitio, así que nunca se pisa con otros avisos.
 *
 *   MiraruRetomar.pintar(contenedor)   → la pone dentro de `contenedor`
 */
(function () {
  'use strict';
  if (window.MiraruRetomar) return;
  const tr = s => (window.miraruTraducir ? window.miraruTraducir(s) : s);
  const mmss = t => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');

  function css() {
    if (document.getElementById('mret-css')) return;
    const st = document.createElement('style');
    st.id = 'mret-css';
    st.textContent = `
.mret{display:flex;align-items:center;gap:14px;padding:12px 14px;margin:0 0 14px;border-radius:16px;text-align:left;
  background:var(--card,#181426);border:1px solid rgba(var(--accent-rgb,124,58,237),.45);
  box-shadow:0 10px 30px rgba(var(--accent-rgb,124,58,237),.18);font-family:Inter,system-ui,sans-serif;color:var(--fg,#edecf4);
  animation:mretIn .5s cubic-bezier(.16,1,.3,1) both}
.mret img{width:46px;height:64px;object-fit:cover;border-radius:8px;flex-shrink:0;background:var(--card2,#110e1c)}
.mret .tx{flex:1;min-width:0}
.mret small{display:block;font-size:10.5px;letter-spacing:1.6px;text-transform:uppercase;color:var(--light,#c4b1ff);font-weight:700}
.mret b{display:block;font-size:15px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mret .sub{font-size:12.5px;color:var(--muted,#a49dc0);font-variant-numeric:tabular-nums}
.mret .barra{height:3px;border-radius:9px;background:var(--border,#2b2542);margin-top:7px;overflow:hidden}
.mret .barra i{display:block;height:100%;background:var(--grad-accent,var(--accent,#7c3aed))}
.mret .ir{border:0;cursor:pointer;padding:10px 16px;border-radius:11px;font:700 13.5px Inter,system-ui,sans-serif;color:#fff;
  background:var(--grad-accent,var(--accent,#7c3aed));white-space:nowrap;box-shadow:var(--shadow-accent,none)}
.mret .ir:hover{filter:brightness(1.1)}
.mret .x{border:0;background:none;color:var(--muted,#a49dc0);font-size:20px;line-height:1;cursor:pointer;padding:4px 6px;border-radius:8px;align-self:flex-start}
.mret .x:hover{color:var(--fg,#fff);background:var(--card2,#110e1c)}
@media (max-width:520px){.mret{flex-wrap:wrap}.mret .ir{flex:1 0 100%}}
@keyframes mretIn{from{opacity:0;transform:translateY(8px)}}
[data-motion="reducido"] .mret{animation:none}`;
    document.head.appendChild(st);
  }

  async function pintar(contenedor) {
    if (!contenedor || document.querySelector('.mret')) return;
    let r = null;
    try { r = (await (await fetch('/api/retomar', {cache: 'no-store'})).json()).retomar; } catch (_) { return; }
    if (!r) return;
    css();
    const c = document.createElement('div');
    c.className = 'mret';
    c.setAttribute('role', 'region');
    c.setAttribute('aria-label', tr('Retomar por donde lo dejaste'));
    const img = document.createElement('img');
    img.alt = '';
    img.onerror = () => img.remove();
    if (!r.imagen) img.hidden = true;
    else if (window.miraruPortada) window.miraruPortada(img, r.imagen);
    else img.src = r.imagen;
    const tx = document.createElement('div'); tx.className = 'tx';
    const sm = document.createElement('small'); sm.textContent = '▶ ' + tr('Retomar por donde lo dejaste');
    const b = document.createElement('b'); b.textContent = r.nombre; b.setAttribute('data-no-i18n', ''); b.title = r.nombre;
    const sub = document.createElement('div'); sub.className = 'sub'; sub.setAttribute('data-no-i18n', '');
    sub.textContent = tr('Episodio') + ' ' + r.episodio + ' · ' + mmss(r.t) + (r.d ? ' / ' + mmss(r.d) : '');
    tx.append(sm, b, sub);
    if (r.d) {
      const ba = document.createElement('div'); ba.className = 'barra';
      const i = document.createElement('i'); i.style.width = Math.round(r.t * 100 / r.d) + '%';
      ba.append(i); tx.append(ba);
    }
    const ir = document.createElement('button'); ir.type = 'button'; ir.className = 'ir'; ir.textContent = tr('Seguir viendo');
    ir.onclick = () => {
      window.open(r.url, '_blank', 'noopener');
      fetch('/api/retomar/descartar', {method: 'POST'}).catch(() => {});
      c.remove();
    };
    const x = document.createElement('button'); x.type = 'button'; x.className = 'x'; x.textContent = '×';
    x.setAttribute('aria-label', tr('Descartar'));
    x.onclick = () => { fetch('/api/retomar/descartar', {method: 'POST'}).catch(() => {}); c.remove(); };
    c.append(img, tx, ir, x);
    contenedor.appendChild(c);
  }

  window.MiraruRetomar = {pintar};
})();
