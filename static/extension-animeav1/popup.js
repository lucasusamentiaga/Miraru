// Ventana de la extensión (v1.7: idiomas, «Guardados» mientras Miraru está cerrado).
const $ = id => document.getElementById(id);
const I = self.MiraruI18n;
const tr = (s, v) => I.tr(s, v);

function hace(ms) {
  const s = Math.round((Date.now() - ms) / 1000);
  if (s < 60) return tr('hace un momento');
  if (s < 3600) return tr('hace {n} min', {n: Math.round(s / 60)});
  if (s < 86400) return tr('hace {n} h', {n: Math.round(s / 3600)});
  return new Date(ms).toLocaleDateString(I.lang, {day: 'numeric', month: 'short'});
}

const NOMBRE_SERV = {animeav1: 'AnimeAV1', animeflv: 'AnimeFLV', netflix: 'Netflix', crunchyroll: 'Crunchyroll'};
function pintarServ(el, s) {
  el.hidden = !NOMBRE_SERV[s];
  el.dataset.s = s || '';
  el.textContent = NOMBRE_SERV[s] || '';
}
const limpiarTitulo = t => (t || '').replace(/\s*-\s*AnimeAV1\s*$/i, '').replace(/\s+Episodio\s+\d+.*$/i, '');

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
  $('a-nombre').textContent = d ? d.serie + (d.episodio ? ` · T${d.temporada || 1}:E${d.episodio}` : ' · ' + tr('película'))
                                : tr('No leo el nombre del episodio');
  $('a-barra').style.transform = `scaleX(${p})`;
  $('a-marca').style.left = `calc(${umbral * 100}% - 1px)`;
  $('a-marca').hidden = umbral >= 1;
  $('a-txt').textContent = !d
    ? tr(ahora.servicio === 'netflix' ? 'Mueve el ratón sobre el vídeo para que salga el título.' : 'Abre el episodio desde su página.')
    : apuntado ? tr('✓ Se apunta en Miraru')
    : ahora.servicio === 'animeflv' ? tr('Pulsa «✓ Marcar visto» en la página, o se apunta solo a los 15 min.')
    : tr('Se apunta al llegar al {u} % (vas por el {p} %).', {u: Math.round(umbral * 100), p: Math.round(p * 100)});
}

// «Guardados»: lo que espera en la extensión a que Miraru esté abierto.
function etiquetaEvento(e) {
  const serv = e.servicio || 'animeav1';
  let nombre = e.serie || limpiarTitulo(e.titulo) || ('#' + (e.mediaId || '?'));
  nombre = nombre.replace(/\s·\sT\d+:E\d+$/, '');
  const ep = e.episodio != null ? e.episodio : e.episode;
  const det = e.accion === 'desmarcar' ? tr('desmarcar') + (ep != null ? ' · ' + tr('ep {e}', {e: ep}) : '')
            : ep != null ? (e.temporada > 1 ? `T${e.temporada}:E${ep}` : tr('ep {e}', {e: ep})) : '';
  return {serv, nombre, det};
}
function pintarGuardados(cola, abierto, enviando) {
  $('guardados').hidden = !cola.length;
  if (!cola.length) return;
  $('guardados').classList.toggle('cerrado', !abierto);
  $('gd-tit').textContent = tr(cola.length === 1 ? '{n} episodio guardado' : '{n} episodios guardados', {n: cola.length});
  $('gd-txt').textContent = !abierto ? tr('Se subirán solos al abrir Miraru.')
                          : enviando ? tr('Subiendo a Miraru…') : tr('Miraru no contesta: se reintenta solo.');
  $('reintentar').hidden = !abierto || enviando;
  $('gd-barra').hidden = !(abierto && enviando);
  const ul = $('gd-lista');
  ul.textContent = '';
  cola.slice(-4).reverse().forEach(e => {
    const {serv, nombre, det} = etiquetaEvento(e);
    const li = document.createElement('li');
    const a = document.createElement('span'); a.className = 'serv-l'; a.dataset.s = serv; a.textContent = nombre; a.title = NOMBRE_SERV[serv] || '';
    const b = document.createElement('span'); b.textContent = det;
    li.append(a, b);
    ul.append(li);
  });
  if (cola.length > 4) {
    const li = document.createElement('li'); li.className = 'mas';
    li.textContent = tr('y {n} más', {n: cola.length - 4});
    ul.append(li);
  }
}

