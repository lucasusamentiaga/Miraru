// Miraru — dentro del reproductor de AnimeAV1 (player.zilla-networks.com) (v1.8).
//
// La página de AnimeAV1 (animeav1-player.js) le pasa cuándo es el opening y el
// ending y qué tienes activado. Aquí, donde está el vídeo:
// - Durante el opening sale «⏭ Saltar opening» (si lo tienes activado, salta
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
    const out = {botonSaltar: false, saltarA: null, cuenta: null, siguiente: false};
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
        const falta = Math.ceil(inicioEd + ESPERA_ED - t);
        if (falta <= 0) out.siguiente = true;
        else out.cuenta = falta;
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
  let config = null, origenPadre = '*';
  const mem = {saltadoOp: false, cancelado: false, avisado: false, reproducido: false};

  window.addEventListener('message', e => {
    if (!PADRE.test(e.origin) || !e.data || e.data.miraru !== 'config') return;
    origenPadre = e.origin;
    config = e.data;
  });
  const hola = () => { try { window.parent.postMessage({miraru: 'hola'}, '*'); } catch (_) { /* nada */ } };

  // ── Botones encima del vídeo ──────────────────────────────────────────────
  const caja = document.createElement('div');
  caja.style.cssText = 'position:absolute;right:22px;bottom:72px;z-index:2147483646;pointer-events:none';
  const sombra = caja.attachShadow({mode: 'closed'});
  sombra.innerHTML = `<style>
    :host{all:initial}
    .w{display:flex;flex-direction:column;align-items:flex-end;gap:8px;font:600 14px/1.2 "Segoe UI",system-ui,sans-serif}
    button,.cuenta{pointer-events:auto;display:inline-flex;align-items:center;gap:10px;color:#fff;border-radius:10px;
      background:rgba(14,11,22,.82);border:1px solid rgba(196,177,255,.45);padding:11px 16px;backdrop-filter:blur(6px);
      animation:entra .3s cubic-bezier(.16,1,.3,1) both}
    button{font:inherit;cursor:pointer;transition:background-color .2s,border-color .2s,transform .15s}
    button:hover{background:rgba(124,58,237,.9);border-color:#c4b1ff}
    button:active{transform:scale(.97)}
    button:focus-visible{outline:2px solid #c4b1ff;outline-offset:2px}
    .cuenta{gap:12px;padding:8px 8px 8px 16px}
    .cuenta button{padding:7px 12px;background:rgba(255,255,255,.12);border-color:transparent;animation:none}
    .cuenta button:hover{background:rgba(255,255,255,.22)}
    .barra{width:120px;height:3px;border-radius:99px;background:rgba(255,255,255,.2);overflow:hidden}
    .barra i{display:block;height:100%;width:100%;background:#a855f7;transform-origin:left;animation:baja 2s linear forwards}
    @keyframes baja{to{transform:scaleX(0)}}
    .toast{pointer-events:none;color:#fff;background:rgba(14,11,22,.82);border-radius:10px;padding:9px 14px;font-weight:600;animation:entra .3s cubic-bezier(.16,1,.3,1) both}
    @keyframes entra{from{opacity:0;transform:translateY(8px)}}
    [hidden]{display:none!important}
    @media (prefers-reduced-motion:reduce){button,.cuenta,.toast,.barra i{animation:none}}
  </style><div class="w">
    <div class="toast" id="toast" hidden></div>
    <div class="cuenta" id="cuenta" hidden><span id="cuenta-t"></span><span class="barra"><i id="cuenta-b"></i></span><button type="button" id="cancelar"></button></div>
    <button type="button" id="saltar" hidden></button>
  </div>`;
  const $ = id => sombra.getElementById(id);
  let toastHasta = 0;
  function toast(txt) {
    $('toast').textContent = txt; $('toast').hidden = false; toastHasta = Date.now() + 1800;
  }
  function colocar() {
    // A pantalla completa solo se ve lo que está dentro del elemento a pantalla completa.
    const dentro = document.fullscreenElement || document.getElementById('player') || document.body;
    if (caja.parentNode !== dentro) dentro.appendChild(caja);
    if (getComputedStyle(dentro).position === 'static' && dentro !== document.body) dentro.style.position = 'relative';
  }
  document.addEventListener('fullscreenchange', colocar);

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
  $('cancelar').addEventListener('click', () => { mem.cancelado = true; $('cuenta').hidden = true; });

  let ultimaCuenta = null;
  function vuelta() {
    if (!config) { hola(); return; }
    colocar();
    const v = video();
    if (!v) return;
    if (config.reproducir && !mem.reproducido) {      // llegaste con «Siguiente automático»
      mem.reproducido = true;
      v.play().catch(() => { /* el navegador no deja: hay que darle al play */ });
    }
    const d = decidir(config, v.currentTime, v.duration, mem);
    if (d.saltarA != null) {
      v.currentTime = d.saltarA;
      mem.saltadoOp = true;
      toast((config.textos || {}).saltado || 'Opening saltado');
    }
    $('saltar').hidden = !d.botonSaltar;
    if (d.botonSaltar) $('saltar').textContent = config.op ? config.textos.saltar : config.textos.saltarSin;
    if (d.cuenta != null) {
      if ($('cuenta').hidden) {                       // reinicia la barra
        $('cuenta-b').style.animation = 'none'; void $('cuenta-b').offsetWidth; $('cuenta-b').style.animation = '';
      }
      $('cuenta').hidden = false;
      if (d.cuenta !== ultimaCuenta) $('cuenta-t').textContent = config.textos.siguiente.replace('{s}', d.cuenta);
      $('cancelar').textContent = config.textos.cancelar;
      ultimaCuenta = d.cuenta;
    } else if (!d.siguiente) {
      $('cuenta').hidden = true; ultimaCuenta = null;
    }
    if (d.siguiente && !mem.avisado) {
      mem.avisado = true;
      $('cuenta-t').textContent = config.textos.pasando;
      try { window.parent.postMessage({miraru: 'siguiente'}, origenPadre); } catch (_) { /* nada */ }
    }
    // Si vuelves atrás (antes del opening o del ending), todo vuelve a valer.
    if (config.op && v.currentTime < config.op[0] - 2) mem.saltadoOp = false;
    if (Date.now() > toastHasta) $('toast').hidden = true;
  }
  hola();
  setInterval(vuelta, 250);
})();
