// Miraru — «¿En qué navegador quieres usar Miraru?» (v2.17.7).
//
// La primera vez que se abre esta versión en el PC, Miraru enseña los
// navegadores instalados y guarda el elegido: a partir de ahí se abre siempre
// en él. Se puede cambiar en «Más → Navegador» (window.miraruElegirNavegador()).
// Autocontenido (estilos y textos en los cuatro idiomas de Miraru).
(function () {
  'use strict';

  const TXT = {
    es: {tit: '¿En qué navegador quieres usar Miraru?',
         sub: 'Miraru se abrirá siempre ahí. Puedes cambiarlo cuando quieras en «Más → Navegador».',
         pred: 'El predeterminado de Windows', predTag: 'Predeterminado', aqui: 'Estás aquí',
         usar: 'Usar este navegador', luego: 'Ahora no', abrirEn: 'Abriendo Miraru en {n}…',
         abierto: 'Miraru se ha abierto en {n}. Ya puedes cerrar esta pestaña.', cerrar: 'Cerrar',
         guardado: 'Listo: Miraru se abrirá en {n}.', error: 'No se pudo guardar. ¿Está Miraru abierto?',
         elige: 'Elige uno'},
    en: {tit: 'Which browser do you want to use Miraru in?',
         sub: 'Miraru will always open there. You can change it any time in "More → Browser".',
         pred: "Windows' default browser", predTag: 'Default', aqui: "You're here",
         usar: 'Use this browser', luego: 'Not now', abrirEn: 'Opening Miraru in {n}…',
         abierto: 'Miraru opened in {n}. You can close this tab now.', cerrar: 'Close',
         guardado: 'Done: Miraru will open in {n}.', error: "Couldn't save it. Is Miraru running?",
         elige: 'Pick one'},
    fr: {tit: 'Dans quel navigateur voulez-vous utiliser Miraru ?',
         sub: 'Miraru s’ouvrira toujours là. Vous pouvez le changer à tout moment dans « Plus → Navigateur ».',
         pred: 'Le navigateur par défaut de Windows', predTag: 'Par défaut', aqui: 'Vous êtes ici',
         usar: 'Utiliser ce navigateur', luego: 'Pas maintenant', abrirEn: 'Ouverture de Miraru dans {n}…',
         abierto: 'Miraru s’est ouvert dans {n}. Vous pouvez fermer cet onglet.', cerrar: 'Fermer',
         guardado: 'C’est fait : Miraru s’ouvrira dans {n}.', error: 'Impossible d’enregistrer. Miraru est-il ouvert ?',
         elige: 'Choisissez-en un'},
    de: {tit: 'In welchem Browser möchtest du Miraru nutzen?',
         sub: 'Miraru öffnet sich immer dort. Du kannst es jederzeit unter „Mehr → Browser“ ändern.',
         pred: 'Der Standardbrowser von Windows', predTag: 'Standard', aqui: 'Du bist hier',
         usar: 'Diesen Browser nutzen', luego: 'Nicht jetzt', abrirEn: 'Miraru wird in {n} geöffnet…',
         abierto: 'Miraru ist in {n} geöffnet. Du kannst diesen Tab jetzt schließen.', cerrar: 'Schließen',
         guardado: 'Fertig: Miraru öffnet sich in {n}.', error: 'Konnte nicht gespeichert werden. Läuft Miraru?',
         elige: 'Wähle einen aus'},
  };
  let L = TXT.es;
  const t = (k, n) => (L[k] || TXT.es[k]).replace('{n}', n || '');

  // Monograma y color de cada navegador (sin logotipos).
  const ESTILO = {chrome: ['Ch', '#4285f4'], edge: ['Ed', '#0f9d8a'], firefox: ['Fx', '#e66000'],
                  brave: ['Br', '#fb542b'], opera: ['Op', '#d1102d'], operagx: ['GX', '#fa1e4e'],
                  vivaldi: ['Vi', '#ef3939'], chromium: ['Cr', '#5b8def']};

  function actual() {                       // en qué navegador estás ahora (aproximado)
    const ua = navigator.userAgent;
    if (navigator.brave) return 'brave';
    if (/Edg\//.test(ua)) return 'edge';
    if (/OPR\//.test(ua)) return /OPRGX/i.test(ua) ? 'operagx' : 'opera';
    if (/Vivaldi/.test(ua)) return 'vivaldi';
    if (/Firefox\//.test(ua)) return 'firefox';
    if (/Chrome\//.test(ua)) return 'chrome';
    return '';
  }

  const CSS = `
  .mnav-bg{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px;
    background:rgba(6,4,12,.72);backdrop-filter:blur(6px);animation:mnavFondo .3s ease-out both}
  @keyframes mnavFondo{from{opacity:0}}
  .mnav{width:min(480px,100%);max-height:92vh;overflow:auto;border-radius:18px;padding:24px;color:#edecf4;
    font:400 14px/1.5 "Segoe UI",system-ui,sans-serif;background:#16121f;border:1px solid #3a3258;
    box-shadow:0 24px 60px rgba(0,0,0,.55);animation:mnavEntra .45s cubic-bezier(.16,1,.3,1) both}
  @keyframes mnavEntra{from{opacity:0;transform:translateY(14px) scale(.98)}}
  .mnav h2{margin:0 0 6px;font-size:19px;font-weight:700;line-height:1.25;text-wrap:balance}
  .mnav .sub{margin:0 0 16px;color:#a49dc0;font-size:13px}
  .mnav ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
  .mnav li button{width:100%;display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:12px;cursor:pointer;
    text-align:left;font:inherit;color:inherit;background:#1d1829;border:1px solid #2b2542;
    transition:border-color .2s cubic-bezier(.22,1,.36,1),background-color .2s cubic-bezier(.22,1,.36,1)}
  .mnav li button:hover{border-color:#5b4f86}
  .mnav li button[aria-checked="true"]{border-color:var(--accent,#7c3aed);background:rgba(124,58,237,.14)}
  .mnav li button:focus-visible{outline:2px solid #c4b1ff;outline-offset:2px}
  .mnav .mono{display:grid;place-items:center;width:36px;height:36px;border-radius:10px;flex-shrink:0;color:#fff;
    font-weight:700;font-size:13px;letter-spacing:.02em}
  .mnav .nom{flex:1;min-width:0;font-weight:600}
  .mnav .tags{display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end}
  .mnav .tag{font-size:10.5px;font-weight:700;padding:2px 7px;border-radius:99px;background:#2b2542;color:#c4b1ff;white-space:nowrap}
  .mnav .tag.aqui{background:rgba(34,197,94,.14);color:#86efac}
  .mnav .radio{width:18px;height:18px;border-radius:50%;border:2px solid #4a4168;flex-shrink:0;position:relative;transition:border-color .2s}
  .mnav button[aria-checked="true"] .radio{border-color:var(--accent,#7c3aed)}
  .mnav button[aria-checked="true"] .radio::after{content:"";position:absolute;inset:3px;border-radius:50%;background:var(--accent,#7c3aed);
    animation:mnavPunto .25s cubic-bezier(.22,1,.36,1) both}
  @keyframes mnavPunto{from{transform:scale(0)}}
  .mnav .acc{display:flex;gap:8px;margin-top:18px;flex-wrap:wrap}
  .mnav .acc button{font:600 13.5px/1.2 inherit;font-family:inherit;border-radius:10px;padding:10px 16px;cursor:pointer;border:1px solid transparent}
  .mnav .acc .p{background:var(--accent,#7c3aed);color:#fff;flex:1}
  .mnav .acc .p:disabled{opacity:.55;cursor:default}
  .mnav .acc .s{background:transparent;color:#a49dc0;border-color:#2b2542}
  .mnav .msg{margin:14px 0 0;font-size:13px;color:#86efac}
  .mnav .msg.mal{color:#fca5a5}
  [data-theme=light] .mnav{background:#fff;color:#1e1b2e;border-color:#d4d0ec}
  [data-theme=light] .mnav li button{background:#f6f5fb;border-color:#e2def3}
  [data-theme=light] .mnav .sub,[data-theme=light] .mnav .acc .s{color:#5d5878}
  [data-theme=light] .mnav .tag{background:#ece9f8;color:#4f46e5}
  @media (prefers-reduced-motion:reduce){.mnav-bg,.mnav,.mnav .radio::after{animation:none}}`;

  async function idioma() {
    try {
      const d = await (await fetch('/api/lang', {cache: 'no-store'})).json();
      L = TXT[d.lang] || TXT.es;
    } catch (_) { /* español */ }
  }

  // v2.17.8: avisos al abrir Miraru DE UNO EN UNO (novedades, elegir navegador…).
  // Cola común en window: cada aviso espera a que se cierre el anterior. Todo
  // aviso nuevo que salga solo al abrir debe pasar por aquí.
  function turno(fn) {
    var antes = window.__miraruCola || Promise.resolve();
    var p = antes.then(function () {
      return new Promise(function (fin) {
        var hecho = false;
        var acabar = function () { if (!hecho) { hecho = true; fin(); } };
        try { fn(acabar); } catch (e) { acabar(); }
      });
    });
    window.__miraruCola = p.catch(function () {});
    return p;
  }
  // Hay otra ventana a la vista (un modal, el recorrido, otro aviso)
  function hayOtroAviso() {
    return !!document.querySelector('.modal-bg.open, .mtour-on, .mdlg-fondo, .mnv-bg, .mnav-bg') ||
      (document.getElementById('copia-aviso') || {style: {}}).style.display === 'flex';
  }
  function cuandoLibre(fn, n) {
    n = n || 0;
    if (hayOtroAviso() && n < 300) { setTimeout(function () { cuandoLibre(fn, n + 1); }, 700); return; }
    fn();
  }

  async function abrirDialogo(datos, alCerrar) {
    await idioma();
    if (!document.getElementById('mnav-css')) {
      const st = document.createElement('style'); st.id = 'mnav-css'; st.textContent = CSS; document.head.appendChild(st);
    }
    document.querySelectorAll('.mnav-bg').forEach(x => x.remove());
    const aqui = actual();
    const opciones = [{id: '', nombre: t('pred'), pred: true}, ...datos.navegadores];
    let sel = datos.elegido || '';
    const bg = document.createElement('div'); bg.className = 'mnav-bg';
    const box = document.createElement('div'); box.className = 'mnav';
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-labelledby', 'mnav-tit');
    box.setAttribute('data-no-i18n', '');
    const h = document.createElement('h2'); h.id = 'mnav-tit'; h.textContent = t('tit');
    const sub = document.createElement('p'); sub.className = 'sub'; sub.textContent = t('sub');
    const ul = document.createElement('ul'); ul.setAttribute('role', 'radiogroup'); ul.setAttribute('aria-label', t('elige'));
    const botones = [];
    opciones.forEach(o => {
      const li = document.createElement('li');
      const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'radio');
      const est = o.pred ? ['★', '#6d5bd0'] : (ESTILO[o.id] || [o.nombre.slice(0, 2), '#64607a']);
      const mono = document.createElement('span'); mono.className = 'mono'; mono.textContent = est[0]; mono.style.background = est[1];
      const nom = document.createElement('span'); nom.className = 'nom'; nom.textContent = o.nombre;
      const tags = document.createElement('span'); tags.className = 'tags';
      if (!o.pred && o.id === datos.predeterminado) { const x = document.createElement('span'); x.className = 'tag'; x.textContent = t('predTag'); tags.append(x); }
      if (!o.pred && o.id === aqui) { const x = document.createElement('span'); x.className = 'tag aqui'; x.textContent = t('aqui'); tags.append(x); }
      const radio = document.createElement('span'); radio.className = 'radio';
      b.append(mono, nom, tags, radio);
      b.onclick = () => { sel = o.id; pintar(); };
      b.onkeydown = e => {
        if (!['ArrowDown', 'ArrowUp'].includes(e.key)) return;
        e.preventDefault();
        const i = botones.indexOf(b) + (e.key === 'ArrowDown' ? 1 : -1);
        const sig = botones[(i + botones.length) % botones.length];
        sig.click(); sig.focus();
      };
      botones.push(b); li.append(b); ul.append(li);
    });
    const acc = document.createElement('div'); acc.className = 'acc';
    const usar = document.createElement('button'); usar.type = 'button'; usar.className = 'p'; usar.textContent = t('usar');
    const luego = document.createElement('button'); luego.type = 'button'; luego.className = 's';
    luego.textContent = datos.preguntar ? t('luego') : t('cerrar');
    const msg = document.createElement('p'); msg.className = 'msg'; msg.hidden = true; msg.setAttribute('role', 'status');
    acc.append(usar, luego);
    box.append(h, sub, ul, acc, msg);
    bg.append(box);
    document.body.append(bg);
    function pintar() { botones.forEach((b, i) => b.setAttribute('aria-checked', String(opciones[i].id === sel))); }
    pintar();
    (botones.find(b => b.getAttribute('aria-checked') === 'true') || botones[0]).focus();

    const cerrar = () => { bg.remove(); if (alCerrar) { const f = alCerrar; alCerrar = null; f(); } };
    // «Ahora no» también cuenta como respondido: no se vuelve a preguntar (queda el predeterminado).
    luego.onclick = async () => {
      if (datos.preguntar) { try { await guardar(datos.elegido || '', false); } catch (_) { /* nada */ } }
      cerrar();
    };
    bg.addEventListener('click', e => { if (e.target === bg && !datos.preguntar) cerrar(); });
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape' && document.body.contains(bg)) { luego.click(); document.removeEventListener('keydown', esc); }
    });
    usar.onclick = async () => {
      const elegido = opciones.find(o => o.id === sel);
      const nombre = elegido ? elegido.nombre : '';
      // Si eliges otro navegador distinto del que estás usando, se abre allí ya.
      const abrir = !!sel && sel !== aqui;
      usar.disabled = true;
      msg.hidden = false; msg.className = 'msg'; msg.textContent = abrir ? t('abrirEn', nombre) : '';
      try {
        await guardar(sel, abrir);
        msg.textContent = abrir ? t('abierto', nombre) : t('guardado', nombre);
        if (!abrir) setTimeout(cerrar, 1400);
        else { usar.hidden = true; luego.textContent = t('cerrar'); luego.onclick = cerrar; }
      } catch (_) {
        msg.className = 'msg mal'; msg.textContent = t('error'); usar.disabled = false;
      }
    };
  }

  async function guardar(id, abrir) {
    const r = await fetch('/api/navegador', {method: 'POST', headers: {'Content-Type': 'application/json'},
                                             body: JSON.stringify({id, abrir})});
    if (!r.ok) throw new Error(r.status);
    return r.json();
  }

  async function datos() {
    const r = await fetch('/api/navegadores', {cache: 'no-store'});
    if (!r.ok) throw new Error(r.status);
    return r.json();
  }

  // Desde «Más → Navegador»
  window.miraruElegirNavegador = async function () {
    try { const d = await datos(); d.preguntar = false; abrirDialogo(d); } catch (_) { /* Miraru cerrado */ }
  };

  // La primera vez: solo si hay de dónde elegir y no se ha preguntado aún.
  async function primeraVez() {
    try {
      const d = await datos();
      if (!(d.preguntar && d.navegadores.length > 1)) return;
      // De uno en uno con las novedades y cualquier otro aviso (nunca encima).
      turno(fin => cuandoLibre(() => abrirDialogo(d, fin).catch(fin)));
    } catch (_) { /* nada */ }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', primeraVez);
  else primeraVez();
})();