let abiertoAntes = null;
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
    $('pastilla-txt').textContent = tr('Cerrado');
  }
  // Se acaba de abrir Miraru con cosas guardadas: que se suban ya.
  if (abierto && cola.length && abiertoAntes === false) chrome.runtime.sendMessage('reintentar').catch(() => {});
  abiertoAntes = abierto;
  let enviando = false;
  try { const {enviando: e} = await chrome.storage.session.get('enviando'); enviando = !!e && Date.now() - e < 60000; } catch (_) { /* nada */ }
  pintarGuardados(cola, abierto, abierto && enviando);

  // Último fallo, solo si es más reciente que el último acierto.
  const f = fallos[0];
  const conFallo = f && (!ultimo || f.cuando > ultimo.cuando) && Date.now() - f.cuando < 24 * 3600 * 1000;
  $('fallo').hidden = !conFallo;
  if (conFallo) $('fallo').textContent = tr('⚠ No se pudo apuntar «{t}»: {m}', {t: limpiarTitulo(f.titulo), m: f.motivo});

  $('u-deshacer').disabled = false;
  $('u-deshacer').textContent = tr('↩ Deshacer');
  if (ultimo && ultimo.nombre) {
    $('vacio').hidden = true;
    $('ultimo').hidden = false;
    $('u-etq').textContent = tr(ultimo.accion === 'deshecho' ? '↩ Deshecho' : ultimo.accion === 'añadido' ? '＋ Añadido a tu lista'
      : ultimo.estado === 'completado' ? '🏁 ¡Completado!' : '✓ Apuntado en Miraru');
    $('u-nombre').textContent = ultimo.nombre;
    const total = parseInt(ultimo.capitulos, 10);
    // En emisión: lo que ha salido (7 de 7 emitidos, 13 en total), no «7 de 13».
    const emit = Number(ultimo.eps_emitidos) || 0;
    const tope = emit || total;
    const ep = ultimo.episodio ?? '?';
    $('u-ep').textContent = emit
      ? tr(ep >= emit ? 'Episodio {e} · ✓ al día' : 'Episodio {e} de {t} emitidos', {e: ep, t: emit}) + (total > emit ? ' ' + tr('({t} en total)', {t: total}) : '')
      : tr(total > 0 ? 'Episodio {e} de {t}' : 'Episodio {e}', {e: ep, t: total});
    const fr = tope > 0 ? Math.min(1, (ultimo.episodio || 0) / tope) : 1;
    // Deshacer: Netflix, Crunchyroll y AnimeFLV (en AnimeAV1 se usa su «Marcar como no visto»).
    const puedeDeshacer = ultimo.servicio && ultimo.servicio !== 'animeav1' && ultimo.accion !== 'deshecho' && ultimo.episodio > 0;
    $('u-deshacer').hidden = !puedeDeshacer;
    $('u-deshacer').onclick = async () => {
      const b = $('u-deshacer');
      b.disabled = true; b.textContent = tr('Deshaciendo…');
      let r = null;
      try { r = await chrome.runtime.sendMessage({tipo: 'deshacer', nombre: ultimo.nombre, episodio: ultimo.episodio}); } catch (_) { /* nada */ }
      if (!r || !r.ok) {
        b.textContent = (r && r.detalle) || tr('No se pudo');
        setTimeout(() => { b.disabled = false; b.textContent = tr('↩ Deshacer'); }, 2500);
      } else if (r.accion === 'sin cambios') {
        b.textContent = tr('Ya habías visto más');          // no se toca: sigues por delante
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
  const conAvisos = cola.length || conFallo;
  const antes = historial.slice(1, conAvisos ? 3 : 5);
  $('hist').hidden = !antes.length;
  $('hist').querySelectorAll('div').forEach(d => d.remove());
  antes.forEach(h => {
    const fila = document.createElement('div');
    const a = document.createElement('span'); a.textContent = h.nombre;
    const b = document.createElement('span'); b.textContent = tr('ep {e}', {e: h.episodio ?? '?'}) + ' · ' + hace(h.cuando);
    if (h.servicio) { a.title = NOMBRE_SERV[h.servicio] || ''; a.className = 'serv-l'; a.dataset.s = h.servicio; }
    fila.append(a, b);
    $('hist').appendChild(fila);
  });
}

// Mis Listas de AnimeAV1 → Miraru
const TXT_LISTAS = {
  'enviado': d => tr(d.total ? 'Enviadas a Miraru {h} ({n} animes).' : 'Enviadas a Miraru {h}.', {h: hace(d.cuando), n: d.total}),
  'al-dia': d => tr('Al día · revisadas {h}.', {h: hace(d.cuando)}),
  'sin-sesion': () => tr('Inicia sesión en AnimeAV1 para traerlas.'),
  'miraru-cerrado': () => tr('Se mandarán al abrir Miraru.'),
  'error': d => tr('No se pudo: {d}.', {d: d.detalle || 'error'}),
};
async function pintarListas() {
  const {listas} = await chrome.storage.local.get('listas');
  if (listas && TXT_LISTAS[listas.estado]) $('listas-txt').textContent = TXT_LISTAS[listas.estado](listas);
}

// ── versión nueva de la extensión (v1.6.2) ──────────────────────────────────
async function pintarActualizacion() {
  const {actualizacion, resultadoActualizacion: res} = await chrome.storage.local.get(['actualizacion', 'resultadoActualizacion']);
  const mia = chrome.runtime.getManifest().version;
  $('nueva').hidden = !actualizacion;
  if (actualizacion) {
    $('nv-tit').textContent = tr('Versión {v} de la extensión', {v: actualizacion.version});
    $('nv-txt').textContent = tr('Tienes la {v}. Se instala en un momento, sin salir de aquí.', {v: mia});
  }
  const reciente = res && Date.now() - res.cuando < 10 * 60 * 1000;
  $('nv-res').hidden = !reciente;
  if (!reciente) return;
  $('nv-res').className = 'aviso ' + (res.ok ? 'ok' : 'warn');
  $('nv-res').textContent = '';
  if (res.ok) {
    $('nv-res').textContent = tr('✓ Extensión actualizada a la versión {v}. Recarga las pestañas de Netflix, Crunchyroll o AnimeFLV que tengas abiertas.', {v: res.version});
    return;
  }
  // La recarga no cambió nada: el navegador la tiene cargada desde otra carpeta.
  const p = document.createElement('div');
  p.textContent = tr('Sigue en la {v}: tu navegador carga la extensión desde otra carpeta. Para que a partir de ahora se actualice sola:', {v: res.version});
  const ol = document.createElement('ol');
  ['Pulsa «Instalar bien» (se abre la página de extensiones).',
   'Quita la extensión de Miraru que tienes ahora.',
   'Activa «Modo de desarrollador», pulsa «Cargar descomprimida» y pega con Ctrl+V.'].forEach(t => {
    const li = document.createElement('li'); li.textContent = tr(t); ol.appendChild(li);
  });
  const b = document.createElement('button');
  b.className = 'btn mini'; b.type = 'button'; b.textContent = tr('Instalar bien');
  b.onclick = async () => {
    b.disabled = true;
    try {
      const {puerto = 8765} = await chrome.storage.local.get('puerto');
      const r = await fetch(`http://127.0.0.1:${puerto}/api/extension/preparar`, {method: 'POST'});
      b.textContent = tr(r.ok ? 'Ruta copiada: pégala con Ctrl+V' : 'No se pudo (¿Miraru abierto?)');
    } catch (_) { b.textContent = tr('Abre Miraru y vuelve a intentarlo'); }
  };
  $('nv-res').append(p, ol, b);
}

async function iniciar() {
  await I.cargar();
  I.traducirDom(document.body);
  $('mi-version').textContent = chrome.runtime.getManifest().version;
  const sel = $('idioma');
  I.IDIOMAS.forEach(l => { const o = document.createElement('option'); o.value = l; o.textContent = I.NOMBRES[l]; sel.append(o); });
  const {idioma = ''} = await chrome.storage.local.get('idioma');
  sel.value = idioma;
  sel.addEventListener('change', async () => {
    await chrome.storage.local.set({idioma: sel.value});
    location.reload();
  });

  // AnimeAV1: saltar opening y siguiente automático (v1.8; mismos ajustes que los interruptores de la página)
  const AV1_DEF = {saltarOpening: false, siguienteAuto: false, marcarAlPasar: true};
  const {av1Reproductor = {}} = await chrome.storage.local.get('av1Reproductor');
  const av1 = Object.assign({}, AV1_DEF, av1Reproductor);
  [['av1-op', 'saltarOpening'], ['av1-sig', 'siguienteAuto'], ['av1-marcar', 'marcarAlPasar']].forEach(([id, k]) => {
    $(id).checked = !!av1[k];
    $(id).addEventListener('change', async () => {
      const {av1Reproductor: actual = {}} = await chrome.storage.local.get('av1Reproductor');
      await chrome.storage.local.set({av1Reproductor: Object.assign({}, AV1_DEF, actual, {[k]: $(id).checked})});
    });
  });

  $('btn-listas').addEventListener('click', async () => {
    const b = $('btn-listas');
    b.disabled = true; b.textContent = tr('Leyendo…');
    try { await chrome.runtime.sendMessage('listas'); } catch (_) { /* nada */ }
    b.disabled = false; b.textContent = tr('Traer ahora');
    pintarListas();
  });
  $('puerto').addEventListener('change', async e => {
    const n = Number(e.target.value);
    if (n > 0 && n < 65536) await chrome.storage.local.set({puerto: n});
    pintar();
  });
  $('reintentar').addEventListener('click', async () => {
    $('reintentar').disabled = true;
    try { await chrome.runtime.sendMessage('reintentar'); } catch (_) { /* nada */ }
    $('reintentar').disabled = false;
    pintar();
  });
  // La guía, en Miraru (dirección corta) si está abierto; si no, la de la extensión.
  $('guia').addEventListener('click', async () => {
    const {puerto = 8765} = await chrome.storage.local.get('puerto');
    let url = chrome.runtime.getURL('bienvenida.html');
    try { if ((await fetch(`http://127.0.0.1:${puerto}/api/health`, {cache: 'no-store'})).ok) url = `http://127.0.0.1:${puerto}/extension`; } catch (_) { /* cerrado */ }
    chrome.tabs.create({url});
  });
  $('nv-btn').addEventListener('click', async () => {
    const b = $('nv-btn');
    b.disabled = true; b.textContent = tr('Instalando…');
    let r = null;
    try { r = await chrome.runtime.sendMessage('actualizar-extension'); } catch (_) { /* se recargó: la ventana se cierra */ }
    if (r && !r.ok) {
      b.disabled = false; b.textContent = tr('Actualizar');
      $('nv-txt').textContent = r.detalle ? tr(r.detalle) : tr('No se pudo actualizar');
    }
  });
  $('buscar-act').addEventListener('click', async () => {
    const b = $('buscar-act');
    b.disabled = true; b.textContent = tr('Buscando…');
    let v = null;
    try { v = await chrome.runtime.sendMessage('buscar-actualizacion'); } catch (_) { /* nada */ }
    b.disabled = false; b.textContent = tr(v ? 'Hay una nueva ↑' : 'Ya tienes la última');
    pintarActualizacion();
  });

  chrome.storage.onChanged.addListener((c, area) => {
    if (area === 'local') { pintar(); pintarActualizacion(); if (c.listas) pintarListas(); }
    if (area === 'session') pintarAhora();
  });
  pintar();
  pintarAhora();
  pintarListas();
  pintarActualizacion();
  chrome.runtime.sendMessage('buscar-actualizacion').then(pintarActualizacion).catch(() => {});
  setInterval(pintarAhora, 5000);
  setInterval(pintar, 4000);              // ver cuándo vuelve Miraru y cómo baja la cola
}
iniciar();
