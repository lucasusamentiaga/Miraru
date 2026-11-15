// Miraru — Netflix y Crunchyroll (v1.5; v1.6: Netflix por la ficha del vídeo).
//
// Cuando terminas un episodio (pasado el 80 %), avisa a Miraru con lo que
// enseña la página: el nombre de la serie, la temporada y el episodio. Miraru
// mira en AniList qué anime es y lo apunta; lo que no es anime no se apunta.
// No lee nada más de la página ni de tu cuenta.
//
// Crunchyroll pone el vídeo dentro de un marco (iframe) de otro dominio: ese
// marco solo avisa de «visto» y la página principal pone el nombre.
(function () {
  'use strict';

  // Tras actualizar la extensión, las pestañas ya abiertas se quedan con el
  // script viejo y sin poder hablar con ella: no rompe nada, se ignora.
  function mandar(msg) {
    try { return chrome.runtime.sendMessage(msg).catch(() => {}); } catch (_) { return Promise.resolve(); }
  }

  const UMBRAL = 0.8;          // parte del episodio que tiene que haber pasado
  const MIN_SEG = 240;         // menos de 4 min: avance, tráiler o anuncio
  const EN_PRUEBAS = typeof module !== 'undefined';

  // ── Lectura de lo que enseña cada servicio ─────────────────────────────────
  // «T3:E5», «S3:E5», «St. 3: F. 5», «Temp. 3 Ep. 5», «E5», «Ep. 5»…
  function leerTemporadaEpisodio(texto) {
    const t = String(texto || '');
    let m = t.match(/(?:\bT|\bS|\bSt\.?|\bTemp\.?|\bSaison|\bStaffel|\bSeason)\s*(\d{1,3})\s*[:·,\- ]\s*(?:E|Ep\.?|F\.?|Folge|Episodio|Épisode|Episode)\s*(\d{1,5})/i);
    if (m) return {temporada: +m[1], episodio: +m[2]};
    m = t.match(/(?:^|\s)(?:E|Ep\.?|Episodio|Épisode|Episode|Folge|F\.)\s*(\d{1,5})\b/i);
    if (m) return {temporada: 1, episodio: +m[1]};
    return null;
  }

  // Netflix: en los controles del reproductor, [data-uia="video-title"] tiene
  // <h4>Serie</h4><span>T1:E5</span><span>Título del episodio</span>.
  // Si es una película, solo el nombre.
  function leerNetflix(doc) {
    const caja = doc.querySelector('[data-uia="video-title"]');
    if (!caja) return null;
    const h = caja.querySelector('h4');
    const spans = [...caja.querySelectorAll('span')].map(s => s.textContent.trim()).filter(Boolean);
    const serie = (h ? h.textContent : (spans.length ? '' : caja.textContent)).trim();
    if (!serie) return null;
    const te = spans.map(leerTemporadaEpisodio).find(Boolean);
    if (!te) return {servicio: 'netflix', serie};                     // película
    const tituloEp = spans.find(s => !leerTemporadaEpisodio(s)) || '';
    return {servicio: 'netflix', serie, temporada: te.temporada, episodio: te.episodio, titulo_ep: tituloEp};
  }

  // Crunchyroll: el JSON-LD de la página (TVEpisode) es lo más fiable; si no
  // está, la cabecera de la página.
  function leerCrunchyroll(doc) {
    for (const s of doc.querySelectorAll('script[type="application/ld+json"]')) {
      let j;
      try { j = JSON.parse(s.textContent); } catch (_) { continue; }
      for (const x of [].concat(j, (j && j['@graph']) || [])) {
        if (!x || !/Episode/i.test(String(x['@type'] || ''))) continue;
        const serie = (x.partOfSeries && x.partOfSeries.name) || '';
        const ep = parseInt(x.episodeNumber, 10);
        if (!serie) continue;
        const temp = x.partOfSeason || {};
        return {servicio: 'crunchyroll', serie: String(serie).trim(),
                temporada: parseInt(temp.seasonNumber, 10) || 1,
                temporada_nombre: String(temp.name || '').trim(),
                episodio: ep > 0 ? ep : null, titulo_ep: String(x.name || '').trim()};
      }
    }
    const serieEl = doc.querySelector('a.show-title-link h4, a[href*="/series/"] h4, [data-t="show-title-link"] h4');
    const tituloEl = doc.querySelector('h1.title, h1[class*="title"], [data-t="episode-title"]');
    if (!serieEl || !tituloEl) return null;
    const te = leerTemporadaEpisodio(tituloEl.textContent) || {};
    // Crunchyroll pone la temporada en un desplegable («S3: …») si la hay.
    const tSel = doc.querySelector('[data-t="season-info"], .season-info');
    const tNum = tSel && (tSel.textContent.match(/S(?:eason)?\s*(\d+)/i) || [])[1];
    return {servicio: 'crunchyroll', serie: serieEl.textContent.trim(),
            temporada: +tNum || te.temporada || 1, episodio: te.episodio || null,
            titulo_ep: tituloEl.textContent.trim()};
  }

  // v1.6: Netflix por su propia ficha del vídeo (la que usa su reproductor),
  // con el id de /watch/<id>. No depende de que los controles estén a la
  // vista (Netflix los esconde, y con ellos el nombre). Si falla, la página.
  function leerNetflixMeta(j, id) {
    const v = j && j.video;
    if (!v || !v.title) return null;
    const serie = String(v.title).trim();
    if (v.type === 'movie') return {servicio: 'netflix', serie};
    for (const t of v.seasons || []) {
      for (const e of t.episodes || []) {
        if (String(e.id || e.episodeId) === String(id)) {
          return {servicio: 'netflix', serie, temporada: Number(t.seq) || 1, episodio: Number(e.seq) || null,
                  temporada_nombre: '', titulo_ep: String(e.title || '').trim()};
        }
      }
    }
    return null;
  }

  if (EN_PRUEBAS) {
    module.exports = {leerTemporadaEpisodio, leerNetflix, leerCrunchyroll, leerNetflixMeta};
    return;
  }

  // ── En la página ───────────────────────────────────────────────────────────
  const host = location.hostname;
  const esNetflix = /(^|\.)netflix\.com$/.test(host);
  const esCrunchy = /(^|\.)crunchyroll\.com$/.test(host);
  const enMarco = window.top !== window;
  const leer = () => (esNetflix ? leerNetflix(document) : esCrunchy ? leerCrunchyroll(document) : null);
  const enReproductor = () => esNetflix ? location.pathname.startsWith('/watch/')
                                        : (enMarco || /\/watch\//.test(location.pathname));

  // Netflix esconde los controles (y con ellos el nombre) a los pocos
  // segundos: se guarda lo último que se vio para este vídeo.
  let ultimo = null, ultimoUrl = '';
  function recordar() {
    if (enMarco) return;
    if (location.href !== ultimoUrl) { ultimo = null; ultimoUrl = location.href; }
    const d = leer();
    if (d) ultimo = d;
  }

  // Para enseñar los controles un momento (y leer el nombre) si hace falta.
  function despertarControles() {
    const p = document.querySelector('.watch-video, [data-uia="player"], video');
    if (!p) return;
    const r = p.getBoundingClientRect();
    for (const t of ['mousemove', 'mouseover']) {
      p.dispatchEvent(new MouseEvent(t, {bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2}));
    }
  }

  const fichasNetflix = new Map();     // id de /watch/ → lo leído de su ficha
  async function netflixPorFicha() {
    const id = (location.pathname.match(/\/watch\/(\d+)/) || [])[1];
    if (!id) return null;
    if (fichasNetflix.has(id)) return fichasNetflix.get(id);
    let d = null;
    try {
      const r = await fetch('/nq/website/memberapi/release/metadata?movieid=' + id, {credentials: 'include'});
      if (r.ok) d = leerNetflixMeta(await r.json(), id);
    } catch (_) { /* sin ficha: se usa la página */ }
    fichasNetflix.set(id, d);
    return d;
  }

  async function datos() {
    if (esNetflix) {
      const f = await netflixPorFicha();
      if (f) return f;
    }
    recordar();
    if (!ultimo && esNetflix) {
      despertarControles();
      await new Promise(r => setTimeout(r, 700));
      recordar();
    }
    return ultimo;
  }

  const avisados = new Set();     // un aviso por vídeo
  const sinNombre = new Set();    // vídeos de los que ya se avisó que no hay nombre
  let ultimoAhora = 0;
  // v1.6.1: lo que estás viendo ahora (para la ventana de la extensión):
  // nombre, episodio y cuánto llevas. Así se ve si lo ha leído bien ANTES
  // de llegar al final.
  async function avisarAhora(v) {
    if (Date.now() - ultimoAhora < 5000) return;
    ultimoAhora = Date.now();
    const progreso = v && v.duration ? Math.min(1, v.currentTime / v.duration) : null;
    if (enMarco) {
      mandar({tipo: 'streaming-ahora', marco: true, progreso});
      return;
    }
    const d = esNetflix ? (await netflixPorFicha()) || ultimo : ultimo;
    mandar({tipo: 'streaming-ahora', servicio: esNetflix ? 'netflix' : 'crunchyroll',
                                datos: d || null, progreso, umbral: UMBRAL});
  }

  async function vigilar() {
    if (!enReproductor()) return;
    recordar();
    const v = [...document.querySelectorAll('video')].find(x => x.duration > MIN_SEG && isFinite(x.duration));
    if (v && !v.paused) avisarAhora(v);
    else if (!enMarco && !v) avisarAhora(null);
    if (!v || v.currentTime / v.duration < UMBRAL) return;
    const clave = location.href + '|' + Math.round(v.duration);
    if (avisados.has(clave)) return;
    if (enMarco) {
      // El vídeo de Crunchyroll está en un marco: que la página ponga el nombre.
      avisados.add(clave);
      mandar({tipo: 'streaming-visto-marco'});
      return;
    }
    const d = await datos();
    if (d) {
      avisados.add(clave);
      mandar({tipo: 'streaming-visto', datos: d});
    } else if (!sinNombre.has(clave)) {
      // Se sigue intentando en cada vuelta (los controles pueden volver a
      // salir), pero el aviso de «no pude leerlo» solo una vez.
      sinNombre.add(clave);
      mandar({tipo: 'streaming-sin-datos', servicio: esNetflix ? 'netflix' : 'crunchyroll'});
    }
  }

  chrome.runtime.onMessage.addListener((msg, _s, responder) => {
    if (msg && msg.tipo === 'streaming-datos' && !enMarco) {
      datos().then(responder);
      return true;
    }
    return false;
  });

  if (esNetflix) setInterval(() => { if (enReproductor()) netflixPorFicha(); }, 5000);   // leerla pronto
  setInterval(vigilar, 2000);
  setInterval(recordar, 1500);
})();
