// Miraru — copia a Miraru, al momento, los episodios que ves en AnimeAV1,
// Netflix, Crunchyroll y AnimeFLV.
//
// AnimeFLV (v1.6): animeflv.js pone una pastilla «✓ Marcar visto» en la
// página del episodio (y lo apunta solo a los 15 min de reproductor), con
// «Deshacer». Va por el mismo camino que Netflix.
//
// Netflix y Crunchyroll (v1.5): streaming.js avisa al terminar un episodio
// (pasado el 80 %) con el nombre de la serie, la temporada y el episodio, y
// aquí se manda a Miraru (/api/streaming/evento), que mira en AniList qué
// anime es. Va por la misma cola: si Miraru está cerrado, se manda después.
//
// Cómo: la web de AnimeAV1, al pulsar «Marcar como visto», hace
//   POST https://animeav1.com/api/user/library  {"mediaId": 123, "episode": 5}
// La extensión solo OBSERVA esa petición (no la toca ni lee nada más) y, si
// AnimeAV1 contesta bien, se lo cuenta a Miraru en tu PC (127.0.0.1:8765).
// Si Miraru está cerrado, lo guarda y lo manda en cuanto vuelva a abrirse.

importScripts('i18n.js');          // v1.7: idiomas
const I18N = self.MiraruI18n;

const URL_LISTA = 'https://*.animeav1.com/api/user/library*';   // *. incluye animeav1.com
const PUERTO_POR_DEFECTO = 8765;
const pendientes = new Map();       // requestId → cuerpo, hasta saber si fue bien

async function puerto() {
  const {puerto} = await chrome.storage.local.get('puerto');
  return Number(puerto) || PUERTO_POR_DEFECTO;
}

function leerCuerpo(details) {
  const raw = details.requestBody && details.requestBody.raw;
  if (!raw || !raw.length) return null;
  try {
    const bytes = raw.map(p => new Uint8Array(p.bytes || []));
    const total = new Uint8Array(bytes.reduce((n, b) => n + b.length, 0));
    let i = 0;
    for (const b of bytes) { total.set(b, i); i += b.length; }
    const j = JSON.parse(new TextDecoder().decode(total));
    return j && typeof j === 'object' && Number(j.mediaId) > 0 ? j : null;
  } catch (_) { return null; }
}

// Chrome puede dormir la extensión entre que sale la petición y llega la
// respuesta: lo pendiente se guarda también en storage.session.
const clavePend = id => 'pend_' + id;

chrome.webRequest.onBeforeRequest.addListener(details => {
  if (details.method !== 'POST') return;
  const cuerpo = leerCuerpo(details);
  if (!cuerpo) return;
  const p = {cuerpo, tabId: details.tabId};
  pendientes.set(details.requestId, p);
  chrome.storage.session.set({[clavePend(details.requestId)]: p}).catch(() => {});
}, {urls: [URL_LISTA]}, ['requestBody']);

async function sacarPendiente(requestId) {
  let p = pendientes.get(requestId);
  pendientes.delete(requestId);
  const k = clavePend(requestId);
  if (!p) { try { p = (await chrome.storage.session.get(k))[k]; } catch (_) { /* nada */ } }
  chrome.storage.session.remove(k).catch(() => {});
  return p;
}

