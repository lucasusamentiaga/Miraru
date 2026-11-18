// Miraru — AnimeAV1: «Saltar opening» y «Siguiente episodio automático» (v1.8).
//
// En la página del episodio (animeav1.com/media/<anime>/<n>):
// - Pone dos interruptores debajo del vídeo: ⏭ Saltar opening y ⏩ Siguiente
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
      textos: {saltar: tr('⏭ Saltar opening'), saltarSin: tr('⏭ Saltar opening (+85 s)'), saltado: tr('Opening saltado'),
               siguiente: tr('Siguiente episodio en {s} s'), cancelar: tr('Cancelar'), pasando: tr('Pasando al siguiente…')}}, '*');
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
  let barra = null;
  function pintarBarra() {
    const f = marcoReproductor();
    if (!f) return;
    if (!barra || !document.contains(barra.host)) {
      const host = document.createElement('div');
      host.style.cssText = 'margin:10px 0 2px';
      const sombra = host.attachShadow({mode: 'open'});
      sombra.innerHTML = `<style>
        :host{all:initial;display:block}
        .b{display:flex;flex-wrap:wrap;align-items:center;gap:8px;font:500 13px/1.2 "Segoe UI",system-ui,sans-serif;color:#edecf4}
        .marca{display:inline-flex;align-items:center;gap:7px;font-weight:700;color:#c4b1ff;margin-right:4px}
        .marca img{width:18px;height:18px;border-radius:50%}
        button{display:inline-flex;align-items:center;gap:8px;font:inherit;font-weight:600;cursor:pointer;color:#edecf4;
          background:#1d1829;border:1px solid #3a3258;border-radius:999px;padding:7px 12px 7px 9px;
          transition:background-color .2s cubic-bezier(.22,1,.36,1),border-color .2s}
        button:hover{border-color:#7c3aed}
        button:focus-visible{outline:2px solid #c4b1ff;outline-offset:2px}
        .sw{width:28px;height:16px;border-radius:99px;background:#3a3258;position:relative;transition:background-color .2s;flex-shrink:0}
        .sw::after{content:"";position:absolute;top:2px;left:2px;width:12px;height:12px;border-radius:50%;background:#a49dc0;
          transition:transform .25s cubic-bezier(.22,1,.36,1),background-color .2s}
        button[aria-checked="true"]{background:rgba(124,58,237,.18);border-color:#7c3aed}
        button[aria-checked="true"] .sw{background:#7c3aed}
        button[aria-checked="true"] .sw::after{transform:translateX(12px);background:#fff}
        .nota{font-size:12px;color:#a49dc0}
        @media (prefers-reduced-motion:reduce){button,.sw,.sw::after{transition:none}}
      </style><div class="b" role="group" aria-label="Miraru">
        <span class="marca"><img id="logo" alt="">Miraru</span>
        <button type="button" role="switch" id="op"><span class="sw"></span><span id="op-t"></span></button>
        <button type="button" role="switch" id="sig"><span class="sw"></span><span id="sig-t"></span></button>
        <span class="nota" id="nota"></span>
      </div>`;
      try { sombra.getElementById('logo').src = chrome.runtime.getURL('iconos/48.png'); } catch (_) { /* nada */ }
      const alternar = clave => async () => {
        ajustes[clave] = !ajustes[clave];
        try { await chrome.storage.local.set({av1Reproductor: ajustes}); } catch (_) { /* nada */ }
        pintarBarra(); mandarConfig();
      };
      sombra.getElementById('op').addEventListener('click', alternar('saltarOpening'));
      sombra.getElementById('sig').addEventListener('click', alternar('siguienteAuto'));
      const cont = f.closest('div') || f.parentElement;
      (cont.parentElement || cont).insertBefore(host, cont.nextSibling);
      barra = sombra;                       // barra.host = el contenedor
    }
    barra.getElementById('op').setAttribute('aria-checked', String(!!ajustes.saltarOpening));
    barra.getElementById('sig').setAttribute('aria-checked', String(!!ajustes.siguienteAuto));
    barra.getElementById('op-t').textContent = tr('⏭ Saltar opening');
    barra.getElementById('sig-t').textContent = tr('⏩ Siguiente episodio automático');
    const sinDatos = estado && estado.listo && !estado.op;
    barra.getElementById('nota').textContent = !estado || !estado.listo ? '' :
      sinDatos ? tr('Sin tiempos para este episodio: el botón salta 85 s.') : '';
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
