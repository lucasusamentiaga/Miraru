// Miraru — AnimeFLV (v1.6).
//
// AnimeFLV pone el vídeo en un reproductor de otra web (un marco), así que la
// extensión no puede saber cuánto llevas visto como en Netflix. En su lugar:
//
// - Una pastilla pequeña abajo a la derecha, en la página del episodio:
//   «✓ Marcar visto» lo apunta en Miraru al momento.
// - Si no la pulsas, se apunta sola cuando llevas 15 minutos con el
//   reproductor en marcha (la pestaña a la vista y el reproductor pulsado).
// - Una vez apuntado, «Deshacer» lo quita (por si te equivocaste de episodio).
//
// Solo lee de la página el nombre del anime y el número del episodio
// (/ver/<anime>-<número>, o …/<anime>-episodio-<número>/ en animeflv.or.at). Lo que no es anime de AniList no se apunta.
(function () {
  'use strict';

  const AUTO_SEG = 15 * 60;
  const EN_PRUEBAS = typeof module !== 'undefined';

  // Dos formas de página de episodio:
  // - animeflv.net:    /ver/tokyo-revengers-seiya-kessen-hen-7
  // - animeflv.or.at:  /2026/11/08/ao-no-hako-season-2-episodio-5/  (v1.6.2)
  //   con un enlace a /anime/ao-no-hako-season-2/ cuyo texto es el nombre.
  const quitarEpisodio = t => String(t || '').replace(/\s+/g, ' ').trim()
    .replace(/\s*[-|–]\s*AnimeFLV.*$/i, '')
    .replace(/\s+(Episodio|Capítulo|Cap\.?|Ep\.?)\s+\d+.*$/i, '')
    .replace(/\s+(Sub Español|Latino|Castellano).*$/i, '').trim();

  function leerAnimeFLV(url, doc) {
    let u;
    try { u = new URL(url); } catch (_) { return null; }
    let slug = '', episodio = 0, m;
    if ((m = u.pathname.match(/^\/ver\/(.+)-(\d{1,5})\/?$/))) {
      slug = m[1]; episodio = Number(m[2]);
    } else if ((m = u.pathname.match(/^\/(?:\d{4}\/\d{1,2}\/\d{1,2}\/)?([^/]+)-episodio-(\d{1,5})\/?$/i))) {
      slug = m[1]; episodio = Number(m[2]);
    }
    if (!episodio) return null;
    let serie = '';
    if (doc) {
      // El enlace a la ficha del anime (su dirección empieza igual que la del episodio).
      const fichas = doc.querySelectorAll ? [...doc.querySelectorAll('a[href*="/anime/"]')] : [];
      const ficha = fichas.find(a => {
        const s = ((a.getAttribute('href') || '').match(/\/anime\/([^/?#]+)/) || [])[1];
        return s && (slug === s || slug.startsWith(s + "-"));
      });
      if (ficha) serie = ficha.textContent.trim();
      if (!serie) {
        const h = doc.querySelector('.CapiTop h1, h1.Title, .Title-Episodio h1');
        if (h) serie = h.textContent.trim();
      }
      if (!serie) {
        const h = doc.querySelector('h1.entry-title');
        if (h) serie = quitarEpisodio(h.textContent);
      }
      if (!serie && doc.title) serie = quitarEpisodio(doc.title);
    }
    if (!serie) serie = slug.replace(/-/g, ' ');           // el nombre de la dirección, como último recurso
    return {servicio: 'animeflv', serie, temporada: 1, episodio};
  }

  if (EN_PRUEBAS) {
    module.exports = {leerAnimeFLV};
    return;
  }

  const datos = () => leerAnimeFLV(location.href, document);
  if (!datos()) return;

  // ── La pastilla (en un shadow DOM: los estilos de AnimeFLV no la tocan) ──
  // v1.6.1: un anillo alrededor del botón enseña cuánto falta para que se
  // apunte sola; se puede plegar (queda solo el punto) y recuerda el pliegue.
  const caja = document.createElement('div');
  caja.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483646';
  const sombra = caja.attachShadow({mode: 'closed'});
  sombra.innerHTML = `<style>
    :host{all:initial}
    .p{--v:#8b5cf6;--v2:#c4b1ff;--ok:#22c55e;display:flex;align-items:center;gap:10px;
       font:500 13px/1.25 "Segoe UI",system-ui,-apple-system,sans-serif;color:#edecf4;
       background:#16121f;border:1px solid #3a3258;border-radius:999px;padding:5px 6px 5px 5px;
       box-shadow:0 6px 8px -2px rgba(0,0,0,.5);
       animation:entra .5s cubic-bezier(.16,1,.3,1) both}
    @keyframes entra{from{opacity:0;transform:translateY(10px)}}
    .anillo{position:relative;width:34px;height:34px;flex-shrink:0;border:0;padding:0;background:none;cursor:pointer;border-radius:50%}
    .anillo svg{position:absolute;inset:0;transform:rotate(-90deg)}
    .anillo circle{fill:none;stroke-width:3}
    .anillo .fondo{stroke:#2b2542}
    .anillo .av{stroke:var(--v);stroke-linecap:round;stroke-dasharray:94.25;stroke-dashoffset:94.25;transition:stroke-dashoffset .6s cubic-bezier(.22,1,.36,1),stroke .3s}
    .anillo img{position:absolute;inset:6px;width:22px;height:22px;border-radius:50%}
    .ok .anillo .av{stroke:var(--ok)}
    .t{display:flex;flex-direction:column;min-width:0;max-width:210px}
    .t b{font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .t small{font-size:11.5px;color:#a49dc0;white-space:nowrap}
    .ok .t small{color:#86efac}
    button.acc{font:600 12.5px/1 inherit;font-family:inherit;border:0;border-radius:999px;padding:9px 13px;cursor:pointer;color:#fff;background:#7c3aed;
       transition:background-color .2s,transform .15s}
    button.acc:hover{background:#8b4cf0}
    button.acc:active{transform:scale(.96)}
    button.acc.sec{background:#2b2542;color:#edecf4}
    button.acc.sec:hover{background:#3a3258}
    .x{border:0;background:none;color:#8b85a6;cursor:pointer;width:26px;height:26px;border-radius:50%;font-size:14px;line-height:1}
    .x:hover{background:#2b2542;color:#edecf4}
    button:focus-visible{outline:2px solid var(--v2);outline-offset:2px}
    .plegada{padding:4px;gap:0}
    .plegada .t,.plegada .acc,.plegada .x{display:none}
    @media (prefers-reduced-motion:reduce){.p{animation:none}.anillo .av{transition:none}}
  </style><div class="p" id="p" role="group" aria-label="Miraru">
    <button class="anillo" id="anillo" type="button" title="Plegar o abrir Miraru" aria-expanded="true">
      <svg viewBox="0 0 34 34" aria-hidden="true"><circle class="fondo" cx="17" cy="17" r="15"/><circle class="av" id="av" cx="17" cy="17" r="15"/></svg>
      <img id="logo" alt="">
    </button>
    <span class="t"><b id="nombre"></b><small id="sub" aria-live="polite"></small></span>
    <button class="acc" id="b" type="button"></button>
    <button class="x" id="x" type="button" title="Plegar" aria-label="Plegar">–</button>
  </div>`;
  const $ = id => sombra.getElementById(id);
  try { $('logo').src = chrome.runtime.getURL('iconos/48.png'); } catch (_) { $('logo').remove(); }
  let estado = 'listo';          // listo → apuntado → deshecho (→ listo)
  let segundos = 0;
  const minutos = s => Math.max(1, Math.ceil(s / 60));
  function pintar() {
    const d = datos();
    $('nombre').textContent = d.serie;
    $('nombre').title = d.serie;
    $('p').classList.toggle('ok', estado === 'apuntado');
    const ep = 'Ep ' + d.episodio + ' · ';
    if (estado === 'apuntado') $('sub').textContent = ep + '✓ apuntado en Miraru';
    else if (estado === 'deshecho') $('sub').textContent = ep + 'deshecho, sin ver';
    else $('sub').textContent = ep + (segundos > 0 ? `se apunta solo en ${minutos(AUTO_SEG - segundos)} min` : 'se apunta solo a los 15 min');
    $('b').textContent = estado === 'apuntado' ? 'Deshacer' : '✓ Marcar visto';
    $('b').className = 'acc' + (estado === 'apuntado' ? ' sec' : '');
    const fr = estado === 'apuntado' ? 1 : Math.min(1, segundos / AUTO_SEG);
    $('av').style.strokeDashoffset = String(94.25 * (1 - fr));
  }
  function contar() {
    try {
      chrome.runtime.sendMessage({tipo: 'streaming-ahora', servicio: 'animeflv', datos: datos(),
        progreso: estado === 'apuntado' ? 1 : Math.min(1, segundos / AUTO_SEG), umbral: 1, estado}).catch(() => {});
    } catch (_) { /* la extensión se ha recargado: esta página ya no puede hablar con ella */ }
  }
  function enviar(accion) {
    const d = datos();
    if (!d) return;
    try {
      chrome.runtime.sendMessage({tipo: accion === 'desmarcar' ? 'streaming-desmarcar' : 'streaming-visto', datos: d})
        .catch(() => {});
    } catch (_) {
      $('sub').textContent = 'Recarga la página (se actualizó la extensión)';
    }
  }
  function apuntar() {
    if (estado === 'apuntado') return;
    estado = 'apuntado';
    enviar('marcar');
    pintar(); contar();
  }
  $('b').addEventListener('click', () => {
    if (estado === 'apuntado') {
      estado = 'deshecho';
      enviar('desmarcar');
      pintar(); contar();
    } else {
      apuntar();
    }
  });
  const CLAVE = 'miraru-plegada';
  function plegar(si) {
    $('p').classList.toggle('plegada', si);
    $('anillo').setAttribute('aria-expanded', String(!si));
    try { si ? localStorage.setItem(CLAVE, '1') : localStorage.removeItem(CLAVE); } catch (_) { /* nada */ }
  }
  $('x').addEventListener('click', () => plegar(true));
  $('anillo').addEventListener('click', () => plegar(!$('p').classList.contains('plegada')));
  try { if (localStorage.getItem(CLAVE)) plegar(true); } catch (_) { /* nada */ }
  pintar();
  (document.body || document.documentElement).appendChild(caja);

  // ── Automático: tiempo con el reproductor en marcha ────────────────────────
  // El vídeo va en un marco de otra web: la página no sabe si suena. Cuenta
  // como «viendo» desde que pulsas el reproductor (en animeflv.or.at es una
  // imagen con ▶ que luego se cambia por el marco) o el foco entra en el marco,
  // y solo mientras la pestaña está a la vista.
  let jugando = false;
  const enReproductor = (x, y, el) => {
    if (el && el.closest && el.closest('iframe, video, [class*="player" i], [id*="player" i], [class*="play" i], .video, #video')) return true;
    return [...document.querySelectorAll('iframe, video')].some(f => {
      const r = f.getBoundingClientRect();
      return r.width > 200 && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    });
  };
  document.addEventListener('pointerdown', e => {
    if (e.composedPath().includes(caja)) return;                      // la pastilla no cuenta
    if (enReproductor(e.clientX, e.clientY, e.target)) jugando = true;
  }, true);
  window.addEventListener('blur', () => {
    setTimeout(() => { if (document.activeElement && document.activeElement.tagName === 'IFRAME') jugando = true; }, 0);
  });
  setInterval(() => {
    if (estado !== 'listo') return;          // ya apuntado, o lo deshiciste: no insistir
    const viendo = document.visibilityState === 'visible' && (jugando || document.fullscreenElement ||
      (document.activeElement && document.activeElement.tagName === 'IFRAME'));
    if (!viendo) return;
    segundos += 5;
    if (segundos >= AUTO_SEG) apuntar();
    else { pintar(); if (segundos % 15 === 0) contar(); }
  }, 5000);
  contar();
})();
