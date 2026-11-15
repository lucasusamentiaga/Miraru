const $ = id => document.getElementById(id);

function hace(ms) {
  const s = Math.round((Date.now() - ms) / 1000);
  if (s < 60) return 'hace un momento';
  if (s < 3600) return `hace ${Math.round(s / 60)} min`;
  if (s < 86400) return `hace ${Math.round(s / 3600)} h`;
  return new Date(ms).toLocaleDateString(undefined, {day: 'numeric', month: 'short'});
}

const NOMBRE_SERV = {animeav1: 'AnimeAV1', animeflv: 'AnimeFLV', netflix: 'Netflix', crunchyroll: 'Crunchyroll'};
function pintarServ(el, s) {
  el.hidden = !NOMBRE_SERV[s];
  el.dataset.s = s || '';
  el.textContent = NOMBRE_SERV[s] || '';
}

// «Viendo ahora»: lo que suena en Netflix, Crunchyroll o AnimeFLV (últimos 20 s).
async function pintarAhora() {
  let ahora = null;
  try { ({ahora} = await chrome.storage.session.get('ahora')); } catch (_) { /* nada */ }
  const vivo = ahora && Date.now() - ahora.cuando < 20000;
  $('ahora').hidden = !vivo;
  if (!vivo) return;
  pintarServ($('a-serv'), ahora.servicio);
  const d = ahora.datos;
  const umbral = ahora.umbral || 0.8;
  const p = Math.max(0, Math.min(1, ahora.progreso || 0));
  const apuntado = ahora.estado === 'apuntado' || (ahora.servicio !== 'animeflv' && p >= umbral);
  $('ahora').classList.toggle('listo', apuntado);
  $('ahora').classList.toggle('mal', !d);
  $('a-nombre').textContent = d ? d.serie + (d.episodio ? ` · T${d.temporada || 1}:E${d.episodio}` : ' · película') : 'No leo el nombre del episodio';
  $('a-barra').style.transform = `scaleX(${p})`;
  $('a-marca').style.left = `calc(${umbral * 100}% - 1px)`;
  $('a-marca').hidden = umbral >= 1;
  $('a-txt').textContent = !d
    ? (ahora.servicio === 'netflix' ? 'Mueve el ratón sobre el vídeo para que salga el título.' : 'Abre el episodio desde su página.')
    : apuntado ? '✓ Se apunta en Miraru'
    : ahora.servicio === 'animeflv' ? 'Pulsa «✓ Marcar visto» en la página, o se apunta solo a los 15 min.'
    : `Se apunta al llegar al ${Math.round(umbral * 100)} % (vas por el ${Math.round(p * 100)} %).`;
}

const limpiarTitulo = t => (t || '').replace(/\s*-\s*AnimeAV1\s*$/i, '').replace(/\s+Episodio\s+\d+.*$/i, '');

