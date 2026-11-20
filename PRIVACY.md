# Política de privacidad de Miraru / Miraru privacy policy

*Última actualización / Last updated: 20 de noviembre de 2026*

## Español

Miraru es una aplicación de escritorio que funciona en tu propio ordenador. **No tiene
cuentas, ni servidores propios, ni publicidad, ni telemetría.** El autor no recibe
ningún dato tuyo.

**Qué se guarda y dónde.** Tu lista (animes, películas y series, episodios vistos, notas,
puntuaciones) y tu configuración se guardan en tu ordenador, en la base de datos
`anime_tracker.db` de la carpeta de Miraru. Si desinstalas Miraru, se borran (salvo la
copia en la nube, ver abajo, que está en tu propia nube).

**Con quién se conecta Miraru.** Para funcionar, Miraru consulta servicios públicos de
información y envía solo lo necesario para la búsqueda (por ejemplo, el título o el
identificador de un anime), nunca tu lista completa ni datos personales:

- AniList, Jikan (MyAnimeList), Kitsu, AnimeFLV, AnimeAV1, Anime-Planet, Crunchyroll,
  AnimeThemes y TMDB (películas y series): datos de series, portadas, episodios,
  recomendaciones.
- IMDb (archivo público de notas) y Wikidata: la nota de IMDb de cada anime. Se descarga
  el archivo completo y se cruza en tu ordenador; no se envía tu lista.
- GitHub y Microsoft Store: comprobar si hay una versión nueva de Miraru.

Miraru oculta en las búsquedas el contenido que esas fuentes marcan como solo para
adultos.

**Funciones opcionales que solo se activan si tú las configuras o las aceptas:**

- *Copia en la nube*: si en tu ordenador hay una carpeta de OneDrive, Google Drive,
  Dropbox o iCloud Drive, Miraru guarda en ella (en la carpeta `Miraru`) una copia de tu
  lista para que puedas recuperarla si formateas o cambias de ordenador. Con OneDrive se
  activa sola; puedes elegir otra carpeta o apagarla en ☁ Copia en la nube. La copia
  **no incluye** contraseñas, sesiones ni claves (token de AniList, cookie de AnimeAV1,
  sesiones del móvil). Esa carpeta la sincroniza tu proveedor de nube
  con tu cuenta; Miraru no envía nada a ningún otro sitio.
- *Miraru Plus (suscripción opcional)*: la compra la hace la Microsoft Store con tu
  cuenta de Microsoft; Miraru no ve tus datos de pago, solo pregunta a la Store si tienes
  Plus activo y guarda la respuesta en tu ordenador.
  - *Avisos en el móvil*: si los activas, cuando sale un episodio de algo que sigues
    Miraru envía el nombre del anime y el número del episodio a ntfy.sh (un servicio
    gratuito de avisos), a un «tema» con un nombre largo y aleatorio que solo conoces tú,
    y la app de ntfy de tu móvil te lo muestra. Nada más viaja. Puedes apagarlos o crear
    un código nuevo cuando quieras.
  - *Sincronización entre PCs*: usa la misma carpeta de tu nube que la copia: cada PC lee
    las copias de tus otros PCs y trae lo que ha cambiado. No pasa por ningún servidor
    de Miraru.
- *Conectar con AniList*: al pulsar «Conectar» se abre AniList para que autorices a
  Miraru; AniList devuelve una clave de acceso que se guarda solo en tu ordenador. Con
  ella Miraru lee tu lista de AniList y sube los cambios que hagas (estado, episodios y
  nota). Puedes desconectarla en Miraru (AniList → Desconectar) o quitar el permiso en
  los ajustes de tu cuenta de AniList.
- *Importar tu lista*: con tu nombre de usuario de AniList (se lee tu lista pública) o con
  el archivo .xml que exportas de MyAnimeList (se lee en tu ordenador).
- *AnimeAV1*: importar o subir tu lista usando la sesión que copias de tu navegador; se
  guarda solo en tu ordenador y solo se envía a animeav1.com.
