// Miraru — dentro del reproductor de AnimeAV1 (player.zilla-networks.com) (v1.8).
//
// La página de AnimeAV1 (animeav1-player.js) le pasa cuándo es el opening y el
// ending y qué tienes activado. Aquí, donde está el vídeo:
// - Durante el opening sale «Saltar opening» (si lo tienes activado, salta
//   solo). Si no hay tiempos para ese episodio, el botón salta 85 s.
// - Con «Siguiente automático»: a los 2 s de empezar el ending sale «Siguiente
//   episodio en…» con «Cancelar»; si no lo cancelas, avisa a la página para
//   pasar al siguiente.
// Los botones van dentro del reproductor: se ven también a pantalla completa.
(function () {
  'use strict';
  const EN_PRUEBAS = typeof module !== 'undefined';
  const SALTO_SIN_DATOS = 85;     // lo que dura un opening típico
  const ED_SIN_DATOS = 90;        // y un ending
  const ESPERA_ED = 2;            // segundos de ending antes de pasar

  // Qué toca hacer en el segundo `t` (función pura, para las pruebas).
  function decidir(c, t, dur, mem) {
    const out = {botonSaltar: false, saltarA: null, cuenta: null, restante: null, siguiente: false};
    if (!c || !(dur > 0)) return out;
    if (c.op) {
      const [a, b] = c.op;
      if (t >= a && t < b - 1) {
        if (c.saltar && !mem.saltadoOp) out.saltarA = b;
        else out.botonSaltar = true;
      }
    } else if (t > 5 && t < 330 && !mem.saltadoOp && dur > 600) {
      out.botonSaltar = true;                         // sin tiempos: botón «+85 s»
    }
    if (c.auto && c.haySiguiente && !mem.cancelado) {
      const inicioEd = c.ed ? c.ed[0] : (dur > 600 ? dur - ED_SIN_DATOS : null);
      if (inicioEd != null && t >= inicioEd) {
        const resta = inicioEd + ESPERA_ED - t;
        if (resta <= 0) out.siguiente = true;
        else { out.cuenta = Math.ceil(resta); out.restante = resta; }
      }
    }
    return out;
  }

  if (EN_PRUEBAS) {
    module.exports = {decidir, SALTO_SIN_DATOS, ED_SIN_DATOS, ESPERA_ED};
    return;
  }
  if (window.top === window) return;              // solo dentro de la página del episodio

  const PADRE = /^https:\/\/(www\.)?animeav1\.com$/;
  // v1.9: estos reproductores también salen en otras webs: solo si están dentro
  // de AnimeAV1 (directamente o dentro de otro reproductor, como Byse).
  const ANC = location.ancestorOrigins;
  if (ANC && ANC.length && ![...ANC].some(o => PADRE.test(o))) return;
  let config = null, origenPadre = '*';
  const mem = {saltadoOp: false, cancelado: false, avisado: false, reproducido: false};

  window.addEventListener('message', e => {
    if (!PADRE.test(e.origin) || !e.data || e.data.miraru !== 'config') return;
    origenPadre = e.origin;
    config = e.data;
  });
  const hola = () => { try { window.top.postMessage({miraru: 'hola'}, '*'); } catch (_) { /* nada */ } };

  // ── Botones encima del vídeo ──────────────────────────────────────────────
  // Como los de las plataformas de streaming: oscuros y legibles sobre
  // cualquier imagen; al pasar el ratón, el de saltar se vuelve blanco.
  const caja = document.createElement('div');
  caja.style.cssText = 'position:absolute;right:clamp(14px,2.4vw,28px);bottom:clamp(64px,11%,96px);z-index:2147483646;pointer-events:none';
  const sombra = caja.attachShadow({mode: 'closed'});
  const R = 15, VUELTA = 2 * Math.PI * R;
  sombra.innerHTML = `<style>
    :host{all:initial}
    .w{display:flex;flex-direction:column;align-items:flex-end;gap:10px;
      font:600 clamp(14px,1.25vw,17px)/1.2 Satoshi,"Segoe UI",system-ui,sans-serif;color:#fff;-webkit-font-smoothing:antialiased}
    .pieza{pointer-events:auto;display:inline-flex;align-items:center;border-radius:8px;
      background:rgba(12,12,18,.78);border:1px solid rgba(255,255,255,.22);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
      box-shadow:0 2px 6px rgba(0,0,0,.35);animation:entra .35s cubic-bezier(.16,1,.3,1) both}
    button{all:unset;box-sizing:border-box;cursor:pointer;display:inline-flex;align-items:center;gap:10px;border-radius:6px;
      transition:background-color .18s cubic-bezier(.22,1,.36,1),color .18s,transform .12s}
    button:focus-visible{outline:2px solid #c4b1ff;outline-offset:2px}
    button:active{transform:scale(.97)}
    svg{flex-shrink:0}
    /* Saltar opening */
    #saltar{padding:.8em 1.25em .8em 1.05em}
    #saltar svg{width:1.15em;height:1.15em;fill:currentColor}
    #saltar:hover{background:#fff;color:#0c0c12;border-color:#fff}
    /* Aviso «Opening saltado · Ver opening» */
    .toast{gap:4px;padding:5px 5px 5px 14px;font-weight:500;font-size:.9em}
    .toast button{padding:7px 10px;color:#d6c8ff;font-weight:600}
    .toast button:hover{background:rgba(255,255,255,.12);color:#fff}
    /* Cuenta atrás */
    .cuenta{gap:12px;padding:8px 8px 8px 10px}
    .anillo{position:relative;width:40px;height:40px;display:grid;place-items:center;flex-shrink:0}
    .anillo svg{position:absolute;inset:0;width:40px;height:40px;transform:rotate(-90deg)}
    .anillo circle{fill:none;stroke-width:3}
    .anillo .fondo{stroke:rgba(255,255,255,.18)}
    .anillo .lleno{stroke:#a78bfa;stroke-linecap:round;stroke-dasharray:${VUELTA.toFixed(2)};stroke-dashoffset:0}
    .anillo b{font-size:15px;font-variant-numeric:tabular-nums}
    .anillo.gira svg{animation:gira .9s linear infinite}
    .ct{display:flex;flex-direction:column;gap:3px;min-width:9.5em}
    .ct small{font-size:.8em;font-weight:500;color:rgba(255,255,255,.68);font-variant-numeric:tabular-nums}
    #cancelar{padding:.6em .9em;background:rgba(255,255,255,.1);font-size:.92em}
    #cancelar:hover{background:rgba(255,255,255,.2)}
    @keyframes entra{from{opacity:0;transform:translateY(6px)}}
    @keyframes gira{to{transform:rotate(270deg)}}
    [hidden]{display:none!important}
    @media (prefers-reduced-motion:reduce){.pieza,.anillo.gira svg{animation:none}button{transition:none}}
  </style><div class="w">
    <div class="pieza toast" id="toast" role="status" hidden><span id="toast-t"></span><button type="button" id="ver-op"></button></div>
    <div class="pieza cuenta" id="cuenta" role="status" hidden>
      <span class="anillo" id="anillo"><svg viewBox="0 0 40 40" aria-hidden="true"><circle class="fondo" cx="20" cy="20" r="${R}"/><circle class="lleno" id="lleno" cx="20" cy="20" r="${R}"/></svg><b id="cuenta-n"></b></span>
      <span class="ct"><span id="cuenta-t"></span><small id="cuenta-s"></small></span>
      <button type="button" id="cancelar"></button>
    </div>
    <button type="button" class="pieza" id="saltar" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5v13l8.5-6.5z"/><path d="M12 5.5v13l8.5-6.5z"/></svg><span id="saltar-t"></span></button>
  </div>`;
  const $ = id => sombra.getElementById(id);
  const textos = () => (config && config.textos) || {};
  let toastHasta = 0, volverA = null;
  function toast(txt, puedeVolver) {
    $('toast-t').textContent = txt;
    $('ver-op').hidden = !puedeVolver;
    $('ver-op').textContent = textos().verOp || '';
    $('toast').hidden = false;
    toastHasta = Date.now() + (puedeVolver ? 5000 : 1800);
  }
  function colocar(v) {
    // A pantalla completa solo se ve lo que está dentro del elemento a pantalla completa.
    // v1.9: cada servidor tiene su reproductor (JW Player, Video.js…): la caja va
    // en el suyo, para quedar encima del vídeo.
    const dentro = document.fullscreenElement
      || (v && v.closest('.jwplayer,.video-js,.plyr,#player,[data-player]'))
      || document.getElementById('player') || (v && v.parentElement) || document.body;
    if (caja.parentNode !== dentro) dentro.appendChild(caja);
    if (getComputedStyle(dentro).position === 'static' && dentro !== document.body) dentro.style.position = 'relative';
  }
  document.addEventListener('fullscreenchange', () => colocar(video()));

  function video() {
    return [...document.querySelectorAll('video')].find(v => v.duration > 0) || null;
  }
  $('saltar').addEventListener('click', () => {
    const v = video();
    if (!v) return;
    v.currentTime = config && config.op ? config.op[1] : Math.min(v.duration - 1, v.currentTime + SALTO_SIN_DATOS);
    mem.saltadoOp = true;
    $('saltar').hidden = true;
  });
  $('ver-op').addEventListener('click', () => {
    const v = video();
    if (v && volverA != null) v.currentTime = volverA;   // sigue «saltado»: no vuelve a saltar solo
    toastHasta = 0; $('toast').hidden = true;
  });
  $('cancelar').addEventListener('click', () => { mem.cancelado = true; $('cuenta').hidden = true; });

  let ultimaCuenta = null;
  function vuelta() {
    if (!config) { hola(); return; }
    const v = video();
    if (!v) return;                                  // p. ej. el marco de fuera de Byse
    colocar(v);
    const tx = textos();
    if (config.reproducir && !mem.reproducido) {      // llegaste con «Siguiente automático»
      mem.reproducido = true;
      v.play().catch(() => { /* el navegador no deja: hay que darle al play */ });
    }
    const d = decidir(config, v.currentTime, v.duration, mem);
    if (d.saltarA != null) {
      volverA = config.op ? config.op[0] : v.currentTime;
      v.currentTime = d.saltarA;
      mem.saltadoOp = true;
      toast(tx.saltado || 'Opening saltado', true);
    }
    $('saltar').hidden = !d.botonSaltar || !!config.sinPlus;     // v1.10: de Miraru Plus
    if (d.botonSaltar) $('saltar-t').textContent = config.op ? tx.saltar : tx.saltarSin;
    if (d.cuenta != null) {
      const lleno = $('lleno');
      if ($('cuenta').hidden) {                       // el anillo se vacía en lo que falta, de verdad
        $('anillo').classList.remove('gira');
        lleno.style.transition = 'none'; lleno.style.strokeDashoffset = '0'; void getComputedStyle(lleno).strokeDashoffset;
        const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
        requestAnimationFrame(() => requestAnimationFrame(() => {
          lleno.style.transition = reducido ? 'none' : `stroke-dashoffset ${d.restante.toFixed(2)}s linear`;
          lleno.style.strokeDashoffset = VUELTA.toFixed(2);
        }));
        toastHasta = 0; $('toast').hidden = true;      // nunca dos avisos a la vez
        $('cancelar').hidden = false;
      }
      $('cuenta').hidden = false;
      if (d.cuenta !== ultimaCuenta) {
        $('cuenta-n').textContent = d.cuenta;
        $('cuenta-t').textContent = tx.siguiente || '';
        $('cuenta-s').textContent = tx.en || '';
      }
      $('cancelar').textContent = tx.cancelar || '';
      ultimaCuenta = d.cuenta;
    } else if (!d.siguiente) {
      $('cuenta').hidden = true; ultimaCuenta = null;
    }
    if (d.siguiente && !mem.avisado) {
      mem.avisado = true;
      $('cuenta').hidden = false;
      $('cuenta-n').textContent = '';
      $('anillo').classList.add('gira');
      $('lleno').style.transition = 'none'; $('lleno').style.strokeDashoffset = (VUELTA * .7).toFixed(2);
      $('cuenta-t').textContent = tx.pasando || '';
      $('cuenta-s').textContent = '';
      $('cancelar').hidden = true;
      try { window.top.postMessage({miraru: 'siguiente'}, origenPadre); } catch (_) { /* nada */ }
    }
    // Si vuelves atrás (antes del opening o del ending), todo vuelve a valer.
    if (config.op && v.currentTime < config.op[0] - 2) mem.saltadoOp = false;
    if (Date.now() > toastHasta) $('toast').hidden = true;
  }
  hola();
  setInterval(vuelta, 250);
})();