chrome.webRequest.onCompleted.addListener(async details => {
  const p = await sacarPendiente(details.requestId);
  if (!p || details.statusCode >= 400) return;
  const ev = {mediaId: Number(p.cuerpo.mediaId)};
  if ('episode' in p.cuerpo) ev.episode = p.cuerpo.episode == null ? 0 : Number(p.cuerpo.episode);
  if ('status' in p.cuerpo && p.cuerpo.status != null) ev.status = Number(p.cuerpo.status);
  if (!('episode' in ev) && !('status' in ev)) return;   // solo nota o puntuación
  try {
    const tab = p.tabId >= 0 ? await chrome.tabs.get(p.tabId) : null;
    const m = tab && tab.url ? tab.url.match(/animeav1\.com\/media\/([^/?#]+)(?:\/(\d+))?/) : null;
    if (m) ev.slug = decodeURIComponent(m[1]);
    // En la página del episodio N, «Marcar como visto» manda N y «Marcar como no
    // visto» manda el anterior. Así Miraru sabe si es marcar o desmarcar (y dos
    // clics que llegan desordenados no bajan el progreso).
    if (m && m[2] && 'episode' in ev) ev.accion = ev.episode >= Number(m[2]) ? 'marcar' : 'desmarcar';
    if (tab && tab.title) ev.titulo = tab.title.slice(0, 300);
  } catch (_) { /* la pestaña se cerró: Miraru lo resuelve por el id */ }
  await encolar(ev);
  await enviarCola();
}, {urls: [URL_LISTA]});

chrome.webRequest.onErrorOccurred.addListener(d => { sacarPendiente(d.requestId); }, {urls: [URL_LISTA]});

// ── Cola: nada se pierde si Miraru está cerrado ─────────────────────────────
// Cada evento lleva un id propio. Al enviar se relee la cola y solo se quitan
// los enviados: si marcas otro episodio mientras se envía el anterior, no se
// pierde (antes se sobrescribía la cola y ese segundo clic desaparecía).
const MAX_COLA = 1000;             // lo guardado mientras Miraru está cerrado
const CADUCA = 30 * 24 * 3600e3;   // 30 días esperando: se descarta

// Todos los cambios de la cola, de uno en uno: dos clics casi a la vez leían
// la cola vacía a la vez y el segundo pisaba al primero (o al revés).
let candado = Promise.resolve();
function enOrden(fn) {
  const r = candado.then(fn);
  candado = r.catch(() => {});
  return r;
}

function encolar(ev) { return enOrden(() => _encolar(ev)); }
// Netflix/Crunchyroll no tienen mediaId: cada episodio es un evento distinto.
function claveEv(e) {
  if (e.ruta === '/api/streaming/evento') return 'st|' + e.servicio + '|' + e.serie + '|' + e.temporada + '|' + e.episodio;
  return 'av1|' + e.mediaId;
}
async function _encolar(ev) {
  const {cola = []} = await chrome.storage.local.get('cola');
  ev.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  ev.cuando = Date.now();
  ev.intentos = 0;
  const k = claveEv(ev);
  // Deshacer algo que aún no había llegado a Miraru (estaba cerrado): basta
  // con no mandarlo.
  if (ev.accion === 'desmarcar' && ev.ruta === '/api/streaming/evento' &&
      cola.some(e => claveEv(e) === k && e.accion !== 'desmarcar')) {
    await chrome.storage.local.set({cola: cola.filter(e => claveEv(e) !== k)});
    return;
  }
  // Del mismo anime solo importa lo último que hiciste.
  const nueva = cola.filter(e => claveEv(e) !== k || ('status' in e) !== ('status' in ev));
  nueva.push(ev);
  await chrome.storage.local.set({cola: nueva.slice(-MAX_COLA)});
}

// v1.7: lo que no se pudo mandar se queda guardado y se reintenta solo, sin
// límite de intentos (antes se tiraba a la hora), con esperas crecientes si
// Miraru contesta con error (30 s, 1 min, 2 min… hasta 30 min). Solo se
// descarta lo que nunca podrá apuntarse (no es anime, para adultos…) y lo
// que lleva más de 30 días esperando.
function quitarDeCola(hechos, reintentar = []) { return enOrden(() => _quitarDeCola(hechos, reintentar)); }
async function _quitarDeCola(hechos, reintentar) {
  const {cola = []} = await chrome.storage.local.get('cola');
  const r = new Set(reintentar);
  const ahora = Date.now();
  await chrome.storage.local.set({cola: cola
    .filter(e => !hechos.has(e.id) || r.has(e.id))
    .map(e => {
      if (!r.has(e.id)) return e;
      const intentos = (e.intentos || 0) + 1;
      return Object.assign(e, {intentos, siguiente: ahora + Math.min(30 * 60e3, 30e3 * 2 ** Math.min(intentos - 1, 6))});
    })
    .filter(e => ahora - (e.cuando || ahora) < CADUCA)});
}

async function apuntarFallo(ev, motivo) {
  const {fallos = []} = await chrome.storage.local.get('fallos');
  fallos.unshift({cuando: Date.now(), titulo: ev.titulo || ev.serie || ev.slug || ('#' + ev.mediaId),
                  episodio: ev.episode != null ? ev.episode : ev.episodio, motivo});
  await chrome.storage.local.set({fallos: fallos.slice(0, 5)});
}

let enviando = null;
function enviarCola(forzar = false) {
  // Si ya se está enviando, se encadena otra vuelta (no se descarta la petición).
  enviando = (enviando || Promise.resolve()).then(() => enviarUnaVez(forzar)).catch(() => {});
  return enviando;
}

// Icono mientras hay cosas guardadas: el número, en azul (no es un error).
async function marcarGuardados(n) {
  await I18N.cargar();
  if (n > 0) await marcar(n > 99 ? '99+' : String(n), '#2563eb', I18N.tr('Miraru está cerrado: {n} guardado(s), se subirán al abrirlo', {n}));
}

async function enviarUnaVez(forzar = false) {
  const {cola = []} = await chrome.storage.local.get('cola');
  if (!cola.length) return;
  const base = `http://127.0.0.1:${await puerto()}`;
  const hechos = new Set(), reintentar = [];
  const ahora = Date.now();
  await chrome.storage.session.set({enviando: ahora}).catch(() => {});
  try {
    for (const ev of cola) {
      if (!forzar && ev.siguiente && ev.siguiente > ahora) continue;     // esperando su turno
      const {id, cuando, intentos, siguiente, ruta, ...cuerpo} = ev;
      let r;
      try {
        r = await fetch(base + (ruta || '/api/animeav1/evento'), {
          method: 'POST',
          headers: {'Content-Type': 'application/json', 'X-Miraru-Extension': '1'},
          body: JSON.stringify(cuerpo),
        });
      } catch (_) {
        await marcarGuardados(cola.length - hechos.size + reintentar.length);
        break;                       // Miraru cerrado: todo sigue guardado
      }
      hechos.add(id);
      const d = await r.json().catch(() => ({}));
      if (r.ok || r.status === 409) {
        if (r.ok && d.nombre) {
          const ultimo = {cuando: Date.now(), nombre: d.nombre || '', episodio: d.episodios_vistos,
            accion: d.accion || '', estado: d.estado || '', imagen: d.imagen || '', capitulos: d.capitulos || '',
            eps_emitidos: d.eps_emitidos || 0, servicio: ev.servicio || 'animeav1'};
          const {historial = []} = await chrome.storage.local.get('historial');
          await chrome.storage.local.set({ultimo, historial: [ultimo, ...historial.filter(h =>
            !(h.nombre === ultimo.nombre && h.episodio === ultimo.episodio))].slice(0, 8)});
          await I18N.cargar();
          await marcar('✓', '#16a34a', I18N.tr('Apuntado en Miraru: {n}', {n: d.nombre || ''}));
        }
      } else if (r.status >= 500 || r.status === 429 || r.status === 408) {
        reintentar.push(id);         // fallo pasajero (AnimeAV1 o AniList no contestan): se reintenta
      } else {
        // 4xx: no tiene arreglo reintentando. Se avisa en la ventana de la extensión.
        await apuntarFallo(ev, d.detail || ('Error ' + r.status));
        await I18N.cargar();
        await marcar('?', '#d97706', I18N.tr('No se pudo apuntar: {d}', {d: d.detail || r.status}));
      }
    }
  } finally {
    if (hechos.size) await quitarDeCola(hechos, reintentar);
    await chrome.storage.session.remove('enviando').catch(() => {});
  }
}

let ultimaMarca = 0;
async function marcar(texto, color, titulo) {
  const yo = ++ultimaMarca;
  try {
    await chrome.action.setBadgeBackgroundColor({color});
    await chrome.action.setBadgeText({text: texto});
    await chrome.action.setTitle({title: 'Miraru — ' + titulo});
    // El ✓ se borra solo; un aviso posterior (! o ?) no lo borra este temporizador.
    if (texto === '✓') setTimeout(() => { if (yo === ultimaMarca) chrome.action.setBadgeText({text: ''}); }, 4000);
  } catch (_) { /* nada */ }
}

// ── v1.4: tus listas de AnimeAV1 («Mis Listas») también van a Miraru ────────
// Se leen con la sesión de tu navegador (como al entrar en «Mis Listas») y se
// mandan a Miraru, que añade lo que falta sin repetir nada y nunca baja tu
// progreso. Solo si han cambiado desde la última vez.
const URL_MIS_LISTAS = 'https://animeav1.com/cuenta/listas/__data.json';

async function huella(texto) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(h).slice(0, 12)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function sincronizarListas(forzar = false) {
  const guardar = estado => chrome.storage.local.set({listas: Object.assign({cuando: Date.now()}, estado)});
  let texto;
  try {
    const r = await fetch(URL_MIS_LISTAS, {credentials: 'include', cache: 'no-store'});
    if (r.status === 401 || r.status === 403) { await guardar({estado: 'sin-sesion'}); return 'sin-sesion'; }
    if (!r.ok) { await guardar({estado: 'error', detalle: 'AnimeAV1 ' + r.status}); return 'error'; }
    texto = await r.text();
    const j = JSON.parse(texto);
    const malo = j.type === 'error' || j.type === 'redirect' || (j.nodes || []).some(n => n && n.type === 'error');
    if (malo) { await guardar({estado: 'sin-sesion'}); return 'sin-sesion'; }
  } catch (_) { await guardar({estado: 'error', detalle: 'AnimeAV1 no responde'}); return 'error'; }
  // Si Miraru cambia cómo entiende las listas («reglas»), se vuelven a mandar.
  let reglas = '';
  try { reglas = String((await (await fetch(`http://127.0.0.1:${await puerto()}/api/animeav1/listas/estado`)).json()).reglas || ''); } catch (_) {}
  const h = await huella(texto + '|' + reglas);
  const {listasHuella} = await chrome.storage.local.get('listasHuella');
  if (!forzar && h === listasHuella) { await guardar({estado: 'al-dia'}); return 'al-dia'; }
  try {
    const r = await fetch(`http://127.0.0.1:${await puerto()}/api/animeav1/listas`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'X-Miraru-Extension': '1'},
      body: JSON.stringify({datos: JSON.parse(texto)}),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { await guardar({estado: 'error', detalle: d.detail || ('Miraru ' + r.status)}); return 'error'; }
    await chrome.storage.local.set({listasHuella: h});
    await guardar({estado: 'enviado', total: d.total || 0});
    return 'enviado';
  } catch (_) {
    await guardar({estado: 'miraru-cerrado'});      // se reintenta en la próxima vuelta
    return 'miraru-cerrado';
  }
}

chrome.alarms.create('reintentar', {periodInMinutes: 0.5});   // en cuanto Miraru vuelva, se sube lo guardado
chrome.alarms.create('listas', {periodInMinutes: 180, delayInMinutes: 1});

// Al instalarla: la guía de bienvenida (comprueba sola que todo está listo).
// v1.7: con dirección corta (127.0.0.1:8765/extension) si Miraru está abierto.
async function abrirGuia() {
  const base = `http://127.0.0.1:${await puerto()}`;
  let url = chrome.runtime.getURL('bienvenida.html');
  try {
    if ((await fetch(base + '/api/health', {cache: 'no-store'})).ok) { await saludar(); url = base + '/extension'; }
  } catch (_) { /* Miraru cerrado: la de la extensión */ }
  chrome.tabs.create({url});
}
chrome.runtime.onInstalled.addListener(({reason}) => {
  if (reason === 'install') abrirGuia();
  sincronizarListas();
  activarSiguienteAuto();
});
// v1.9: «Siguiente automático» pasa a estar encendido para todos (una sola vez:
// si luego lo apagas, se queda apagado).
async function activarSiguienteAuto() {
  try {
    const {av1Mig19, av1Reproductor = {}} = await chrome.storage.local.get(['av1Mig19', 'av1Reproductor']);
    if (av1Mig19) return;
    await chrome.storage.local.set({av1Mig19: true,
      av1Reproductor: Object.assign({}, av1Reproductor, {siguienteAuto: true, marcarAlPasar: true})});
  } catch (_) { /* nada */ }
}
chrome.alarms.onAlarm.addListener(a => {
  if (a.name === 'reintentar') enviarCola();
  if (a.name === 'listas') sincronizarListas();
});
chrome.runtime.onStartup.addListener(() => { enviarCola(); sincronizarListas(); });
// ── v1.5: Netflix y Crunchyroll (v1.6: y AnimeFLV) ─────────────────────────
async function apuntarStreaming(d, accion) {
  if (!d || !d.serie) return;
  const ev = {ruta: '/api/streaming/evento', servicio: d.servicio, serie: String(d.serie).slice(0, 300)};
  if (accion === 'desmarcar') ev.accion = 'desmarcar';
  if (d.temporada) ev.temporada = Number(d.temporada);
  if (d.episodio) ev.episodio = Number(d.episodio);
  if (d.temporada_nombre) ev.temporada_nombre = String(d.temporada_nombre).slice(0, 300);
  if (d.titulo_ep) ev.titulo_ep = String(d.titulo_ep).slice(0, 300);
  ev.titulo = ev.serie + (ev.episodio ? ` · T${ev.temporada || 1}:E${ev.episodio}` : '');
  await encolar(ev);
  await enviarCola();
}

chrome.runtime.onMessage.addListener((msg, sender, responder) => {
  // v1.9: AnimeAV1 → «Siguiente automático» marca el episodio también aquí,
  // por si no tienes la sesión de AnimeAV1 abierta (si la tienes, llegan los dos
  // y Miraru se queda con uno: es el mismo anime y episodio).
  if (msg && msg.tipo === 'av1-visto' && Number(msg.mediaId) > 0 && Number(msg.episode) > 0) {
    encolar({mediaId: Number(msg.mediaId), episode: Number(msg.episode), accion: 'marcar',
             slug: String(msg.slug || '').slice(0, 200), titulo: String(msg.titulo || '').slice(0, 300)})
      .then(enviarCola).catch(() => {});
    return false;
  }
  if (msg && msg.tipo === 'streaming-visto') { apuntarStreaming(msg.datos); return false; }
  if (msg && msg.tipo === 'streaming-ahora') { guardarAhora(msg, sender); return false; }
  if (msg && msg.tipo === 'streaming-desmarcar') { apuntarStreaming(msg.datos, 'desmarcar'); return false; }
  if (msg && msg.tipo === 'deshacer') { deshacer(msg.nombre, msg.episodio).then(responder); return true; }
  if (msg && msg.tipo === 'streaming-visto-marco') {
    // El vídeo de Crunchyroll vive en un marco: el nombre lo tiene la página.
    const tab = sender.tab && sender.tab.id;
    if (tab != null) {
      chrome.tabs.sendMessage(tab, {tipo: 'streaming-datos'}, {frameId: 0})
        .then(apuntarStreaming)
        .catch(async () => { await I18N.cargar(); marcar('?', '#d97706', I18N.tr('No pude leer qué episodio era')); });
    }
    return false;
  }
  if (msg && msg.tipo === 'streaming-sin-datos') {
    I18N.cargar().then(() => apuntarFallo({titulo: {netflix: 'Netflix', animeflv: 'AnimeFLV'}[msg.servicio] || 'Crunchyroll'},
                 I18N.tr('No pude leer el nombre del episodio en la página'))).then(() =>
      marcar('?', '#d97706', I18N.tr('No pude leer qué episodio era')));
    return false;
  }
  if (msg === 'reintentar') enviarCola(true).then(() => responder(true));
  else if (msg === 'listas') sincronizarListas(true).then(responder);
  return true;
});

// «Deshacer» en la ventana de la extensión: quita el último episodio apuntado
// (solo si en Miraru sigues justo en ese episodio).
async function deshacer(nombre, episodio) {
  if (!nombre || !(episodio > 0)) return {ok: false};
  try {
    const r = await fetch(`http://127.0.0.1:${await puerto()}/api/extension/deshacer`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'X-Miraru-Extension': '1'},
      body: JSON.stringify({nombre, episodio}),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return {ok: false, detalle: d.detail || ('Error ' + r.status)};
    const {ultimo, historial = []} = await chrome.storage.local.get(['ultimo', 'historial']);
    if (ultimo && ultimo.nombre === nombre) {
      const nuevo = Object.assign({}, ultimo, {accion: d.accion, episodio: d.episodios_vistos, estado: d.estado,
        eps_emitidos: d.eps_emitidos, cuando: Date.now()});
      await chrome.storage.local.set({ultimo: nuevo,
        historial: historial.filter(h => !(h.nombre === nombre && h.episodio === episodio))});
    }
    return {ok: true, accion: d.accion};
  } catch (_) {
    return {ok: false, detalle: 'Miraru está cerrado'};
  }
}

// v1.6.1: «Ahora» en la ventana de la extensión: lo que suena en la pestaña
// (Netflix, Crunchyroll, AnimeFLV) y cuánto falta para que se apunte. En
// Crunchyroll el progreso llega del marco del vídeo y el nombre de la página.
async function guardarAhora(msg, sender) {
  const tab = sender.tab && sender.tab.id;
  if (tab == null) return;
  const {ahora} = await chrome.storage.session.get('ahora').catch(() => ({}));
  const antes = ahora && ahora.tab === tab ? ahora : {tab};
  const nuevo = Object.assign({}, antes, {cuando: Date.now()});
  if (msg.servicio) nuevo.servicio = msg.servicio;
  if ('datos' in msg) nuevo.datos = msg.datos;
  if (msg.progreso != null) nuevo.progreso = msg.progreso;
  if (msg.umbral) nuevo.umbral = msg.umbral;
  if (msg.estado) nuevo.estado = msg.estado;
  await chrome.storage.session.set({ahora: nuevo}).catch(() => {});
}

// ── v1.6.2: actualizarse desde la propia extensión ────────────────────────
// Miraru trae dentro la última versión. Si es más nueva que esta, la ventana
// lo avisa (y el icono enseña «↑»). Al pulsar «Actualizar», Miraru copia los
// archivos a la carpeta de la extensión y aquí se recarga (chrome.runtime.reload).
// Tras recargar se comprueba si de verdad cambió la versión: si no, es que la
// extensión está cargada desde otra carpeta y la ventana explica qué hacer.
function versionMayor(a, b) {
  const pa = String(a || '').split('.').map(Number), pb = String(b || '').split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] || 0, y = pb[i] || 0;
    if (x !== y) return x > y;
  }
  return false;
}

async function buscarActualizacion() {
  const mia = chrome.runtime.getManifest().version;
  try {
    const r = await fetch(`http://127.0.0.1:${await puerto()}/api/extension/version`, {cache: 'no-store'});
    if (!r.ok) return null;
    const d = await r.json();
    const hay = versionMayor(d.version, mia);
    saludar();
    await chrome.storage.local.set({actualizacion: hay ? {version: d.version, carpeta: d.carpeta, cuando: Date.now()} : null});
    if (hay) {
      await chrome.action.setBadgeBackgroundColor({color: '#2563eb'});
      await chrome.action.setBadgeText({text: '↑'});
      await I18N.cargar();
      await chrome.action.setTitle({title: 'Miraru — ' + I18N.tr('Versión {v} de la extensión lista para instalar', {v: d.version})});
    }
    return hay ? d.version : null;
  } catch (_) {
    return null;                       // Miraru cerrado: ya se mirará
  }
}

async function actualizarExtension() {
  const mia = chrome.runtime.getManifest().version;
  let d;
  try {
    const r = await fetch(`http://127.0.0.1:${await puerto()}/api/extension/actualizar`, {
      method: 'POST', headers: {'X-Miraru-Extension': '1'}});
    d = await r.json().catch(() => ({}));
    if (!r.ok) return {ok: false, detalle: d.detail || ('Error ' + r.status)};
  } catch (_) {
    return {ok: false, detalle: 'Miraru está cerrado: ábrelo y vuelve a intentarlo'};
  }
  await chrome.storage.local.set({actualizando: {de: mia, a: d.version, carpeta: d.carpeta, cuando: Date.now()}});
  setTimeout(() => chrome.runtime.reload(), 300);      // que la ventana reciba la respuesta
  return {ok: true, version: d.version};
}

// Al arrancar tras una recarga: ¿se actualizó de verdad?
async function comprobarActualizacion() {
  const {actualizando} = await chrome.storage.local.get('actualizando');
  if (!actualizando) return;
  const mia = chrome.runtime.getManifest().version;
  const ok = !versionMayor(actualizando.a, mia);
  await chrome.storage.local.set({actualizando: null,
    resultadoActualizacion: {ok, version: mia, esperada: actualizando.a, carpeta: actualizando.carpeta, cuando: Date.now()}});
  if (ok) {
    await chrome.storage.local.set({actualizacion: null});
    await I18N.cargar();
    await marcar('✓', '#16a34a', I18N.tr('Extensión actualizada a la versión {v}', {v: mia}));
  }
}
comprobarActualizacion().then(buscarActualizacion);
chrome.alarms.create('actualizacion', {periodInMinutes: 180, delayInMinutes: 2});
chrome.alarms.onAlarm.addListener(a => { if (a.name === 'actualizacion') buscarActualizacion(); });
chrome.runtime.onMessage.addListener((msg, _s, responder) => {
  if (msg === 'buscar-actualizacion') { buscarActualizacion().then(responder); return true; }
  if (msg === 'actualizar-extension') { actualizarExtension().then(responder); return true; }
  return false;
});

// ── v1.7: Miraru conoce a su extensión (para la guía en 127.0.0.1:8765/extension)
// y la extensión usa el idioma de Miraru si no eliges otro.
async function saludar() {
  const base = `http://127.0.0.1:${await puerto()}`;
  try {
    await fetch(base + '/api/extension/hola', {method: 'POST',
      headers: {'Content-Type': 'application/json', 'X-Miraru-Extension': '1'},
      body: JSON.stringify({id: chrome.runtime.id, version: chrome.runtime.getManifest().version})});
    const l = await (await fetch(base + '/api/lang', {cache: 'no-store'})).json();
    if (l && l.lang) await chrome.storage.local.set({idiomaMiraru: l.lang});
  } catch (_) { /* Miraru cerrado */ }
}

// La guía servida por Miraru (http://127.0.0.1:<puerto>/extension) habla con la
// extensión por aquí: solo páginas de este PC (manifest: externally_connectable).
async function sesionAnimeAV1() {
  try {
    const r = await fetch('https://animeav1.com/cuenta/listas/__data.json', {credentials: 'include', cache: 'no-store'});
    if (r.status === 401 || r.status === 403) return 'no';
    const j = await r.json();
    const error = (j.nodes || []).some(n => n && n.type === 'error') || j.type === 'error' || j.type === 'redirect';
    return !r.ok || error ? 'no' : 'si';
  } catch (_) { return '?'; }
}
chrome.runtime.onMessageExternal.addListener((msg, sender, responder) => {
  if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(sender.url || '')) return false;
  if (msg && msg.tipo === 'guia-estado') {
    chrome.storage.local.get(['ultimo', 'idioma', 'idiomaMiraru', 'cola']).then(d => responder({
      version: chrome.runtime.getManifest().version, ultimo: d.ultimo || null,
      idioma: d.idioma || '', idiomaMiraru: d.idiomaMiraru || '', guardados: (d.cola || []).length}));
    return true;
  }
  if (msg && msg.tipo === 'guia-sesion-av1') { sesionAnimeAV1().then(responder); return true; }
  if (msg && msg.tipo === 'guia-idioma') {
    chrome.storage.local.set({idioma: ['es', 'en', 'fr', 'de'].includes(msg.idioma) ? msg.idioma : ''}).then(() => responder(true));
    return true;
  }
  return false;
});
chrome.runtime.onStartup.addListener(saludar);
saludar();
