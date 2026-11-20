/* Miraru Plus (v2.18) — la ventana de Plus, en cualquier página.
 *
 *   MiraruPlus.es()            → true/false al momento (último estado conocido)
 *   MiraruPlus.estado()        → promesa con /api/plus (y actualiza lo guardado)
 *   MiraruPlus.abrir('movil')  → abre la ventana (opcional: sección a resaltar)
 *   MiraruPlus.candado(el, id) → si no hay Plus, añade 🔒 y al pulsar abre Plus
 *
 * Al cambiar el estado se lanza el evento `miraru-plus` en window.
 * Los textos van en español: i18n-dom.js los traduce.
 */
(function () {
  'use strict';
  if (window.MiraruPlus) return;
  const KEY = 'miraru_plus';
  const tr = s => (window.miraruTraducir ? window.miraruTraducir(s) : s);
  let _datos = null, _promesa = null;

  function es() {
    try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; }
  }

  function _guardar(d) {
    const antes = es();
    try { localStorage.setItem(KEY, d.plus ? '1' : '0'); } catch (e) {}
    _datos = d;
    if (antes !== !!d.plus) window.dispatchEvent(new CustomEvent('miraru-plus', {detail: d}));
  }

  function estado(forzar) {
    if (_promesa && !forzar) return _promesa;
    _promesa = fetch('/api/plus').then(r => r.ok ? r.json() : null).then(d => {
      if (d) _guardar(d);
      return d;
    }).catch(() => null);
    return _promesa;
  }

  // ── Estilos ───────────────────────────────────────────────────────────────
  function css() {
    if (document.getElementById('mplus-css')) return;
    const st = document.createElement('style');
    st.id = 'mplus-css';
    st.textContent = `
.mplus-fondo{position:fixed;inset:0;z-index:9000;background:rgba(4,2,10,.66);backdrop-filter:blur(6px);
  -webkit-backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:16px;
  animation:mplusIn .18s ease}
.mplus{background:var(--card,#181426);color:var(--fg,#edecf4);border:1px solid var(--border,#2b2542);border-radius:20px;
  width:100%;max-width:560px;max-height:90vh;overflow-y:auto;box-shadow:0 28px 70px rgba(0,0,0,.5);
  font:14px/1.5 Inter,system-ui,sans-serif;animation:mplusPop .28s cubic-bezier(.16,1,.3,1)}
.mplus-cab{position:relative;padding:26px 24px 20px;background:var(--grad-accent-soft,rgba(124,58,237,.15));
  border-bottom:1px solid var(--border,#2b2542);border-radius:20px 20px 0 0}
.mplus-cab h2{margin:0;font-size:24px;font-weight:800;letter-spacing:-.03em}
.mplus-cab h2 span{background:var(--grad-accent,linear-gradient(135deg,#7c3aed,#d946ef));-webkit-background-clip:text;
  background-clip:text;color:transparent}
.mplus-cab p{margin:6px 0 0;color:var(--muted,#a49dc0);font-size:13.5px;max-width:42ch}
.mplus-x{position:absolute;top:14px;right:14px;background:none;border:none;color:var(--muted,#a49dc0);font-size:24px;
  line-height:1;cursor:pointer;padding:4px 8px;border-radius:8px}
.mplus-x:hover{background:var(--card2,#110e1c);color:var(--fg,#fff)}
.mplus-cuerpo{padding:18px 24px 24px}
.mplus-insignia{display:inline-flex;align-items:center;gap:6px;margin-top:12px;padding:5px 11px;border-radius:999px;
  font-size:12px;font-weight:700;background:rgba(16,185,129,.16);color:#34d399;border:1px solid rgba(16,185,129,.35)}
[data-theme="light"] .mplus-insignia{color:#047857}
.mplus-ventajas{list-style:none;margin:0 0 18px;padding:0;display:grid;gap:2px}
.mplus-v{display:grid;grid-template-columns:34px 1fr;gap:4px 12px;padding:10px 10px;border-radius:12px}
.mplus-v.foco{background:var(--card2,#110e1c);box-shadow:inset 0 0 0 1px var(--accent,#7c3aed)}
.mplus-v .i{font-size:20px;line-height:1.4;text-align:center}
.mplus-v b{display:block;font-size:14px}
.mplus-v small{display:block;color:var(--muted,#a49dc0);font-size:12.5px;line-height:1.45}
.mplus-v .ajuste{grid-column:2;margin-top:8px}
.mplus-planes{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:4px 0 12px}
.mplus-plan{position:relative;text-align:left;padding:14px 14px 12px;border-radius:14px;cursor:pointer;
  background:var(--card2,#110e1c);color:inherit;border:1.5px solid var(--border,#2b2542);font:inherit;
  transition:border-color .15s,transform .15s}
.mplus-plan:hover{transform:translateY(-1px)}
.mplus-plan[aria-pressed="true"]{border-color:var(--accent,#7c3aed);box-shadow:var(--ring,0 0 0 3px rgba(124,58,237,.4))}
.mplus-plan .n{font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted,#a49dc0)}
.mplus-plan .p{display:block;font-size:20px;font-weight:800;letter-spacing:-.02em;margin-top:2px}
.mplus-plan .e{position:absolute;top:-9px;right:10px;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:800;
  background:var(--grad-accent,#7c3aed);color:#fff}
.mplus-comprar{width:100%;padding:13px;border:none;border-radius:12px;font:inherit;font-size:15px;font-weight:800;
  cursor:pointer;color:#fff;background:var(--grad-accent,#7c3aed);box-shadow:var(--shadow-accent,none)}
.mplus-comprar:disabled{opacity:.6;cursor:default}
.mplus-nota{margin:10px 0 0;font-size:12px;color:var(--muted,#a49dc0);text-align:center}
.mplus-aviso{margin:0 0 12px;padding:11px 13px;border-radius:12px;font-size:13px;background:rgba(245,158,11,.12);
  border:1px solid rgba(245,158,11,.35)}
.mplus-btn{padding:7px 12px;border-radius:9px;border:1px solid var(--border,#2b2542);background:var(--card,#181426);
  color:var(--fg,#fff);font:inherit;font-size:12.5px;font-weight:600;cursor:pointer;margin:0 6px 6px 0}
.mplus-btn.p{background:var(--grad-accent,#7c3aed);color:#fff;border-color:transparent}
.mplus-qr{display:flex;gap:14px;align-items:center;margin:4px 0 8px}
.mplus-qr .qr{background:#fff;padding:8px;border-radius:12px;line-height:0;flex:none}
.mplus-qr .qr svg{width:118px;height:118px;display:block}
.mplus-qr ol{margin:0;padding-left:18px;font-size:12.5px;color:var(--muted,#a49dc0)}
.mplus-qr code{font-size:11.5px;word-break:break-all;color:var(--fg,#fff)}
.mplus-candado{margin-left:6px;font-size:.85em;opacity:.85}
@keyframes mplusIn{from{opacity:0}to{opacity:1}}
@keyframes mplusPop{from{opacity:0;transform:translateY(10px) scale(.98)}to{opacity:1;transform:none}}
[data-motion="reducido"] .mplus,[data-motion="reducido"] .mplus-fondo{animation:none}`;
    document.head.appendChild(st);
  }

  function el(tag, clase, txt) {
    const e = document.createElement(tag);
    if (clase) e.className = clase;
    if (txt != null) e.textContent = tr(txt);
    return e;
  }

  function boton(txt, clase, fn) {
    const b = el('button', 'mplus-btn' + (clase ? ' ' + clase : ''), txt);
    b.type = 'button';
    b.onclick = fn;
    return b;
  }

  function aviso(msg, tipo) {
    if (window.toast) window.toast(tr(msg), tipo || 'ok');
  }

  async function post(url, body) {
    const r = await fetch(url, {method: 'POST', headers: {'Content-Type': 'application/json'},
                                body: JSON.stringify(body || {})});
    let d = null;
    try { d = await r.json(); } catch (e) {}
    return {ok: r.ok, d};
  }

  function _qr(cont, url) {
    const pintar = () => {
      try {
        const q = window.qrcode(0, 'M');
        q.addData(url); q.make();
        cont.innerHTML = q.createSvgTag({cellSize: 4, margin: 0, scalable: true});
      } catch (e) { cont.textContent = url; }
    };
    if (window.qrcode) return pintar();
    const s = document.createElement('script');
    s.src = '/static/vendor/qrcode.js';
    s.onload = pintar;
    document.head.appendChild(s);
  }

  // ── Ajustes de cada ventaja (solo con Plus) ───────────────────────────────
  async function ajusteMovil(caja) {
    caja.innerHTML = '';
    const d = await fetch('/api/plus/movil').then(r => r.json()).catch(() => null);
    if (!d) return;
    if (!d.activo) {
      caja.append(boton('📲 Activar avisos en el móvil', 'p', async () => {
        await post('/api/plus/movil/activar'); ajusteMovil(caja);
      }));
      return;
    }
    const fila = el('div', 'mplus-qr');
    const qr = el('div', 'qr');
    qr.setAttribute('role', 'img');
    qr.setAttribute('aria-label', tr('Código QR para recibir los avisos en el móvil'));
    const pasos = el('ol');
    pasos.append(el('li', '', 'Instala la app gratuita «ntfy» en tu móvil.'),
                 el('li', '', 'Escanea este código con la cámara, o en ntfy pulsa «+» y escribe:'));
    const tema = el('code'); tema.textContent = d.tema; tema.setAttribute('data-no-i18n', '');
    pasos.lastChild.append(document.createElement('br'), tema);
    pasos.append(el('li', '', 'Pulsa «Probar»: te llegará un aviso.'));
    fila.append(qr, pasos);
    _qr(qr, d.url_qr);
    caja.append(fila,
      boton('Probar', 'p', async () => {
        const r = await post('/api/plus/movil/probar');
        aviso(r.ok ? '📲 Aviso enviado' : ((r.d && r.d.detail) || 'No se pudo enviar el aviso'), r.ok ? 'ok' : 'err');
      }),
      boton('Código nuevo', '', async () => { await post('/api/plus/movil/nuevo'); ajusteMovil(caja); }),
      boton('Apagar', '', async () => { await post('/api/plus/movil/desactivar'); ajusteMovil(caja); }));
  }

  function _hace(ts) {
    if (!ts) return '';
    const min = Math.max(0, Math.round((Date.now() / 1000 - ts) / 60));
    if (min < 1) return tr('ahora mismo');
    if (min < 60) return tr('hace ' + min + ' min');
    const h = Math.round(min / 60);
    return h < 48 ? tr('hace ' + h + ' h') : tr('hace ' + Math.round(h / 24) + ' d');
  }

  async function ajusteSync(caja) {
    caja.innerHTML = '';
    const d = await fetch('/api/plus/sync').then(r => r.json()).catch(() => null);
    if (!d) return;
    if (!d.carpeta) {
      caja.append(el('small', '', 'Primero activa la copia en la nube (botón ☁ de la lista): la sincronización usa esa misma carpeta.'));
      return;
    }
    const otros = d.equipos || [];
    const txt = otros.length
      ? tr('Otros PCs con Miraru en tu nube') + ': ' + otros.map(o => o.equipo).join(', ')
      : tr('Aún no hay otro PC con Miraru en tu nube. Instálalo en el otro PC con la misma nube y aparecerá aquí.');
    const info = el('small'); info.textContent = txt; info.setAttribute('data-no-i18n', '');
    caja.append(info);
    const u = d.ultima || {};
    if (d.activa && u.ts) {
      const l = el('small');
      l.setAttribute('data-no-i18n', '');
      l.textContent = tr('Última sincronización') + ': ' + _hace(u.ts) + ' · ' + (u.anadidos || 0) + ' ' + tr('añadidos') +
                      ', ' + (u.actualizados || 0) + ' ' + tr('actualizados');
      caja.append(l);
    }
    const fila = el('div'); fila.style.marginTop = '8px';
    if (d.activa) {
      fila.append(boton('🔄 Sincronizar ahora', 'p', async (e) => {
        e.target.disabled = true;
        const r = await post('/api/plus/sync/ahora');
        aviso(r.ok ? '🔄 Lista sincronizada' : 'No se pudo sincronizar', r.ok ? 'ok' : 'err');
        ajusteSync(caja);
      }), boton('Apagar', '', async () => { await post('/api/plus/sync', {activa: false}); ajusteSync(caja); }));
    } else {
      fila.append(boton('🔄 Activar la sincronización', 'p', async () => {
        await post('/api/plus/sync', {activa: true}); ajusteSync(caja);
      }));
    }
    caja.append(fila);
  }

  const ENLACES = {
    stats: ['Ver mis estadísticas', '/stats#avanzadas'],
    wrapped: ['Ver «Mi año en anime»', '/stats#mi-ano'],
    temas: ['Elegir un tema', null],
    saltar: ['Cómo se activa', '/app#extension'],
  };

  // ── Ventana ───────────────────────────────────────────────────────────────
  async function abrir(foco) {
    if (document.getElementById('mplus')) return;
    css();
    const d = (await estado(true)) || _datos;
    if (!d) { aviso('No se pudo cargar Miraru Plus', 'err'); return; }
    const fondo = el('div', 'mplus-fondo');
    fondo.id = 'mplus';
    const caja = el('div', 'mplus');
    caja.setAttribute('role', 'dialog');
    caja.setAttribute('aria-modal', 'true');
    caja.setAttribute('aria-labelledby', 'mplus-t');
    const cerrar = () => { fondo.remove(); document.removeEventListener('keydown', esc); };
    const esc = e => { if (e.key === 'Escape') cerrar(); };
    fondo.addEventListener('click', e => { if (e.target === fondo) cerrar(); });
    document.addEventListener('keydown', esc);

    const cab = el('div', 'mplus-cab');
    const h = el('h2'); h.id = 'mplus-t';
    h.append(document.createTextNode('Miraru '), el('span', '', 'Plus'), document.createTextNode(' ✨'));
    h.setAttribute('data-no-i18n', '');
    const x = el('button', 'mplus-x', '×'); x.type = 'button'; x.setAttribute('aria-label', tr('Cerrar')); x.onclick = cerrar;
    cab.append(h, el('p', '', d.plus ? 'Gracias por apoyar Miraru. Esto es lo que tienes:'
                                     : 'Lo de siempre sigue gratis. Plus añade esto y ayuda a que Miraru siga creciendo.'), x);
    if (d.plus) {
      const ins = el('span', 'mplus-insignia');
      ins.textContent = '✓ ' + tr(d.fuente === 'desarrollo' ? 'Plus activo (versión de desarrollo)'
        : d.plan === 'anual' ? 'Plus activo · plan anual' : d.plan === 'mensual' ? 'Plus activo · plan mensual' : 'Plus activo');
      ins.setAttribute('data-no-i18n', '');
      cab.append(ins);
    }
    const cuerpo = el('div', 'mplus-cuerpo');
    const lista = el('ul', 'mplus-ventajas');
    (d.ventajas || []).forEach(v => {
      const li = el('li', 'mplus-v' + (v.id === foco ? ' foco' : ''));
      li.dataset.id = v.id;
      const t = el('div');
      t.append(el('b', '', v.titulo), el('small', '', v.texto));
      li.append(el('span', 'i', v.icono), t);
      if (d.plus) {
        const aj = el('div', 'ajuste');
        if (v.id === 'movil') ajusteMovil(aj);
        else if (v.id === 'sync') ajusteSync(aj);
        else if (ENLACES[v.id]) {
          const [txt, url] = ENLACES[v.id];
          aj.append(boton(txt, '', () => {
            if (url) { cerrar(); location.href = url; }
            else { cerrar(); window.MiraruTheme && window.MiraruTheme.open(); }
          }));
        }
        li.append(aj);
      }
      lista.append(li);
    });
    cuerpo.append(lista);

    if (!d.plus) {
      let plan = 'anual';
      const planes = el('div', 'mplus-planes');
      const tarjeta = (id, nombre, precio, extra) => {
        const b = el('button', 'mplus-plan'); b.type = 'button';
        b.setAttribute('aria-pressed', String(id === plan));
        b.append(el('span', 'n', nombre));
        const p = el('span', 'p'); p.textContent = precio; p.setAttribute('data-no-i18n', '');
        b.append(p);
        if (extra) b.append(el('span', 'e', extra));
        b.onclick = () => { plan = id; planes.querySelectorAll('.mplus-plan').forEach(x => x.setAttribute('aria-pressed', String(x === b))); };
        return b;
      };
      planes.append(tarjeta('mensual', 'Mensual', d.precios.mensual),
                    tarjeta('anual', 'Anual', d.precios.anual, 'Ahorras un 33 %'));
      if (!d.se_puede_comprar) {
        cuerpo.append(el('div', 'mplus-aviso',
          'Plus se compra en la Microsoft Store. Este Miraru no está instalado desde la Store: instálalo desde allí (tu lista se queda) y podrás activarlo.'));
      }
      const comprar = el('button', 'mplus-comprar', d.se_puede_comprar ? 'Hazte Plus' : 'Abrir Miraru en la Microsoft Store');
      comprar.type = 'button';
      comprar.onclick = async () => {
        comprar.disabled = true;
        const r = await post('/api/plus/comprar', {plan});
        comprar.disabled = false;
        if (r.ok && r.d && r.d.estado && r.d.estado.plus) {
          _guardar(r.d.estado);
          aviso('✨ ¡Bienvenido a Miraru Plus!');
          cerrar(); abrir();
        } else if (r.ok && r.d && r.d.modo !== 'store') {
          aviso('Se ha abierto la Microsoft Store');
        }
      };
      cuerpo.append(planes, comprar,
        el('p', 'mplus-nota', 'Pago seguro con la Microsoft Store. Cancela cuando quieras desde tu cuenta de Microsoft.'));
      if (d.se_puede_comprar) {
        cuerpo.append(boton('Ya lo compré: comprobar', '', async () => {
          const r = await post('/api/plus/refrescar');
          if (r.d) _guardar(r.d);
          if (r.d && r.d.plus) { cerrar(); abrir(); } else aviso('Aún no aparece la compra. Prueba en un minuto.', 'err');
        }));
      }
    }
    caja.append(cab, cuerpo);
    fondo.append(caja);
    document.body.append(fondo);
    x.focus();
    const f = foco && lista.querySelector('.foco');
    if (f) f.scrollIntoView({block: 'nearest'});
  }

  function candado(nodo, id) {
    if (!nodo || es()) return false;
    if (!nodo.querySelector('.mplus-candado')) {
      const c = el('span', 'mplus-candado', '🔒');
      c.title = tr('Miraru Plus');
      nodo.append(c);
    }
    nodo.addEventListener('click', e => { if (!es()) { e.preventDefault(); e.stopPropagation(); abrir(id); } }, true);
    return true;
  }

  window.MiraruPlus = {es, estado, abrir, candado};
  // Estado al día al cargar la página (barato: no pregunta a la Store cada vez).
  estado();
  function porHash() {
    if (location.hash !== '#plus' && !location.hash.startsWith('#plus=')) return;
    const foco = location.hash.split('=')[1];
    history.replaceState(null, '', location.pathname + location.search);
    setTimeout(() => abrir(foco), 400);
  }
  window.addEventListener('hashchange', porHash);
  porHash();
})();
