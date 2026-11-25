# Extensión de Miraru en Edge Add-ons y Opera Add-ons

Material para las fichas de las tiendas de extensiones (v2.18.4). Las capturas
(1280×800) salen de la extensión real y de la app con datos de demostración.

- `es_1..4.png`, `en_1..4.png`: capturas 1280×800.
- `logo300.png`: logo 300×300 (Edge). `icon64.png`: icono 64×64 (Opera).
- `tile440.png`: imagen promocional pequeña 440×280 (Edge, opcional).
- `miraru-extension-<versión>.zip`: el contenido de `static/extension-animeav1/`
  con `manifest.json` en la raíz (lo que piden las dos tiendas).

## Nombre

Miraru — episodios vistos / Miraru — Anime episode tracker

## Resumen corto (≤ 132)

ES: Apunta solo lo que ves en AnimeAV1, AnimeFLV, Netflix y Crunchyroll, salta openings y retoma en el minuto exacto.
EN: Logs what you watch on AnimeAV1, AnimeFLV, Netflix and Crunchyroll, skips openings and resumes at the exact minute.

## Descripción

### ES

Lleva la cuenta de tu anime sin apuntar nada a mano. La extensión de Miraru apunta sola los episodios que ves y los guarda en tu lista de Miraru, la app gratuita para Windows.

QUÉ HACE
• AnimeAV1 y AnimeFLV: al pulsar «Marcar como visto», el episodio se apunta en Miraru.
• Netflix y Crunchyroll: cuando acabas un episodio de anime, se apunta solo.
• Retoma por donde lo dejaste: si cierras el navegador o apagas el PC a mitad de un episodio de AnimeAV1, Miraru te lleva a ese minuto.
• En AnimeAV1 salta los openings y, al empezar el ending, pasa sola al siguiente episodio (funciones de Miraru Plus, gratis durante el lanzamiento).
• Si Miraru está cerrado, lo guarda y lo envía en cuanto lo abres.
• En español, inglés, francés y alemán.

NECESITA LA APP MIRARU
La extensión habla solo con Miraru: Anime Tracker, en tu propio ordenador (127.0.0.1). Descárgala gratis en la Microsoft Store: https://apps.microsoft.com/detail/9PJZK97ZG03G

PRIVACIDAD
No hay cuentas ni servidores de Miraru: lo que ves solo viaja de tu navegador a la app Miraru de tu PC. Política de privacidad: https://github.com/lucasusamentiaga/Miraru/blob/main/PRIVACY.md

Miraru no aloja ni reproduce vídeos, y no está afiliado a AnimeAV1, AnimeFLV, Netflix ni Crunchyroll.

### EN

Keep track of your anime without logging anything by hand. The Miraru extension logs the episodes you watch and saves them to your Miraru list, the free Windows app.

WHAT IT DOES
• AnimeAV1 and AnimeFLV: when you press "Mark as watched", the episode is logged in Miraru.
• Netflix and Crunchyroll: when you finish an anime episode, it's logged by itself.
• Continue where you left off: if you close the browser or turn off your PC mid-episode on AnimeAV1, Miraru takes you back to that minute.
• On AnimeAV1 it skips openings and, when the ending starts, plays the next episode (Miraru Plus features, free during launch).
• If Miraru is closed, it keeps what you watched and sends it as soon as you open it.
• In English, Spanish, French and German.

NEEDS THE MIRARU APP
The extension only talks to Miraru: Anime Tracker, on your own computer (127.0.0.1). Get it free from the Microsoft Store: https://apps.microsoft.com/detail/9PJZK97ZG03G

PRIVACY
No accounts and no Miraru servers: what you watch only travels from your browser to the Miraru app on your PC. Privacy policy: https://github.com/lucasusamentiaga/Miraru/blob/main/PRIVACY.md

Miraru does not host or stream video, and is not affiliated with AnimeAV1, AnimeFLV, Netflix or Crunchyroll.

## Palabras clave

ES: anime, anime tracker, lista de anime, animeflv, animeav1, saltar opening, crunchyroll
EN: anime, anime tracker, anime list, episode tracker, skip opening, crunchyroll, netflix anime

## Notas para quien revisa

The extension needs the free Windows app "Miraru: Anime Tracker" (Microsoft Store, ID 9PJZK97ZG03G) running on the same PC; it talks to it only on 127.0.0.1:8765 and sends the X-Miraru-Extension header. To test: install the app, open it, install the extension, then finish an episode on Netflix or Crunchyroll (or press "Mark as watched" on animeav1.com): the popup shows it and it appears in Miraru. Without the app, the popup says Miraru is closed and keeps the episode queued. No remote code, no analytics, no data leaves the computer.