- *Extensión del navegador de Miraru* (la instalas tú en Chrome o Edge): en animeav1.com
  detecta cuándo pulsas «Marcar como visto»; en netflix.com y crunchyroll.com, cuando
  terminas un episodio (pasado el 80 %), lee de la página solo el nombre de la serie, la
  temporada y el número de episodio. Se lo comunica a Miraru en tu propio ordenador
  (127.0.0.1), que busca el título en AniList para saber qué anime es (lo que no es anime
  no se apunta). No lee tu historial, tu cuenta ni otras páginas, y no envía nada a
  terceros. En animeflv.net y animeflv.or.at lee el nombre y el número del episodio que
  abres. Si activas «Saltar opening» o «Siguiente automático» en AnimeAV1, pide a
  AniSkip (api.aniskip.com) los tiempos del opening y el ending con el número de
  MyAnimeList del anime y el del episodio (nada tuyo), y controla el vídeo dentro del
  reproductor de la página.
- *Reportar un bug* («Más → Reportar un bug»): lo que escribes, el correo si lo pones y,
  si dejas marcada la casilla, la versión de Miraru, el sistema, el navegador, el idioma y
  el tamaño de pantalla se envían a través de Web3Forms (web3forms.com) al correo del autor,
  solo cuando pulsas «Enviar». Nada de tu lista.
- *Google Sheets*: copia tu lista a una hoja de cálculo de tu cuenta de Google.
- *Notificaciones del navegador*: usan el servicio de notificaciones de tu navegador.
- *Acceso desde el móvil*: al pulsar «Conectar el móvil», Miraru se abre a los
  dispositivos de tu red local (tu WiFi) para que veas y edites tu lista en el navegador
  del móvil. Cada móvil entra con un código de un solo uso que solo se ve en tu PC y que
  caduca a los 10 minutos; Miraru guarda solo una huella (hash) de la sesión de cada
  móvil. La conexión va por tu red local sin cifrar (HTTP), igual que otros dispositivos
  de casa: úsalo solo en redes de confianza. «Desconectar los móviles» cierra todas las
  sesiones y deja de escuchar en la red. No se abre nada a Internet.

Cada uno de estos servicios tiene su propia política de privacidad.

**Tus derechos.** Todos tus datos están en tu ordenador (y, si la activas, en tu nube):
puedes exportarlos (CSV, JSON), borrarlos o desinstalar Miraru cuando quieras.

**Menores.** Miraru no recoge datos de nadie, tampoco de menores.

**Cambios.** Si esta política cambia, se actualizará la fecha de arriba y se indicará en
las notas de la versión.

**Contacto.** Abre un aviso en https://github.com/lucasusamentiaga/Miraru/issues

Ver también los [términos de uso](TERMS.md).

## English

Miraru is a desktop app that runs on your own computer. **It has no accounts, no servers
of its own, no ads and no telemetry.** The author receives no data about you.

**What is stored and where.** Your list (anime, movies and series, watched episodes,
notes, scores) and your settings are stored on your computer, in the `anime_tracker.db`
database inside the Miraru folder. Uninstalling Miraru deletes them (except the cloud
backup, see below, which lives in your own cloud).

**What Miraru connects to.** To work, Miraru queries public information services and
sends only what a search needs (for example an anime title or ID), never your full list or
personal data:

- AniList, Jikan (MyAnimeList), Kitsu, AnimeFLV, AnimeAV1, Anime-Planet, Crunchyroll,
  AnimeThemes and TMDB (movies and series): series data, covers, episodes,
  recommendations.
- IMDb (public ratings file) and Wikidata: the IMDb rating of each anime. The whole file is
  downloaded and matched on your computer; your list is not sent.
- GitHub and Microsoft Store: checking for a new version of Miraru.

Miraru hides from searches any content those sources flag as adults-only.

**Optional features, only active if you set them up or accept them:**

