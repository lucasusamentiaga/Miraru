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
// (/ver/<anime>-<número>). Lo que no es anime de AniList no se apunta.
(function () {
  'use strict';

  const AUTO_SEG = 15 * 60;
  const EN_PRUEBAS = typeof module !== 'undefined';

  // /ver/tokyo-revengers-seiya-kessen-hen-7 → episodio 7
  function leerAnimeFLV(url, doc) {
    let u;
    try { u = new URL(url); } catch (_) { return null; }
    const m = u.pathname.match(/^\/ver\/(.+)-(\d{1,5})\/?$/);
    if (!m) return null;
    const episodio = Number(m[2]);
    let serie = '';
    const h = doc && doc.querySelector('.CapiTop h1, h1.Title, .Title-Episodio h1');
    if (h) serie = h.textContent.trim();
    if (!serie && doc && doc.title) serie = doc.title.replace(/\s+(Episodio|Capítulo|Cap\.?)\s+\d+.*$/i, '').replace(/\s*[-|]\s*AnimeFLV.*$/i, '').trim();
    if (!serie) serie = m[1].replace(/-/g, ' ');           // el nombre de la dirección, como último recurso
    if (!episodio) return null;
    return {servicio: 'animeflv', serie, temporada: 1, episodio};
  }

  if (EN_PRUEBAS) {
    module.exports = {leerAnimeFLV};
    return;
  }

  const datos = () => leerAnimeFLV(location.href, document);
  if (!datos()) return;

  // ── La pastilla (en un shadow DOM: los estilos de AnimeFLV no la tocan) ──
  const caja = document.createElement('div');
  caja.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483647';
  const sombra = caja.attachShadow({mode: 'closed'});
  sombra.innerHTML = `<style>
    .p{display:flex;align-items:center;gap:8px;font:600 12.5px/1.2 "Segoe UI",system-ui,sans-serif;color:#edecf4;
       background:rgba(20,16,32,.94);border:1px solid rgba(124,58,237,.55);border-radius:99px;padding:6px 6px 6px 12px;
       box-shadow:0 8px 28px rgba(0,0,0,.45);backdrop-filter:blur(8px)}
    .p b{color:#c4b1ff;font-weight:700}
    button{font:inherit;border:0;border-radius:99px;padding:6px 11px;cursor:pointer;color:#fff;background:#7c3aed}
    button.sec{background:rgba(255,255,255,.1)}
    button:hover{filter:brightness(1.15)}
    button:focus-visible{outline:2px solid #c4b1ff;outline-offset:2px}
    .x{background:none;padding:4px 7px;color:#a09cb5}
  </style><div class="p" role="status"><span id="t"></span><button id="b" type="button"></button><button class="x" id="x" type="button" aria-label="Ocultar">✕</button></div>`;
  const $ = id => sombra.getElementById(id);
  let estado = 'listo';          // listo → apuntado → deshecho (→ listo)
  function pintar(texto) {
    const d = datos();
    $('t').innerHTML = '';
    const b = document.createElement('b'); b.textContent = 'Miraru';
    $('t').append(b, ' · ' + (texto || ('Ep ' + d.episodio)));
    $('b').textContent = estado === 'apuntado' ? 'Deshacer' : '✓ Marcar visto';
    $('b').className = estado === 'apuntado' ? 'sec' : '';
  }
  function enviar(accion) {
    const d = datos();
    if (!d) return;
    chrome.runtime.sendMessage({tipo: accion === 'desmarcar' ? 'streaming-desmarcar' : 'streaming-visto', datos: d})
      .catch(() => {});
  }
  function apuntar(auto) {
    if (estado === 'apuntado') return;
    estado = 'apuntado';
    enviar('marcar');
    pintar((auto ? 'Apuntado solo: ep ' : 'Apuntado: ep ') + datos().episodio);
  }
  $('b').addEventListener('click', () => {
    if (estado === 'apuntado') {
      estado = 'deshecho';
      enviar('desmarcar');
      pintar('Deshecho: ep ' + datos().episodio + ' sin ver');
    } else {
      apuntar(false);
    }
  });
  $('x').addEventListener('click', () => { caja.remove(); });
  pintar();
  (document.body || document.documentElement).appendChild(caja);

  // ── Automático: tiempo con el reproductor en marcha ────────────────────────
  // Al pulsar dentro del reproductor (un marco), el foco pasa a ese marco: es
  // la mejor señal que tiene la página de que lo estás viendo.
  let segundos = 0;
  setInterval(() => {
    if (estado !== 'listo') return;          // ya apuntado, o lo deshiciste: no insistir
    const viendo = document.visibilityState === 'visible' &&
      (document.activeElement && document.activeElement.tagName === 'IFRAME' || document.fullscreenElement);
    if (viendo) segundos += 5;
    if (segundos >= AUTO_SEG) apuntar(true);
  }, 5000);
})();