async function pintar() {
  const {puerto = 8765, ultimo, historial = [], cola = [], fallos = []} =
    await chrome.storage.local.get(['puerto', 'ultimo', 'historial', 'cola', 'fallos']);
  $('puerto').value = puerto;
  const base = `http://127.0.0.1:${puerto}`;
  $('abrir').href = base + '/app';

  let abierto = false;
  try {
    const r = await fetch(base + '/api/health', {cache: 'no-store'});
    const d = await r.json();
    abierto = true;
    $('pastilla').className = 'pastilla ok';
    $('pastilla-txt').textContent = 'Miraru ' + (d.version || '');
  } catch (_) {
    $('pastilla').className = 'pastilla mal';
    $('pastilla-txt').textContent = 'Cerrado';
  }
  $('cerrado').hidden = abierto;

  // Cerrado + pendientes: un solo aviso.
  if (!abierto && cola.length) {
    $('cerrado').textContent = cola.length === 1
      ? 'Miraru está cerrado. 1 episodio te espera: se apuntará al abrirlo.'
      : `Miraru está cerrado. ${cola.length} episodios te esperan: se apuntarán al abrirlo.`;
  }
  $('pendientes').hidden = !cola.length || !abierto;
  $('pendientes').textContent = cola.length === 1
    ? '1 episodio esperando a Miraru: se apuntará al abrirlo.'
    : `${cola.length} episodios esperando a Miraru: se apuntarán al abrirlo.`;
  $('reintentar').hidden = !(cola.length && abierto);

  // Último fallo, solo si es más reciente que el último acierto.
  const f = fallos[0];
  const conFallo = f && (!ultimo || f.cuando > ultimo.cuando);
  $('fallo').hidden = !conFallo;
  if (conFallo) $('fallo').textContent = `⚠ No se pudo apuntar «${limpiarTitulo(f.titulo)}»: ${f.motivo}`;

  $('u-deshacer').disabled = false;
  $('u-deshacer').textContent = '↩ Deshacer';
  if (ultimo && ultimo.nombre) {
    $('vacio').hidden = true;
    $('ultimo').hidden = false;
    $('u-etq').textContent = ultimo.accion === 'deshecho' ? '↩ Deshecho' : ultimo.accion === 'añadido' ? '＋ Añadido a tu lista' :
      ultimo.estado === 'completado' ? '🏁 ¡Completado!' : '✓ Apuntado en Miraru';
    $('u-nombre').textContent = ultimo.nombre;
    const total = parseInt(ultimo.capitulos, 10);
    // En emisión: lo que ha salido (7 de 7 emitidos, 13 en total), no «7 de 13».
    const emit = Number(ultimo.eps_emitidos) || 0;
    const tope = emit || total;
    const ep = ultimo.episodio ?? '?';
    $('u-ep').textContent = emit
      ? (ep >= emit ? `Episodio ${ep} · ✓ al día` : `Episodio ${ep} de ${emit} emitidos`) + (total > emit ? ` (${total} en total)` : '')
      : 'Episodio ' + ep + (total > 0 ? ' de ' + total : '');
    const fr = tope > 0 ? Math.min(1, (ultimo.episodio || 0) / tope) : 1;
    // Deshacer: Netflix, Crunchyroll y AnimeFLV (en AnimeAV1 se usa su «Marcar como no visto»).
    const puedeDeshacer = ultimo.servicio && ultimo.servicio !== 'animeav1' && ultimo.accion !== 'deshecho' && ultimo.episodio > 0;
    $('u-deshacer').hidden = !puedeDeshacer;
    $('u-deshacer').onclick = async () => {
      const b = $('u-deshacer');
      b.disabled = true; b.textContent = 'Deshaciendo…';
      let r = null;
      try { r = await chrome.runtime.sendMessage({tipo: 'deshacer', nombre: ultimo.nombre, episodio: ultimo.episodio}); } catch (_) {}
      if (!r || !r.ok) {
        b.textContent = (r && r.detalle) || 'No se pudo';
        setTimeout(() => { b.disabled = false; b.textContent = '↩ Deshacer'; }, 2500);
      } else if (r.accion === 'sin cambios') {
        b.textContent = 'Ya habías visto más';          // no se toca: sigues por delante
      } else {
        pintar();
      }
    };
    $('ultimo').classList.toggle('deshecho', ultimo.accion === 'deshecho');
    pintarServ($('u-serv'), ultimo.servicio);
    requestAnimationFrame(() => requestAnimationFrame(() => { $('u-barra').style.transform = `scaleX(${fr})`; }));
    $('u-cuando').textContent = hace(ultimo.cuando);
    if (ultimo.imagen) { $('u-img').src = ultimo.imagen; $('u-img').hidden = false; } else $('u-img').hidden = true;
  }

  // Con avisos arriba, menos historial: la ventana de Chrome no pasa de 600 px.
  const conAvisos = !abierto || cola.length || conFallo;
  const antes = historial.slice(1, conAvisos ? 3 : 5);
  $('hist').hidden = !antes.length;
  $('hist').querySelectorAll('div').forEach(d => d.remove());
  antes.forEach(h => {
    const fila = document.createElement('div');
    const a = document.createElement('span'); a.textContent = h.nombre;
    const b = document.createElement('span'); b.textContent = 'ep ' + (h.episodio ?? '?') + ' · ' + hace(h.cuando);
    if (h.servicio) { a.title = NOMBRE_SERV[h.servicio] || ''; a.className = 'serv-l'; a.dataset.s = h.servicio; }
    fila.append(a, b);
    $('hist').appendChild(fila);
  });
}

// Mis Listas de AnimeAV1 → Miraru
const TXT_LISTAS = {
  'enviado': d => `Enviadas a Miraru ${hace(d.cuando)}${d.total ? ` (${d.total} animes)` : ''}.`,
  'al-dia': d => `Al día · revisadas ${hace(d.cuando)}.`,
  'sin-sesion': () => 'Inicia sesión en AnimeAV1 para traerlas.',
  'miraru-cerrado': () => 'Se mandarán al abrir Miraru.',
  'error': d => 'No se pudo: ' + (d.detalle || 'error') + '.',
};
async function pintarListas() {
  const {listas} = await chrome.storage.local.get('listas');
  if (listas && TXT_LISTAS[listas.estado]) $('listas-txt').textContent = TXT_LISTAS[listas.estado](listas);
}
$('btn-listas').addEventListener('click', async () => {
  const b = $('btn-listas');
  b.disabled = true; b.textContent = 'Leyendo…';
  try { await chrome.runtime.sendMessage('listas'); } catch (_) { /* nada */ }
  b.disabled = false; b.textContent = 'Traer ahora';
  pintarListas();
});
pintarListas();