- *Cloud backup*: if your computer has a OneDrive, Google Drive, Dropbox or iCloud Drive
  folder, Miraru keeps a copy of your list in it (in a `Miraru` folder) so you can restore
  it after formatting or changing computers. With OneDrive it turns on by itself; you can
  pick another folder or turn it off under ☁ Cloud backup. The backup **does not
  include** passwords, sessions or keys (AniList token, AnimeAV1 cookie,
  phone sessions). That folder is synced by your cloud provider with your account; Miraru sends
  nothing anywhere else.
- *Miraru Plus (optional subscription)*: the purchase is made by the Microsoft Store with
  your Microsoft account; Miraru never sees your payment details, it only asks the Store
  whether you have Plus and keeps the answer on your computer.
  - *Phone alerts*: if you turn them on, when an episode of something you follow comes
    out, Miraru sends the anime's name and the episode number to ntfy.sh (a free
    notification service), to a "topic" with a long random name only you know, and the
    ntfy app on your phone shows it. Nothing else is sent. You can turn them off or create
    a new code at any time.
  - *Sync across PCs*: uses the same cloud folder as the backup: each PC reads the backups
    of your other PCs and brings over what changed. It does not go through any Miraru
    server.
- *Connect to AniList*: pressing "Connect" opens AniList so you can authorise Miraru;
  AniList returns an access key that is stored only on your computer. Miraru uses it to read
  your AniList list and upload the changes you make (status, episodes and score). You can
  disconnect it in Miraru (AniList → Disconnect) or revoke it in your AniList account
  settings.
- *Import your list*: with your AniList username (your public list is read) or with the
  .xml file you export from MyAnimeList (read on your computer).
- *AnimeAV1*: import or upload your list using the session you copy from your browser;
  it is stored only on your computer and only sent to animeav1.com.
- *Miraru browser extension* (you install it yourself in Chrome or Edge): on animeav1.com
  it detects when you press "Marcar como visto" (mark as watched); on netflix.com and
  crunchyroll.com, when you finish an episode (past 80 %), it reads from the page only the
  series name, season and episode number. It tells Miraru on your own computer
  (127.0.0.1), which looks the title up on AniList to know which anime it is (anything
  that is not anime is not recorded). It does not read your history, your account or other
  pages, and sends nothing to third parties. On animeflv.net and animeflv.or.at it reads the
  name and number of the episode you open. If you turn on "Skip opening" or "Autoplay next
  episode" on AnimeAV1, it asks AniSkip (api.aniskip.com) for the opening and ending times
  using the anime's MyAnimeList number and the episode number (nothing about you), and
  controls the video inside the page's player.
- *Report a bug* ("More → Report a bug"): what you write, your email if you add it and,
  if the box is ticked, the Miraru version, system, browser, language and screen size are
  sent through Web3Forms (web3forms.com) to the author's email, only when you press "Send".
  Nothing from your list.
- *Google Sheets*: copies your list to a spreadsheet in your Google account.
- *Browser notifications*: your browser's push service.
- *Mobile access*: pressing "Connect your phone" opens Miraru to devices on your local
  network (your Wi-Fi) so you can see and edit your list in your phone's browser. Each phone
  signs in with a one-time code shown only on your PC that expires after 10 minutes; Miraru
  stores only a fingerprint (hash) of each phone's session. The connection runs over your
  local network unencrypted (HTTP), like other home devices: only use it on trusted
  networks. "Disconnect phones" ends every session and stops listening on the network.
  Nothing is opened to the Internet.

Each of these services has its own privacy policy.

**Your rights.** All your data is on your computer (and, if enabled, in your cloud): you
can export it (CSV, JSON), delete it or uninstall Miraru at any time.

**Children.** Miraru collects no data from anyone, including children.

**Changes.** If this policy changes, the date above will be updated and the change noted in
the release notes.

**Contact.** Open an issue at https://github.com/lucasusamentiaga/Miraru/issues

See also the [terms of use](TERMS.md).
