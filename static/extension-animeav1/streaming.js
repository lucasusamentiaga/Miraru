// Miraru — Netflix y Crunchyroll (v1.5).
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

  if (EN_PRUEBAS) {
    module.exports = {leerTemporadaEpisodio, leerNetflix, leerCrunchyroll};
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

  async function datos() {
    recordar();
    if (!ultimo && esNetflix) {
      despertarControles();
      await new Promise(r => setTimeout(r, 700));
      recordar();
    }
    return ultimo;
  }

  const avisados = new Set();     // un aviso por vídeo
  async function vigilar() {
    if (!enReproductor()) return;
    recordar();
    const v = [...document.querySelectorAll('video')].find(x => x.duration > MIN_SEG && isFinite(x.duration));
    if (!v || v.currentTime / v.duration < UMBRAL) return;
    const clave = location.href + '|' + Math.round(v.duration);
    if (avisados.has(clave)) return;
    avisados.add(clave);
    if (enMarco) {
      // El vídeo de Crunchyroll está en un marco: que la página ponga el nombre.
      chrome.runtime.sendMessage({tipo: 'streaming-visto-marco'}).catch(() => {});
      return;
    }
    const d = await datos();
    if (d) chrome.runtime.sendMessage({tipo: 'streaming-visto', datos: d}).catch(() => {});
    else chrome.runtime.sendMessage({tipo: 'streaming-sin-datos', servicio: esNetflix ? 'netflix' : 'crunchyroll'}).catch(() => {});
  }

  chrome.runtime.onMessage.addListener((msg, _s, responder) => {
    if (msg && msg.tipo === 'streaming-datos' && !enMarco) {
      datos().then(responder);
      return true;
    }
    return false;
  });

  setInterval(vigilar, 2000);
  setInterval(recordar, 1500);
})();