$('puerto').addEventListener('change', async e => {
  const n = Number(e.target.value);
  if (n > 0 && n < 65536) await chrome.storage.local.set({puerto: n});
  pintar();
});
$('reintentar').addEventListener('click', async () => {
  await chrome.runtime.sendMessage('reintentar');
  pintar();
});
$('guia').addEventListener('click', () => chrome.tabs.create({url: chrome.runtime.getURL('bienvenida.html')}));
// ── v1.6.2: versión nueva de la extensión ──────────────────────────────────
$('mi-version').textContent = chrome.runtime.getManifest().version;
async function pintarActualizacion() {
  const {actualizacion, resultadoActualizacion: res} = await chrome.storage.local.get(['actualizacion', 'resultadoActualizacion']);
  const mia = chrome.runtime.getManifest().version;
  $('nueva').hidden = !actualizacion;
  if (actualizacion) {
    $('nv-tit').textContent = `Versión ${actualizacion.version} de la extensión`;
    $('nv-txt').textContent = `Tienes la ${mia}. Se instala en un momento, sin salir de aquí.`;
  }
  // Resultado de la última actualización (se enseña unos minutos).
  const reciente = res && Date.now() - res.cuando < 10 * 60 * 1000;
  $('nv-res').hidden = !reciente;
  if (!reciente) return;
  $('nv-res').className = 'aviso ' + (res.ok ? 'ok' : 'warn');
  $('nv-res').textContent = '';
  if (res.ok) {
    $('nv-res').textContent = `✓ Extensión actualizada a la versión ${res.version}. Recarga las pestañas de Netflix, Crunchyroll o AnimeFLV que tengas abiertas.`;
    return;
  }
  // La recarga no cambió nada: Chrome la tiene cargada desde otra carpeta.
  const p = document.createElement('div');
  p.textContent = `Sigue en la ${res.version}: tu navegador carga la extensión desde otra carpeta. Para que a partir de ahora se actualice sola:`;
  const ol = document.createElement('ol');
  ['Pulsa «Instalar bien» (se abre la página de extensiones).',
   'Quita la extensión de Miraru que tienes ahora.',
   'Activa «Modo de desarrollador», pulsa «Cargar descomprimida» y pega con Ctrl+V.'].forEach(t => {
    const li = document.createElement('li'); li.textContent = t; ol.appendChild(li);
  });
  const b = document.createElement('button');
  b.className = 'btn mini'; b.type = 'button'; b.textContent = 'Instalar bien';
  b.onclick = async () => {
    b.disabled = true;
    try {
      const {puerto = 8765} = await chrome.storage.local.get('puerto');
      const r = await fetch(`http://127.0.0.1:${puerto}/api/extension/preparar`, {method: 'POST'});
      b.textContent = r.ok ? 'Ruta copiada: pégala con Ctrl+V' : 'No se pudo (¿Miraru abierto?)';
    } catch (_) { b.textContent = 'Abre Miraru y vuelve a intentarlo'; }
  };
  $('nv-res').append(p, ol, b);
}
$('nv-btn').addEventListener('click', async () => {
  const b = $('nv-btn');
  b.disabled = true; b.textContent = 'Instalando…';
  let r = null;
  try { r = await chrome.runtime.sendMessage('actualizar-extension'); } catch (_) { /* se recargó: la ventana se cierra */ }
  if (r && !r.ok) {
    b.disabled = false; b.textContent = 'Actualizar';
    $('nv-txt').textContent = r.detalle || 'No se pudo actualizar';
  }
});
$('buscar-act').addEventListener('click', async () => {
  const b = $('buscar-act');
  b.disabled = true; b.textContent = 'Buscando…';
  let v = null;
  try { v = await chrome.runtime.sendMessage('buscar-actualizacion'); } catch (_) { /* nada */ }
  b.disabled = false; b.textContent = v ? 'Hay una nueva ↑' : 'Ya tienes la última';
  pintarActualizacion();
});
pintarActualizacion();
chrome.runtime.sendMessage('buscar-actualizacion').then(pintarActualizacion).catch(() => {});

chrome.storage.onChanged.addListener((_c, area) => { if (area === 'local') { pintar(); pintarActualizacion(); } if (area === 'session') pintarAhora(); });
pintar();
pintarAhora();
setInterval(pintarAhora, 5000);
