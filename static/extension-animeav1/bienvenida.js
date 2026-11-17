// Guía de la extensión: cada paso se comprueba solo y se pone en verde.
//
// v1.7: la misma página sirve en dos sitios:
// - dentro de la extensión (chrome-extension://…/bienvenida.html), y
// - en Miraru, con dirección corta: http://127.0.0.1:8765/extension. Ahí no
//   tiene acceso directo a la extensión: le pregunta con mensajes
//   (externally_connectable) y, si no está puesta, ayuda a instalarla.
const $ = id => document.getElementById(id);
const I = self.MiraruI18n;
const tr = (s, v) => I.tr(s, v);
const EN_EXTENSION = location.protocol === 'chrome-extension:';
const NOMBRE_SERV = {animeav1: 'AnimeAV1', animeflv: 'AnimeFLV', netflix: 'Netflix', crunchyroll: 'Crunchyroll'};
let EXT_ID = '';                  // en Miraru: el id que la extensión le dijo

function poner(id, estado, texto) {
  const p = $(id);
  p.classList.remove('ok', 'mal', 'espera');
  if (estado) p.classList.add(estado);
  p.querySelector('.estado').textContent = texto;
}

// ── Puente con la extensión ──────────────────────────────────────────────────
function aExtension(msg) {
  return new Promise(res => {
    if (EN_EXTENSION) {
      if (msg.tipo === 'guia-estado') {
        chrome.storage.local.get(['ultimo', 'idioma', 'idiomaMiraru']).then(d =>
          res({version: chrome.runtime.getManifest().version, ultimo: d.ultimo || null, idioma: d.idioma || '', idiomaMiraru: d.idiomaMiraru || ''}));
      } else if (msg.tipo === 'guia-idioma') {
        chrome.storage.local.set({idioma: msg.idioma}).then(() => res(true));
      } else res(null);
      return;
    }
    const rt = self.chrome && chrome.runtime;
    if (!EXT_ID || !rt || !rt.sendMessage) { res(null); return; }
    try {
      rt.sendMessage(EXT_ID, msg, r => { void (rt.lastError); res(r || null); });
    } catch (_) { res(null); }
  });
}

async function base() {
  if (!EN_EXTENSION) return location.origin;
  const {puerto = 8765} = await chrome.storage.local.get('puerto');
  return `http://127.0.0.1:${puerto}`;
}

// ── Pasos ────────────────────────────────────────────────────────────────────
async function comprobarMiraru() {
  const b = await base();
  $('abrir-miraru').href = b + '/app';
  try {
    const r = await fetch(b + '/api/health', {cache: 'no-store'});
    const d = await r.json();
    poner('p-miraru', 'ok', tr('Conectado con Miraru {v}. Perfecto.', {v: d.version || ''}));
    if (!EN_EXTENSION) {
      try { EXT_ID = ((await (await fetch('/api/extension/version', {cache: 'no-store'})).json()).id) || ''; } catch (_) { /* nada */ }
    }
  } catch (_) {
    poner('p-miraru', 'mal', tr('No encuentro Miraru. Ábrelo en tu PC (como siempre) y esto se pondrá en verde solo.'));
  }
}

let estadoExt = null;
async function comprobarExtension() {
  estadoExt = await aExtension({tipo: 'guia-estado'});
  if (EN_EXTENSION) return estadoExt;
  if (estadoExt) poner('p-ext', 'ok', tr('Instalada (versión {v}).', {v: estadoExt.version}));
  else poner('p-ext', 'mal', tr('Aún no está en este navegador. Pulsa el botón: se abre la página de extensiones y la ruta queda copiada.'));
  $('h-tit').textContent = tr(estadoExt ? '¡Listo! Ya está instalada' : 'Instala la extensión de Miraru');
  document.querySelector('.fiesta').hidden = !estadoExt;
  return estadoExt;
}

// AnimeAV1 es la única que necesita tu sesión (para que «Marcar como visto»
// guarde algo). Las demás no necesitan nada.
function estadoAV1(estado, texto) {
  const viejo = $('s-av1-est');
  const el = document.createElement(estado === 'mal' ? 'a' : 'span');
  el.id = 's-av1-est';
  el.className = 's-est ' + (estado || '');
  el.textContent = texto;
  if (estado === 'mal') { el.href = 'https://animeav1.com'; el.target = '_blank'; el.rel = 'noopener'; el.title = tr('Entra en AnimeAV1 con tu cuenta'); }
  viejo.replaceWith(el);
}
async function comprobarAnimeAV1() {
  let r = '?';
  if (EN_EXTENSION) {
    try {
      const x = await fetch('https://animeav1.com/cuenta/listas/__data.json', {credentials: 'include', cache: 'no-store'});
      if (x.status === 401 || x.status === 403) r = 'no';
      else {
        const j = await x.json();
        r = (!x.ok || (j.nodes || []).some(n => n && n.type === 'error') || j.type === 'error' || j.type === 'redirect') ? 'no' : 'si';
      }
    } catch (_) { r = '?'; }
  } else if (estadoExt) {
    r = (await aExtension({tipo: 'guia-sesion-av1'})) || '?';
  }
  if (r === 'si') estadoAV1('ok', tr('Sesión iniciada'));
  else if (r === 'no') estadoAV1('mal', tr('Inicia sesión →'));
  else estadoAV1('', tr('Sin comprobar'));
}

