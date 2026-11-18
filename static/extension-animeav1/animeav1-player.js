// Miraru — AnimeAV1: «Saltar opening» y «Siguiente episodio automático» (v1.8).
//
// En la página del episodio (animeav1.com/media/<anime>/<n>):
// - Pone dos interruptores debajo del vídeo: Saltar opening y Siguiente
//   automático (se recuerdan; también están en Ajustes de la extensión).
// - Busca en AniSkip (base de datos abierta de la comunidad, por el id de
//   MyAnimeList que da la propia página) cuándo empiezan y acaban el opening y
//   el ending de ese episodio.
// - Se lo pasa al reproductor (reproductor.js, dentro del marco del vídeo),
//   que es quien salta y enseña los botones (también a pantalla completa).
// - Cuando el reproductor avisa de que el ending lleva 2 s, marca el episodio
//   como visto en AnimeAV1 (si quieres; así se apunta en Miraru) y pasa al
//   siguiente.
(function () {
  'use strict';
  const EN_PRUEBAS = typeof module !== 'undefined';

  // AniSkip → {op: [inicio, fin] | null, ed: [inicio, fin] | null}
  function leerAniSkip(j) {
    const out = {op: null, ed: null};
    for (const r of (j && j.results) || []) {
      const i = r.interval || {};
      const tramo = [Number(i.startTime ?? i.start_time), Number(i.endTime ?? i.end_time)];
      if (!(tramo[1] > tramo[0])) continue;
      const tipo = r.skipType || r.skip_type;
      if ((tipo === 'op' || tipo === 'mixed-op') && !out.op) out.op = tramo;
      if ((tipo === 'ed' || tipo === 'mixed-ed') && !out.ed) out.ed = tramo;
    }
    return out;
  }

  // Datos de SvelteKit (__data.json): el id de MyAnimeList y cuántos episodios hay.
  function leerMedia(j) {
    for (const n of (j && j.nodes) || []) {
      const d = n && n.data;
      if (!Array.isArray(d) || !d[0] || d[0].media == null) continue;
      const m = d[d[0].media];
      if (!m || typeof m !== 'object') continue;
      const val = k => (m[k] != null ? d[m[k]] : null);
      return {malId: Number(val('malId')) || 0, episodios: Number(val('episodesCount')) || 0};
    }
    return {malId: 0, episodios: 0};
  }

  if (EN_PRUEBAS) {
    module.exports = {leerAniSkip, leerMedia};
    return;
  }

  const I18N = self.MiraruI18n || null;
  const tr = (s, v) => (I18N ? I18N.tr(s, v) : s.replace(/\{(\w)\}/g, (_, k) => (v || {})[k] ?? ''));
  const ORIGEN_REPRODUCTOR = /^https:\/\/([\w-]+\.)*zilla-networks\.com$/;
  const AJUSTES = {saltarOpening: false, siguienteAuto: false, marcarAlPasar: true};

  let estado = null;              // datos del episodio actual
  let ajustes = Object.assign({}, AJUSTES);

  function enUrl() {
    const m = location.pathname.match(/^\/media\/([^/]+)\/(\d+)\/?$/);
    return m ? {slug: m[1], ep: Number(m[2])} : null;
  }

  async function cargarAjustes() {
    try { ajustes = Object.assign({}, AJUSTES, (await chrome.storage.local.get('av1Reproductor')).av1Reproductor || {}); }
    catch (_) { /* nada */ }
  }

  async function preparar() {
    const u = enUrl();
    if (!u) { estado = null; return; }
    const yo = estado = {slug: u.slug, ep: u.ep, malId: 0, episodios: 0, op: null, ed: null, listo: false};
    pintarBarra();                // «Buscando tiempos…» mientras tanto
    try {
      const j = await (await fetch(`/media/${u.slug}/${u.ep}/__data.json`, {cache: 'no-store'})).json();
      Object.assign(yo, leerMedia(j));
    } catch (_) { /* sin datos: sin AniSkip */ }
    if (yo.malId) {
      try {
        const r = await fetch(`https://api.aniskip.com/v2/skip-times/${yo.malId}/${u.ep}?types[]=op&types[]=ed&types[]=mixed-op&types[]=mixed-ed&episodeLength=0`);
        if (r.ok) Object.assign(yo, leerAniSkip(await r.json()));
      } catch (_) { /* AniSkip no contesta */ }
    }
    yo.listo = true;
    if (estado === yo) { pintarBarra(); mandarConfig(); }
  }

  function siguienteUrl() {
    if (!estado) return '';
    if (estado.episodios && estado.ep >= estado.episodios) return '';
    const a = [...document.querySelectorAll('a[href]')].find(x => /^\s*Siguiente\s*$/i.test(x.textContent || ''));
    if (a) return a.href;
    return estado.episodios ? `${location.origin}/media/${estado.slug}/${estado.ep + 1}` : '';
  }

  // ── Hablar con el reproductor (marco del vídeo) ───────────────────────────
  function marcoReproductor() {
    return [...document.querySelectorAll('iframe')].find(f => /zilla-networks\.com/.test(f.src || ''));
  }
  function mandarConfig() {
    const f = marcoReproductor();
    if (!f || !f.contentWindow || !estado || !estado.listo) return;
    let seguir = false;
    try { seguir = sessionStorage.getItem('miraru-seguir') === String(estado.ep); sessionStorage.removeItem('miraru-seguir'); } catch (_) { /* nada */ }
    f.contentWindow.postMessage({miraru: 'config', op: estado.op, ed: estado.ed,
      saltar: !!ajustes.saltarOpening, auto: !!ajustes.siguienteAuto, haySiguiente: !!siguienteUrl(),
      reproducir: seguir,
      textos: {saltar: tr('Saltar opening'), saltarSin: tr('Saltar opening · +85 s'), saltado: tr('Opening saltado'),
               verOp: tr('Ver opening'), siguiente: tr('Siguiente episodio'), en: tr('Episodio {e}', {e: estado.ep + 1}),
               cancelar: tr('Cancelar'), pasando: tr('Pasando al siguiente…')}}, '*');
  }

  window.addEventListener('message', async e => {
    if (!ORIGEN_REPRODUCTOR.test(e.origin) || !e.data || typeof e.data !== 'object') return;
    if (e.data.miraru === 'hola') mandarConfig();
    if (e.data.miraru === 'siguiente') pasarAlSiguiente();
  });

  let pasando = false;
  async function pasarAlSiguiente() {
    if (pasando || !estado) return;
    const url = siguienteUrl();
    if (!url) return;
    pasando = true;
    // Marcar como visto en AnimeAV1 (y así en Miraru), si no lo estaba ya.
    if (ajustes.marcarAlPasar) {
      // El botón del ojo: «Marcar como visto» (en el texto, aria-label o title).
      // Si ya está visto dice «…no visto» y no se toca.
      const nombre = x => ((x.textContent || '').trim() || x.getAttribute('aria-label') || x.title || '').trim();
      const b = [...document.querySelectorAll('button')].find(x => /^Marcar como visto$/i.test(nombre(x)));
      if (b) { b.click(); await new Promise(r => setTimeout(r, 1500)); }
    }
    try { sessionStorage.setItem('miraru-seguir', String(estado.ep + 1)); } catch (_) { /* nada */ }
    location.href = url;
  }

  // ── Interruptores debajo del vídeo ────────────────────────────────────────
  // Visten como los botones de AnimeAV1 (8 px, 40 px de alto, su gris y su
  // letra), para que parezcan de la página; el violeta de Miraru solo marca lo
  // que está encendido.
  const ICONO_OP = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5.5v13l8.5-6.5z"/><path d="M13 5.5v13l8.5-6.5z"/></svg>';
  const ICONO_SIG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5.5v13l9.5-6.5z"/><rect x="16.5" y="5.5" width="2.5" height="13" rx="1"/></svg>';
  const mmss = s => { s = Math.max(0, Math.round(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

  let barra = null;
  function pintarBarra() {
    const f = marcoReproductor();
    if (!f) return;
    if (!barra || !document.contains(barra.host)) {
      const host = document.createElement('div');
      host.style.cssText = 'display:block;margin:12px 0 4px';
      const sombra = host.attachShadow({mode: 'open'});
      sombra.innerHTML = `<style>
        :host{all:initial;display:block}
        .b{display:flex;flex-wrap:wrap;align-items:center;gap:8px;
          font:500 14px/1 Satoshi,"Segoe UI",system-ui,sans-serif;color:#a7acd1;-webkit-font-smoothing:antialiased}
        .marca{display:inline-flex;align-items:center;gap:7px;height:40px;padding:0 6px 0 2px;font-weight:700;color:#c9c3ec}
        .marca img{width:20px;height:20px;border-radius:50%}
        button{all:unset;box-sizing:border-box;display:inline-flex;align-items:center;gap:9px;height:40px;padding:0 10px 0 12px;
          border-radius:8px;cursor:pointer;color:#a7acd1;background:rgba(30,32,44,.6);border:1px solid #30344a;
          transition:background-color .2s cubic-bezier(.22,1,.36,1),border-color .2s cubic-bezier(.22,1,.36,1),color .2s}
        button:hover{color:#e4e2f5;border-color:#454a68;background:rgba(48,52,74,.7)}
        button:active .sw::after{width:16px}
        button:focus-visible{outline:2px solid #a78bfa;outline-offset:2px}
        button svg{width:16px;height:16px;fill:currentColor;flex-shrink:0}
        .sw{position:relative;width:30px;height:18px;border-radius:99px;background:#30344a;flex-shrink:0;margin-left:3px;
          transition:background-color .25s cubic-bezier(.22,1,.36,1)}
        .sw::after{content:"";position:absolute;top:3px;left:3px;width:12px;height:12px;border-radius:99px;background:#878aa8;
          transition:transform .3s cubic-bezier(.22,1,.36,1),width .2s cubic-bezier(.22,1,.36,1),background-color .2s}
        button[aria-checked="true"]{color:#ece8ff;background:rgba(124,58,237,.16);border-color:rgba(139,92,246,.6)}
        button[aria-checked="true"] svg{color:#b69cff}
        button[aria-checked="true"] .sw{background:#7c3aed}
        button[aria-checked="true"] .sw::after{transform:translateX(12px);background:#fff}
        button[aria-checked="true"]:active .sw::after{transform:translateX(8px)}
        .estado{margin-left:auto;display:inline-flex;align-items:center;gap:7px;font-size:13px;color:#878aa8;
          font-variant-numeric:tabular-nums;white-space:nowrap;animation:entra .35s cubic-bezier(.22,1,.36,1) both}
        .estado i{width:6px;height:6px;border-radius:99px;background:currentColor;flex-shrink:0}
        .estado.ok i{background:#a78bfa}
        .estado.aviso i{background:#f5b544}
        .estado.busca i{animation:late 1s ease-in-out infinite alternate}
        .estado b{font-weight:600;color:#c9cce8}
        @keyframes entra{from{opacity:0}}
        @keyframes late{to{opacity:.25}}
        @media (max-width:640px){.estado{margin-left:2px;flex-basis:100%;white-space:normal}}
        @media (prefers-reduced-motion:reduce){button,.sw,.sw::after,.estado,.estado i{transition:none;animation:none}}
      </style><div class="b" role="group" aria-label="Miraru">
        <span class="marca"><img id="logo" alt="">Miraru</span>
        <button type="button" role="switch" id="op">${ICONO_OP}<span id="op-t"></span><span class="sw"></span></button>
        <button type="button" role="switch" id="sig">${ICONO_SIG}<span id="sig-t"></span><span class="sw"></span></button>
        <span class="estado" id="estado" aria-live="polite"><i></i><span id="estado-t"></span></span>
      </div>`;
      try { sombra.getElementById('logo').src = chrome.runtime.getURL('iconos/48.png'); } catch (_) { /* nada */ }
      const alternar = clave => async () => {
        ajustes[clave] = !ajustes[clave];
        pintarBarra(); mandarConfig();
        try { await chrome.storage.local.set({av1Reproductor: ajustes}); } catch (_) { /* nada */ }
      };
      sombra.getElementById('op').addEventListener('click', alternar('saltarOpening'));
      sombra.getElementById('sig').addEventListener('click', alternar('siguienteAuto'));
      const cont = f.closest('div') || f.parentElement;
      (cont.parentElement || cont).insertBefore(host, cont.nextSibling);
      barra = sombra;                       // barra.host = el contenedor
    }
    const op = barra.getElementById('op'), sig = barra.getElementById('sig');
    op.setAttribute('aria-checked', String(!!ajustes.saltarOpening));
    sig.setAttribute('aria-checked', String(!!ajustes.siguienteAuto));
    barra.getElementById('op-t').textContent = tr('Saltar opening');
    barra.getElementById('sig-t').textContent = tr('Siguiente automático');
    op.title = tr('Salta el opening en cuanto empieza');
    sig.title = tr('A los 2 s del ending pasa al siguiente episodio');

    // A la derecha: qué ha encontrado para este episodio.
    const est = barra.getElementById('estado'), txt = barra.getElementById('estado-t');
    let clase = '', html = '';
    const esc = x => String(x).replace(/[&<>]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;'}[c]));
    if (!estado || !estado.listo) { clase = 'busca'; html = esc(tr('Buscando tiempos…')); }
    else if (estado.op) {
      clase = 'ok';
      html = `Opening <b>${mmss(estado.op[0])}–${mmss(estado.op[1])}</b>` +
             (estado.ed ? ` · Ending <b>${mmss(estado.ed[0])}</b>` : '');
    } else { clase = 'aviso'; html = esc(tr('Sin tiempos: el botón salta 85 s')); }
    if (estado && estado.listo && ajustes.siguienteAuto && !siguienteUrl()) html += ' · ' + esc(tr('Último episodio'));
    est.className = 'estado ' + clase;
    if (txt.innerHTML !== html) txt.innerHTML = html;
  }

  // AnimeAV1 cambia de episodio sin recargar la página: se vigila la dirección.
  let urlAntes = '';
  async function vigilar() {
    if (location.href !== urlAntes) {
      urlAntes = location.href;
      pasando = false;
      if (barra && barra.host) { barra.host.remove(); barra = null; }
      await preparar();
    }
    if (estado && !barra) pintarBarra();
  }

  (async () => {
    if (I18N) { try { await I18N.cargar(); } catch (_) { /* nada */ } }
    await cargarAjustes();
    chrome.storage.onChanged.addListener((c, area) => {
      if (area === 'local' && c.av1Reproductor) { cargarAjustes().then(() => { pintarBarra(); mandarConfig(); }); }
    });
    vigilar();
    setInterval(vigilar, 1000);
  })();
})();
