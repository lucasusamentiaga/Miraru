// Guía de bienvenida: cada paso se comprueba solo y se pone en verde.
const $ = id => document.getElementById(id);

function poner(id, estado, texto) {
  const p = $(id);
  p.classList.remove('ok', 'mal', 'espera');
  p.classList.add(estado);
  p.querySelector('.estado').textContent = texto;
}

async function base() {
  const {puerto = 8765} = await chrome.storage.local.get('puerto');
  return `http://127.0.0.1:${puerto}`;
}

async function comprobarMiraru() {
  const b = await base();
  $('abrir-miraru').href = b + '/app';
  try {
    const r = await fetch(b + '/api/health', {cache: 'no-store'});
    const d = await r.json();
    poner('p-miraru', 'ok', `Conectado con Miraru ${d.version || ''}. Perfecto.`);
    $('abrir-miraru').textContent = 'Abrir Miraru';
  } catch (_) {
    poner('p-miraru', 'mal', 'No encuentro Miraru. Ábrelo en tu PC (como siempre) y esto se pondrá en verde solo.');
  }
}

// AnimeAV1 es la única que necesita tu sesión (para que «Marcar como visto»
// guarde algo). Las demás no necesitan nada: el paso 2 está bien igualmente.
function estadoAV1(estado, texto) {
  const viejo = $('s-av1-est');
  const el = document.createElement(estado === 'mal' ? 'a' : 'span');
  el.id = 's-av1-est';
  el.className = 's-est ' + (estado || '');
  el.textContent = texto;
  if (estado === 'mal') { el.href = 'https://animeav1.com'; el.target = '_blank'; el.rel = 'noopener'; el.title = 'Entra en AnimeAV1 con tu cuenta'; }
  viejo.replaceWith(el);
}

async function comprobarAnimeAV1() {
  try {
    const r = await fetch('https://animeav1.com/cuenta/listas/__data.json', {credentials: 'include', cache: 'no-store'});
    if (r.status === 401 || r.status === 403) { estadoAV1('mal', 'Inicia sesión →'); return; }
    const j = await r.json();
    const error = (j.nodes || []).some(n => n && n.type === 'error') || j.type === 'error' || j.type === 'redirect';
    if (!r.ok || error) estadoAV1('mal', 'Inicia sesión →');
    else estadoAV1('ok', 'Sesión iniciada');
  } catch (_) {
    estadoAV1('', 'Sin comprobar');
  }
}

const NOMBRE_SERV = {animeav1: 'AnimeAV1', animeflv: 'AnimeFLV', netflix: 'Netflix', crunchyroll: 'Crunchyroll'};

function pintarResultado(u) {
  if (!u || !u.nombre) return;
  $('resultado').hidden = false;
  $('r-nombre').textContent = u.nombre;
  const total = parseInt(u.capitulos, 10);
  const emit = Number(u.eps_emitidos) || 0;                // en emisión: lo que ha salido
  const tope = emit || total;
  const ep = u.episodio ?? '?';
  $('r-ep').textContent = emit
    ? (ep >= emit ? `Episodio ${ep} · ✓ al día` : `Episodio ${ep} de ${emit} emitidos`) + (total > emit ? ` (${total} en total)` : '')
    : 'Episodio ' + ep + (total > 0 ? ' de ' + total : '');
  const fr = tope > 0 ? Math.min(1, (u.episodio || 0) / tope) : 1;
  $('r-serv').hidden = !NOMBRE_SERV[u.servicio];
  $('r-serv').dataset.s = u.servicio || '';
  $('r-serv').textContent = NOMBRE_SERV[u.servicio] || '';
  requestAnimationFrame(() => requestAnimationFrame(() => { $('r-barra').style.transform = `scaleX(${fr})`; }));
  if (u.imagen) { $('r-portada').src = u.imagen; $('r-portada').hidden = false; } else { $('r-portada').hidden = true; }
  poner('p-prueba', 'ok', '¡Ya está! A partir de ahora, lo que veas en AnimeAV1, AnimeFLV, Netflix o Crunchyroll aparecerá en Miraru.');
  document.body.classList.add('celebra');
}

poner('p-webs', 'ok', 'No tienes que hacer nada más que ver tus episodios.');
comprobarMiraru();
comprobarAnimeAV1();
setInterval(comprobarMiraru, 3000);
setInterval(comprobarAnimeAV1, 8000);
// Si la prueba se hizo antes de abrir esta página, también cuenta.
chrome.storage.local.get('ultimo').then(({ultimo}) => pintarResultado(ultimo));
chrome.storage.onChanged.addListener((c, area) => {
  if (area === 'local' && c.ultimo) pintarResultado(c.ultimo.newValue);
});