function pintarResultado(u) {
  if (!u || !u.nombre) return;
  const nuevo = $('resultado').hidden;
  $('resultado').hidden = false;
  $('r-nombre').textContent = u.nombre;
  const total = parseInt(u.capitulos, 10);
  const emit = Number(u.eps_emitidos) || 0;                // en emisión: lo que ha salido
  const tope = emit || total;
  const ep = u.episodio ?? '?';
  $('r-ep').textContent = emit
    ? tr(ep >= emit ? 'Episodio {e} · ✓ al día' : 'Episodio {e} de {t} emitidos', {e: ep, t: emit}) + (total > emit ? ' ' + tr('({t} en total)', {t: total}) : '')
    : tr(total > 0 ? 'Episodio {e} de {t}' : 'Episodio {e}', {e: ep, t: total});
  const fr = tope > 0 ? Math.min(1, (u.episodio || 0) / tope) : 1;
  $('r-serv').hidden = !NOMBRE_SERV[u.servicio];
  $('r-serv').dataset.s = u.servicio || '';
  $('r-serv').textContent = NOMBRE_SERV[u.servicio] || '';
  if (nuevo) requestAnimationFrame(() => requestAnimationFrame(() => { $('r-barra').style.transform = `scaleX(${fr})`; }));
  else $('r-barra').style.transform = `scaleX(${fr})`;
  if (u.imagen) { $('r-portada').src = u.imagen; $('r-portada').hidden = false; } else { $('r-portada').hidden = true; }
  poner('p-prueba', 'ok', tr('¡Ya está! A partir de ahora, lo que veas en AnimeAV1, AnimeFLV, Netflix o Crunchyroll aparecerá en Miraru.'));
  document.body.classList.add('celebra');
}

// ── Idioma ───────────────────────────────────────────────────────────────────
async function prepararIdioma() {
  let elegido = '', deMiraru = '';
  if (EN_EXTENSION) {
    await I.cargar();
    ({idioma: elegido = ''} = await chrome.storage.local.get('idioma'));
  } else {
    try { deMiraru = (await (await fetch('/api/lang', {cache: 'no-store'})).json()).lang || ''; } catch (_) { /* nada */ }
    const est = await aExtension({tipo: 'guia-estado'});
    elegido = (est && est.idioma) || '';
    try { elegido = elegido || localStorage.getItem('miraru-ext-idioma') || ''; } catch (_) { /* nada */ }
    I.poner(I.detectar(elegido, deMiraru));
  }
  const sel = $('idioma');
  I.IDIOMAS.forEach(l => { const o = document.createElement('option'); o.value = l; o.textContent = I.NOMBRES[l]; sel.append(o); });
  sel.value = I.lang;
  sel.options[0].remove();
  sel.addEventListener('change', async () => {
    await aExtension({tipo: 'guia-idioma', idioma: sel.value});
    try { localStorage.setItem('miraru-ext-idioma', sel.value); } catch (_) { /* nada */ }
    location.reload();
  });
  I.traducirDom(document.body);
  document.title = 'Miraru — ' + tr('Extensión');
}

// ── Arranque ─────────────────────────────────────────────────────────────────
(async () => {
  if (!EN_EXTENSION) {
    try { EXT_ID = ((await (await fetch('/api/extension/version', {cache: 'no-store'})).json()).id) || ''; } catch (_) { /* nada */ }
  }
  await prepararIdioma();
  await comprobarMiraru();
  if (!EN_EXTENSION) {
    $('p-ext').hidden = false;
    document.querySelectorAll('.n-paso').forEach((n, i) => { n.textContent = String(i + 3); });
    $('instalar').addEventListener('click', async () => {
      const b = $('instalar');
      b.disabled = true;
      try {
        const r = await fetch('/api/extension/preparar', {method: 'POST'});
        b.textContent = tr(r.ok ? 'Ruta copiada: pégala con Ctrl+V' : 'No se pudo (¿Miraru abierto?)');
        $('instalar-ayuda').hidden = !r.ok;
      } catch (_) { b.textContent = tr('Abre Miraru y vuelve a intentarlo'); }
      setTimeout(() => { b.disabled = false; }, 4000);
    });
  }
  poner('p-webs', 'ok', tr('No tienes que hacer nada más que ver tus episodios.'));
  const est = await comprobarExtension();
  pintarResultado(est && est.ultimo);
  comprobarAnimeAV1();
  setInterval(comprobarMiraru, 4000);
  setInterval(comprobarAnimeAV1, 10000);
  if (EN_EXTENSION) {
    chrome.storage.onChanged.addListener((c, area) => {
      if (area === 'local' && c.ultimo) pintarResultado(c.ultimo.newValue);
    });
  } else {
    // Sin acceso directo: se pregunta cada 3 s (lo último apuntado y si ya se instaló).
    setInterval(async () => { const e = await comprobarExtension(); if (e) pintarResultado(e.ultimo); }, 3000);
  }
})();
