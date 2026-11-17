// Miraru (extensión) — idiomas (v1.7): español, inglés, francés y alemán, los
// mismos que Miraru. Los textos se escriben en español y aquí está su
// traducción. Idioma: el que elijas en la extensión; si no, el de Miraru; si
// no, el del navegador. Sirve en la ventana, la guía, el fondo y AnimeFLV.
(function (g) {
  'use strict';
  const IDIOMAS = ['es', 'en', 'fr', 'de'];
  const NOMBRES = {es: 'Español', en: 'English', fr: 'Français', de: 'Deutsch'};

  // [en, fr, de]
  const T = {
    // ── Ventana ──
    'Lo que ves se apunta solo': ['What you watch logs itself', 'Ce que vous regardez se note tout seul', 'Was du schaust, wird von selbst eingetragen'],
    'Cerrado': ['Closed', 'Fermé', 'Geschlossen'],
    'Conectando…': ['Connecting…', 'Connexion…', 'Verbinde…'],
    'Nueva versión de la extensión': ['New version of the extension', "Nouvelle version de l'extension", 'Neue Version der Erweiterung'],
    'Versión {v} de la extensión': ['Extension version {v}', "Version {v} de l'extension", 'Version {v} der Erweiterung'],
    'Tienes la {v}. Se instala en un momento, sin salir de aquí.': ['You have {v}. It installs in a moment, right from here.', "Vous avez la {v}. Elle s'installe en un instant, sans quitter cette fenêtre.", 'Du hast {v}. Sie wird in einem Moment installiert, direkt von hier.'],
    'Actualizar': ['Update', 'Mettre à jour', 'Aktualisieren'],
    'Instalando…': ['Installing…', 'Installation…', 'Wird installiert…'],
    'No se pudo actualizar': ["Couldn't update", 'Mise à jour impossible', 'Aktualisierung fehlgeschlagen'],
    'Miraru está cerrado: ábrelo y vuelve a intentarlo': ['Miraru is closed: open it and try again', 'Miraru est fermé : ouvrez-le et réessayez', 'Miraru ist geschlossen: öffne es und versuch es erneut'],
    '✓ Extensión actualizada a la versión {v}. Recarga las pestañas de Netflix, Crunchyroll o AnimeFLV que tengas abiertas.': ['✓ Extension updated to version {v}. Reload any Netflix, Crunchyroll or AnimeFLV tabs you have open.', '✓ Extension mise à jour vers la version {v}. Rechargez les onglets Netflix, Crunchyroll ou AnimeFLV ouverts.', '✓ Erweiterung auf Version {v} aktualisiert. Lade offene Netflix-, Crunchyroll- oder AnimeFLV-Tabs neu.'],
    'Sigue en la {v}: tu navegador carga la extensión desde otra carpeta. Para que a partir de ahora se actualice sola:': ["Still on {v}: your browser loads the extension from another folder. So it updates itself from now on:", "Toujours en {v} : votre navigateur charge l'extension depuis un autre dossier. Pour qu'elle se mette à jour seule :", 'Noch auf {v}: Dein Browser lädt die Erweiterung aus einem anderen Ordner. Damit sie sich künftig selbst aktualisiert:'],
    'Pulsa «Instalar bien» (se abre la página de extensiones).': ['Press "Install properly" (the extensions page opens).', 'Appuyez sur « Bien installer » (la page des extensions s’ouvre).', 'Tippe auf „Richtig installieren“ (die Erweiterungsseite öffnet sich).'],
    'Quita la extensión de Miraru que tienes ahora.': ['Remove the Miraru extension you have now.', "Supprimez l'extension Miraru actuelle.", 'Entferne die aktuelle Miraru-Erweiterung.'],
    'Activa «Modo de desarrollador», pulsa «Cargar descomprimida» y pega con Ctrl+V.': ['Turn on "Developer mode", press "Load unpacked" and paste with Ctrl+V.', 'Activez « Mode développeur », cliquez sur « Charger l’extension non empaquetée » et collez avec Ctrl+V.', 'Aktiviere den „Entwicklermodus“, klicke auf „Entpackte Erweiterung laden“ und füge mit Strg+V ein.'],
    'Instalar bien': ['Install properly', 'Bien installer', 'Richtig installieren'],
    'Ruta copiada: pégala con Ctrl+V': ['Path copied: paste it with Ctrl+V', 'Chemin copié : collez-le avec Ctrl+V', 'Pfad kopiert: mit Strg+V einfügen'],
    'No se pudo (¿Miraru abierto?)': ["Couldn't (is Miraru open?)", 'Impossible (Miraru est-il ouvert ?)', 'Fehlgeschlagen (ist Miraru offen?)'],
    'Abre Miraru y vuelve a intentarlo': ['Open Miraru and try again', 'Ouvrez Miraru et réessayez', 'Öffne Miraru und versuch es erneut'],
    'Viendo ahora': ['Watching now', 'En cours', 'Läuft gerade'],
    'Aquí se apunta': ['Logged here', 'Noté ici', 'Hier wird eingetragen'],
    'película': ['movie', 'film', 'Film'],
    'No leo el nombre del episodio': ["Can't read the episode name", "Impossible de lire le nom de l'épisode", 'Kann den Folgennamen nicht lesen'],
    'Mueve el ratón sobre el vídeo para que salga el título.': ['Move the mouse over the video so the title shows.', 'Bougez la souris sur la vidéo pour afficher le titre.', 'Beweg die Maus über das Video, damit der Titel erscheint.'],
    'Abre el episodio desde su página.': ['Open the episode from its page.', "Ouvrez l'épisode depuis sa page.", 'Öffne die Folge über ihre Seite.'],
    '✓ Se apunta en Miraru': ['✓ Logged in Miraru', '✓ Noté dans Miraru', '✓ In Miraru eingetragen'],
    'Pulsa «✓ Marcar visto» en la página, o se apunta solo a los 15 min.': ['Press "✓ Mark watched" on the page, or it logs itself after 15 min.', 'Appuyez sur « ✓ Marquer vu » sur la page, ou il se note seul après 15 min.', 'Tippe auf der Seite auf „✓ Gesehen“, sonst wird es nach 15 Min. selbst eingetragen.'],
    'Se apunta al llegar al {u} % (vas por el {p} %).': ['Logged at {u}% (you are at {p}%).', 'Noté à {u} % (vous en êtes à {p} %).', 'Wird bei {u} % eingetragen (du bist bei {p} %).'],
    '✓ Apuntado en Miraru': ['✓ Logged in Miraru', '✓ Noté dans Miraru', '✓ In Miraru eingetragen'],
    '↩ Deshecho': ['↩ Undone', '↩ Annulé', '↩ Rückgängig gemacht'],
    '＋ Añadido a tu lista': ['＋ Added to your list', '＋ Ajouté à votre liste', '＋ Zu deiner Liste hinzugefügt'],
    '🏁 ¡Completado!': ['🏁 Completed!', '🏁 Terminé !', '🏁 Abgeschlossen!'],
    'Episodio {e}': ['Episode {e}', 'Épisode {e}', 'Folge {e}'],
    'Episodio {e} de {t}': ['Episode {e} of {t}', 'Épisode {e} sur {t}', 'Folge {e} von {t}'],
    'Episodio {e} · ✓ al día': ['Episode {e} · ✓ up to date', 'Épisode {e} · ✓ à jour', 'Folge {e} · ✓ aktuell'],
    'Episodio {e} de {t} emitidos': ['Episode {e} of {t} aired', 'Épisode {e} sur {t} diffusés', 'Folge {e} von {t} ausgestrahlt'],
    '({t} en total)': ['({t} in total)', '({t} au total)', '({t} insgesamt)'],
    '↩ Deshacer': ['↩ Undo', '↩ Annuler', '↩ Rückgängig'],
    'Deshaciendo…': ['Undoing…', 'Annulation…', 'Wird rückgängig gemacht…'],
    'No se pudo': ["Couldn't", 'Impossible', 'Fehlgeschlagen'],
    'Ya habías visto más': ['You had already watched more', "Vous aviez déjà vu plus loin", 'Du hattest schon mehr gesehen'],
    'Por si se apuntó el que no era': ['In case the wrong one was logged', 'Au cas où le mauvais aurait été noté', 'Falls die falsche Folge eingetragen wurde'],
    'Pulsa «Marcar como visto» en AnimeAV1 o AnimeFLV, o ve un anime en Netflix o Crunchyroll hasta casi el final: aparecerá aquí y en Miraru.': ['Press "Mark as watched" on AnimeAV1 or AnimeFLV, or watch an anime on Netflix or Crunchyroll almost to the end: it will show up here and in Miraru.', 'Appuyez sur « Marquer comme vu » sur AnimeAV1 ou AnimeFLV, ou regardez un anime sur Netflix ou Crunchyroll presque jusqu’au bout : il apparaîtra ici et dans Miraru.', 'Tippe auf AnimeAV1 oder AnimeFLV auf „Als gesehen markieren“ oder schau einen Anime auf Netflix oder Crunchyroll fast bis zum Ende: Er erscheint hier und in Miraru.'],
    'Antes': ['Earlier', 'Avant', 'Vorher'],
    'ep {e}': ['ep {e}', 'ép. {e}', 'F. {e}'],
    'Mis Listas de AnimeAV1': ['My AnimeAV1 lists', 'Mes listes AnimeAV1', 'Meine AnimeAV1-Listen'],
    'Se pasan a Miraru solas, sin repetir nada.': ['They move to Miraru by themselves, no duplicates.', 'Elles passent dans Miraru toutes seules, sans doublons.', 'Sie gehen von selbst zu Miraru, ohne Doppelte.'],
    'Traer ahora': ['Bring now', 'Importer', 'Jetzt holen'],
    'Leyendo…': ['Reading…', 'Lecture…', 'Wird gelesen…'],
    'Enviadas a Miraru {h}.': ['Sent to Miraru {h}.', 'Envoyées à Miraru {h}.', '{h} an Miraru gesendet.'],
    'Enviadas a Miraru {h} ({n} animes).': ['Sent to Miraru {h} ({n} anime).', 'Envoyées à Miraru {h} ({n} animes).', '{h} an Miraru gesendet ({n} Anime).'],
    'Al día · revisadas {h}.': ['Up to date · checked {h}.', 'À jour · vérifiées {h}.', 'Aktuell · {h} geprüft.'],
    'Inicia sesión en AnimeAV1 para traerlas.': ['Sign in to AnimeAV1 to bring them.', 'Connectez-vous à AnimeAV1 pour les importer.', 'Melde dich bei AnimeAV1 an, um sie zu holen.'],
    'Se mandarán al abrir Miraru.': ["They'll be sent when you open Miraru.", "Elles seront envoyées à l'ouverture de Miraru.", 'Sie werden gesendet, wenn du Miraru öffnest.'],
    'No se pudo: {d}.': ["Couldn't: {d}.", 'Impossible : {d}.', 'Fehlgeschlagen: {d}.'],
    'Abrir Miraru': ['Open Miraru', 'Ouvrir Miraru', 'Miraru öffnen'],
    'Enviar ahora': ['Send now', 'Envoyer', 'Jetzt senden'],
    'Guía': ['Guide', 'Guide', 'Anleitung'],
    'Ajustes': ['Settings', 'Réglages', 'Einstellungen'],
    'Idioma': ['Language', 'Langue', 'Sprache'],
    'Como Miraru': ['Same as Miraru', 'Comme Miraru', 'Wie Miraru'],
    'Puerto de Miraru:': ['Miraru port:', 'Port de Miraru :', 'Miraru-Port:'],
    '(normalmente 8765)': ['(usually 8765)', '(normalement 8765)', '(normalerweise 8765)'],
    'Extensión': ['Extension', 'Extension', 'Erweiterung'],
    'Buscar actualización': ['Check for updates', 'Rechercher une mise à jour', 'Nach Updates suchen'],
    'Buscando…': ['Checking…', 'Recherche…', 'Suche…'],
    'Hay una nueva ↑': ["There's a new one ↑", 'Une nouvelle est dispo ↑', 'Es gibt eine neue ↑'],
    'Ya tienes la última': ['You have the latest', 'Vous avez la dernière', 'Du hast die neueste'],
    '⚠ No se pudo apuntar «{t}»: {m}': ['⚠ Couldn’t log "{t}": {m}', '⚠ Impossible de noter « {t} » : {m}', '⚠ „{t}“ konnte nicht eingetragen werden: {m}'],
    // cola (Miraru cerrado)
    'Miraru está cerrado. Lo que veas se guarda aquí y se sube solo al abrirlo.': ["Miraru is closed. What you watch is saved here and uploads itself when you open it.", "Miraru est fermé. Ce que vous regardez est gardé ici et s'envoie tout seul à son ouverture.", 'Miraru ist geschlossen. Was du schaust, wird hier gespeichert und beim Öffnen automatisch hochgeladen.'],
    'Guardado en la extensión': ['Saved in the extension', "Gardé dans l'extension", 'In der Erweiterung gespeichert'],
    '{n} episodio guardado': ['{n} episode saved', '{n} épisode gardé', '{n} Folge gespeichert'],
    '{n} episodios guardados': ['{n} episodes saved', '{n} épisodes gardés', '{n} Folgen gespeichert'],
    'Se subirán solos al abrir Miraru.': ['They upload themselves when you open Miraru.', "Ils s'envoient seuls à l'ouverture de Miraru.", 'Sie werden beim Öffnen von Miraru automatisch hochgeladen.'],
    'Subiendo a Miraru…': ['Uploading to Miraru…', 'Envoi vers Miraru…', 'Wird zu Miraru hochgeladen…'],
    'Miraru no contesta: se reintenta solo.': ["Miraru isn't answering: it retries by itself.", 'Miraru ne répond pas : nouvel essai automatique.', 'Miraru antwortet nicht: wird automatisch erneut versucht.'],
    'desmarcar': ['unmark', 'décocher', 'Markierung entfernen'],
    'y {n} más': ['and {n} more', 'et {n} de plus', 'und {n} weitere'],
    // fondo (icono)
    'Miraru está cerrado: {n} guardado(s), se subirán al abrirlo': ['Miraru is closed: {n} saved, they upload when you open it', "Miraru est fermé : {n} gardé(s), envoi à l'ouverture", 'Miraru ist geschlossen: {n} gespeichert, Upload beim Öffnen'],
    'Apuntado en Miraru: {n}': ['Logged in Miraru: {n}', 'Noté dans Miraru : {n}', 'In Miraru eingetragen: {n}'],
    'No se pudo apuntar: {d}': ["Couldn't log: {d}", 'Impossible de noter : {d}', 'Konnte nicht eintragen: {d}'],
    'No pude leer qué episodio era': ["Couldn't read which episode it was", "Impossible de lire de quel épisode il s'agissait", 'Konnte nicht lesen, welche Folge es war'],
    'No pude leer el nombre del episodio en la página': ["Couldn't read the episode name on the page", "Impossible de lire le nom de l'épisode sur la page", 'Konnte den Folgennamen auf der Seite nicht lesen'],
    'Versión {v} de la extensión lista para instalar': ['Extension version {v} ready to install', "Version {v} de l'extension prête à installer", 'Version {v} der Erweiterung bereit zur Installation'],
    'Extensión actualizada a la versión {v}': ['Extension updated to version {v}', 'Extension mise à jour vers la version {v}', 'Erweiterung auf Version {v} aktualisiert'],
    // AnimeFLV
    'Plegar o abrir Miraru': ['Fold or open Miraru', 'Replier ou ouvrir Miraru', 'Miraru ein- oder ausklappen'],
    'Plegar': ['Fold', 'Replier', 'Einklappen'],
    '✓ Marcar visto': ['✓ Mark watched', '✓ Marquer vu', '✓ Gesehen'],
    'Deshacer': ['Undo', 'Annuler', 'Rückgängig'],
    'Ep {e} · ✓ apuntado en Miraru': ['Ep {e} · ✓ logged in Miraru', 'Ép. {e} · ✓ noté dans Miraru', 'F. {e} · ✓ in Miraru eingetragen'],
    'Ep {e} · deshecho, sin ver': ['Ep {e} · undone, not watched', 'Ép. {e} · annulé, non vu', 'F. {e} · rückgängig, nicht gesehen'],
    'Ep {e} · se apunta solo en {m} min': ['Ep {e} · logs itself in {m} min', 'Ép. {e} · noté tout seul dans {m} min', 'F. {e} · wird in {m} Min. selbst eingetragen'],
    'Ep {e} · se apunta solo a los 15 min': ['Ep {e} · logs itself after 15 min', 'Ép. {e} · noté tout seul après 15 min', 'F. {e} · wird nach 15 Min. selbst eingetragen'],
    'Recarga la página (se actualizó la extensión)': ['Reload the page (the extension was updated)', "Rechargez la page (l'extension a été mise à jour)", 'Lade die Seite neu (die Erweiterung wurde aktualisiert)'],
    // tiempo
    'hace un momento': ['just now', "à l'instant", 'gerade eben'],
    'hace {n} min': ['{n} min ago', 'il y a {n} min', 'vor {n} Min.'],
    'hace {n} h': ['{n} h ago', 'il y a {n} h', 'vor {n} Std.'],
  };
  // La guía tiene muchos textos: van en su propio bloque.
  const G = {
    '¡Listo! Ya está instalada': ["Done! It's installed", "C'est prêt ! Elle est installée", 'Fertig! Sie ist installiert'],
    'Instala la extensión de Miraru': ['Install the Miraru extension', "Installez l'extension Miraru", 'Installiere die Miraru-Erweiterung'],
    'Lo que veas en estas webs se apuntará solo en tu Miraru, en ese mismo momento.': ['What you watch on these sites logs itself in your Miraru, right away.', 'Ce que vous regardez sur ces sites se note tout seul dans votre Miraru, immédiatement.', 'Was du auf diesen Seiten schaust, wird sofort von selbst in deinem Miraru eingetragen.'],
    'Dónde funciona': ['Where it works', 'Où ça marche', 'Wo es funktioniert'],
    'Miraru abierto en tu PC': ['Miraru open on your PC', 'Miraru ouvert sur votre PC', 'Miraru auf deinem PC geöffnet'],
    'Comprobando…': ['Checking…', 'Vérification…', 'Wird geprüft…'],
    'Conectado con Miraru {v}. Perfecto.': ['Connected to Miraru {v}. Perfect.', 'Connecté à Miraru {v}. Parfait.', 'Mit Miraru {v} verbunden. Perfekt.'],
    'No encuentro Miraru. Ábrelo en tu PC (como siempre) y esto se pondrá en verde solo.': ["Can't find Miraru. Open it on your PC (as usual) and this turns green by itself.", 'Miraru introuvable. Ouvrez-le sur votre PC (comme d’habitude) et ceci passera au vert tout seul.', 'Miraru nicht gefunden. Öffne es auf deinem PC (wie immer), dann wird das hier von selbst grün.'],
    'La extensión, en tu navegador': ['The extension, in your browser', 'L’extension, dans votre navigateur', 'Die Erweiterung in deinem Browser'],
    'Instalada (versión {v}).': ['Installed (version {v}).', 'Installée (version {v}).', 'Installiert (Version {v}).'],
    'Aún no está en este navegador. Pulsa el botón: se abre la página de extensiones y la ruta queda copiada.': ["It's not in this browser yet. Press the button: the extensions page opens and the path is copied.", "Elle n'est pas encore dans ce navigateur. Appuyez sur le bouton : la page des extensions s'ouvre et le chemin est copié.", 'Sie ist noch nicht in diesem Browser. Tippe auf den Knopf: Die Erweiterungsseite öffnet sich und der Pfad ist kopiert.'],
    'Instalar la extensión': ['Install the extension', "Installer l'extension", 'Erweiterung installieren'],
    'Allí: activa «Modo de desarrollador», pulsa «Cargar descomprimida» y pega con Ctrl+V. Esta página se pondrá en verde sola.': ['There: turn on "Developer mode", press "Load unpacked" and paste with Ctrl+V. This page turns green by itself.', 'Là : activez « Mode développeur », cliquez sur « Charger l’extension non empaquetée » et collez avec Ctrl+V. Cette page passera au vert toute seule.', 'Dort: „Entwicklermodus“ aktivieren, „Entpackte Erweiterung laden“ klicken und mit Strg+V einfügen. Diese Seite wird von selbst grün.'],
    'Cómo se apunta en cada web': ['How each site logs', 'Comment chaque site note', 'So trägt jede Seite ein'],
    'No tienes que hacer nada más que ver tus episodios.': ["You don't have to do anything but watch your episodes.", "Vous n'avez rien d'autre à faire que regarder vos épisodes.", 'Du musst nichts weiter tun, als deine Folgen zu schauen.'],
    'Pulsa «Marcar como visto» debajo del vídeo. Desmarcarlo también se copia. Tus «Mis Listas» se pasan solas.': ['Press "Mark as watched" under the video. Unmarking is copied too. Your "My lists" move by themselves.', 'Appuyez sur « Marquer comme vu » sous la vidéo. Le décocher est aussi copié. Vos « Mes listes » passent toutes seules.', 'Tippe unter dem Video auf „Als gesehen markieren“. Das Entfernen wird auch übernommen. „Meine Listen“ gehen von selbst mit.'],
    'En la página del episodio sale una pastilla abajo a la derecha: «✓ Marcar visto». Si no la pulsas, se apunta sola a los 15 min de reproductor.': ['A pill shows up at the bottom right of the episode page: "✓ Mark watched". If you don’t press it, it logs itself after 15 min of playback.', 'Une pastille apparaît en bas à droite de la page de l’épisode : « ✓ Marquer vu ». Sinon, il se note tout seul après 15 min de lecture.', 'Unten rechts auf der Folgenseite erscheint eine Pille: „✓ Gesehen“. Wenn du sie nicht drückst, wird nach 15 Min. Wiedergabe automatisch eingetragen.'],
    'Se apunta solo al llegar al 80 % del episodio. Lo que no es anime no se apunta.': ["It logs itself at 80% of the episode. Anything that isn't anime isn't logged.", "Il se note tout seul à 80 % de l'épisode. Ce qui n'est pas de l'anime n'est pas noté.", 'Wird bei 80 % der Folge selbst eingetragen. Was kein Anime ist, wird nicht eingetragen.'],
    'Igual que Netflix: al 80 % del episodio, solo.': ['Same as Netflix: at 80% of the episode, by itself.', "Comme Netflix : à 80 % de l'épisode, tout seul.", 'Wie Netflix: bei 80 % der Folge, von selbst.'],
    'Lista': ['Ready', 'Prêt', 'Bereit'],
    'Sesión iniciada': ['Signed in', 'Connecté', 'Angemeldet'],
    'Inicia sesión →': ['Sign in →', 'Se connecter →', 'Anmelden →'],
    'Sin comprobar': ['Not checked', 'Non vérifié', 'Nicht geprüft'],
    'Entra en AnimeAV1 con tu cuenta': ['Sign in to AnimeAV1 with your account', 'Connectez-vous à AnimeAV1 avec votre compte', 'Melde dich mit deinem Konto bei AnimeAV1 an'],
    'Mientras ves algo en Netflix, Crunchyroll o AnimeFLV, el icono de Miraru enseña «Viendo ahora» con el episodio que ha leído y cuánto falta.': ['While you watch something on Netflix, Crunchyroll or AnimeFLV, the Miraru icon shows "Watching now" with the episode it read and how much is left.', 'Pendant que vous regardez sur Netflix, Crunchyroll ou AnimeFLV, l’icône de Miraru affiche « En cours » avec l’épisode lu et ce qu’il reste.', 'Während du auf Netflix, Crunchyroll oder AnimeFLV schaust, zeigt das Miraru-Symbol „Läuft gerade“ mit der erkannten Folge und der Restzeit.'],
    'Pruébalo con un episodio': ['Try it with an episode', 'Essayez avec un épisode', 'Probier es mit einer Folge aus'],
    'Marca un episodio en AnimeAV1 o AnimeFLV (o termina uno en Netflix o Crunchyroll) y aparecerá aquí.': ['Mark an episode on AnimeAV1 or AnimeFLV (or finish one on Netflix or Crunchyroll) and it will show up here.', 'Marquez un épisode sur AnimeAV1 ou AnimeFLV (ou terminez-en un sur Netflix ou Crunchyroll) et il apparaîtra ici.', 'Markiere eine Folge auf AnimeAV1 oder AnimeFLV (oder schau eine auf Netflix oder Crunchyroll zu Ende), dann erscheint sie hier.'],
    '✓ ¡Funciona! Apuntado en Miraru': ['✓ It works! Logged in Miraru', '✓ Ça marche ! Noté dans Miraru', '✓ Es funktioniert! In Miraru eingetragen'],
    '¡Ya está! A partir de ahora, lo que veas en AnimeAV1, AnimeFLV, Netflix o Crunchyroll aparecerá en Miraru.': ["Done! From now on, what you watch on AnimeAV1, AnimeFLV, Netflix or Crunchyroll will show up in Miraru.", "C'est fait ! Désormais, ce que vous regardez sur AnimeAV1, AnimeFLV, Netflix ou Crunchyroll apparaîtra dans Miraru.", 'Geschafft! Ab jetzt erscheint, was du auf AnimeAV1, AnimeFLV, Netflix oder Crunchyroll schaust, in Miraru.'],
    'Más información': ['More information', "Plus d'informations", 'Mehr Informationen'],
    'Tenla a mano': ['Keep it handy', 'Gardez-la à portée de main', 'Halte sie griffbereit'],
    'Pulsa la pieza de puzle 🧩 arriba a la derecha del navegador y la chincheta junto a «Miraru — episodios vistos». Su icono te avisa: ✓ apuntado, un número = guardados hasta que abras Miraru, ? no se pudo.': ['Press the puzzle piece 🧩 at the top right of the browser and the pin next to "Miraru — episodios vistos". Its icon tells you: ✓ logged, a number = saved until you open Miraru, ? couldn’t log.', 'Cliquez sur la pièce de puzzle 🧩 en haut à droite du navigateur puis sur l’épingle à côté de « Miraru — episodios vistos ». Son icône vous indique : ✓ noté, un nombre = gardés jusqu’à l’ouverture de Miraru, ? impossible.', 'Klicke oben rechts im Browser auf das Puzzleteil 🧩 und dann auf die Stecknadel neben „Miraru — episodios vistos“. Das Symbol zeigt: ✓ eingetragen, eine Zahl = gespeichert bis Miraru offen ist, ? fehlgeschlagen.'],
    'Solo mira lo que ves': ['It only looks at what you watch', 'Elle ne regarde que ce que vous voyez', 'Sie sieht nur, was du schaust'],
    'En AnimeAV1 solo se entera de cuándo marcas un episodio. En AnimeFLV, del nombre y el número del episodio que abres. En Netflix y Crunchyroll, del nombre del episodio que tienes delante y de cuánto llevas. No lee tu historial ni tu cuenta, y se lo cuenta solo a Miraru, en tu propio PC.': ['On AnimeAV1 it only learns when you mark an episode. On AnimeFLV, the name and number of the episode you open. On Netflix and Crunchyroll, the name of the episode in front of you and how far you are. It doesn’t read your history or account, and it only tells Miraru, on your own PC.', 'Sur AnimeAV1, elle sait seulement quand vous marquez un épisode. Sur AnimeFLV, le nom et le numéro de l’épisode ouvert. Sur Netflix et Crunchyroll, le nom de l’épisode affiché et où vous en êtes. Elle ne lit ni votre historique ni votre compte, et ne le dit qu’à Miraru, sur votre PC.', 'Auf AnimeAV1 erfährt sie nur, wann du eine Folge markierst. Auf AnimeFLV Name und Nummer der geöffneten Folge. Auf Netflix und Crunchyroll den Namen der aktuellen Folge und wie weit du bist. Sie liest weder Verlauf noch Konto und teilt es nur Miraru auf deinem eigenen PC mit.'],
    '¿Se apuntó el que no era?': ['Wrong episode logged?', 'Mauvais épisode noté ?', 'Falsche Folge eingetragen?'],
    'En la ventana de la extensión, «↩ Deshacer» lo quita (o «Marcar como no visto» en AnimeAV1). Y cuando haya una versión nueva de la extensión, la misma ventana te avisa y se instala con un botón.': ['In the extension window, "↩ Undo" removes it (or "Mark as unwatched" on AnimeAV1). And when there’s a new version of the extension, the same window tells you and installs it with one button.', 'Dans la fenêtre de l’extension, « ↩ Annuler » le retire (ou « Marquer comme non vu » sur AnimeAV1). Et quand une nouvelle version sort, la même fenêtre vous prévient et l’installe d’un clic.', 'Im Erweiterungsfenster entfernt „↩ Rückgängig“ sie (oder „Als nicht gesehen markieren“ auf AnimeAV1). Und gibt es eine neue Version, sagt dir dasselbe Fenster Bescheid und installiert sie mit einem Klick.'],
    'Si Miraru está cerrado': ['If Miraru is closed', 'Si Miraru est fermé', 'Wenn Miraru geschlossen ist'],
    'No se pierde nada: lo que veas se guarda en la extensión y se sube solo, en orden, en cuanto abras Miraru.': ['Nothing is lost: what you watch is saved in the extension and uploads itself, in order, as soon as you open Miraru.', 'Rien ne se perd : ce que vous regardez est gardé dans l’extension et s’envoie tout seul, dans l’ordre, dès que vous ouvrez Miraru.', 'Nichts geht verloren: Was du schaust, wird in der Erweiterung gespeichert und beim Öffnen von Miraru automatisch in der richtigen Reihenfolge hochgeladen.'],
  };
  for (const k in G) T[k] = G[k];

  let lang = 'es';
  function detectar(guardado, deMiraru) {
    const nav = (g.navigator && navigator.language || 'es').slice(0, 2).toLowerCase();
    return IDIOMAS.includes(guardado) ? guardado : IDIOMAS.includes(deMiraru) ? deMiraru : (IDIOMAS.includes(nav) ? nav : 'es');
  }
  function tr(s, vars) {
    let out = s;
    if (lang !== 'es' && T[s]) out = T[s][IDIOMAS.indexOf(lang) - 1] || s;
    if (vars) for (const k in vars) out = out.split('{' + k + '}').join(vars[k]);
    return out;
  }
  // Traduce el HTML escrito en español: textos y atributos title/aria-label/placeholder.
  function traducirDom(raiz) {
    if (lang === 'es' || !raiz) return;
    const norm = s => s.replace(/\s+/g, ' ').trim();
    const w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) {
      const p = n.parentElement;
      if (!p || p.closest('[data-no-i18n],script,style')) continue;
      const s = norm(n.nodeValue);
      if (s && T[s]) n.nodeValue = n.nodeValue.replace(/\S[\s\S]*\S|\S/, tr(s));
    }
    raiz.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = tr(el.getAttribute('data-i18n')); });
    raiz.querySelectorAll('[title],[aria-label],[placeholder]').forEach(el => {
      for (const a of ['title', 'aria-label', 'placeholder']) {
        const v = el.getAttribute(a);
        if (v && T[norm(v)]) el.setAttribute(a, tr(norm(v)));
      }
    });
    if (document.documentElement) document.documentElement.lang = lang;
  }
  // Lee el idioma (elegido o el de Miraru) del almacenamiento de la extensión.
  async function cargar() {
    try {
      if (g.chrome && chrome.storage && chrome.storage.local) {
        const {idioma, idiomaMiraru} = await chrome.storage.local.get(['idioma', 'idiomaMiraru']);
        lang = detectar(idioma, idiomaMiraru);
        return lang;
      }
    } catch (_) { /* fuera de la extensión */ }
    lang = detectar('', '');
    return lang;
  }
  g.MiraruI18n = {IDIOMAS, NOMBRES, tr, traducirDom, cargar, detectar,
                  poner: l => { lang = IDIOMAS.includes(l) ? l : 'es'; return lang; },
                  get lang() { return lang; }, textos: T};
})(typeof self !== 'undefined' ? self : this);
