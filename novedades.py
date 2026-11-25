"""Novedades de cada versión: lo que se enseña en la ventana «Novedades» la
primera vez que se abre Miraru tras actualizar.

Cada versión tiene su tarjeta. Quien se salta versiones (p. ej. de la 2.14 a
la 2.16) ve las novedades de todas las que se perdió, la más nueva primero.
"""
from __future__ import annotations

# Para añadir una versión: una entrada nueva ARRIBA del todo.
# icono: emoji · titulo: corto (≤ 40 letras) · texto: una o dos frases (qué hace y para qué).
# accion (opcional): {"texto": "...", "url": "/app#..."} → botón dentro del punto.
# donde (opcional): ["Más", "Navegador"] → «Dónde está: Más › Navegador».
# pasos (opcional): frases cortas → «Cómo empezar», numeradas.
NOVEDADES: list[dict] = [
    {
        "version": "2.18.6",
        "titulo": "Añadir ya no se equivoca de anime",
        "silenciosa": True,
        "puntos": [
            {"icono": "🎯", "titulo": "El anime que buscas, no otro",
             "texto": "Con títulos muy largos, al añadir podía colarse otro anime cuyo nombre era solo una palabra del título (por ejemplo «Saki»). Arreglado."},
        ],
    },
    {
        "version": "2.18.5",
        "titulo": "Géneros en tu idioma",
        "puntos": [
            {"icono": "🎭", "titulo": "Géneros traducidos",
             "texto": "Acción, Comedia, Recuentos de la vida…: los géneros salen en tu idioma en la lista, en Estadísticas (anime, manga y series y pelis), en Novedades y en Recomendados."},
            {"icono": "✨", "titulo": "«Mi año en anime», más claro",
             "texto": "Si ya ibas avanzado en un anime cuando empezaste a usar Miraru, ahora dice «vas por el ep 21»: este año solo cuentan los episodios que marcaste tú. Y los títulos largos ya no se montan en la imagen."},
        ],
    },
    {
        "version": "2.18.4",
        "titulo": "Tu año en anime, para stories",
        "puntos": [
            {"icono": "📱", "titulo": "«Mi año en anime» en vertical",
             "texto": "Nuevo botón «Para stories»: la misma tarjeta en formato vertical, lista para Instagram, TikTok o WhatsApp.",
             "donde": ["Estadísticas", "Mi año en anime"]},
        ],
    },
    {
        "version": "2.18.3",
        "titulo": "Nombre nuevo en la Store",
        "puntos": [
            {"icono": "🔎", "titulo": "Ahora es «Miraru: Anime Tracker»",
             "texto": "En la Microsoft Store Miraru se llama así para que lo encuentre más gente. En tu PC sigue siendo Miraru y tu lista no cambia."},
            {"icono": "📱", "titulo": "El móvil, entero en tu idioma",
             "texto": "La versión del móvil ya traduce el estado de la conexión, el aviso de que el código caduca y «Añadir a pantalla de inicio»."},
        ],
    },
    {
        "version": "2.18.2",
        "titulo": "Arranque más fino",
        "puntos": [
            {"icono": "🪟", "titulo": "«Abriendo Miraru…», siempre a tiempo",
             "texto": "La ventanita de arranque se cierra en cuanto Miraru está listo y ya no se queda abierta de más."},
        ],
    },
    {
        "version": "2.18.1",
        "titulo": "Retoma donde lo dejaste",
        "puntos": [
            {"icono": "▶️", "titulo": "Retomar por donde lo dejaste",
             "texto": "Si apagas el PC o cierras el navegador a mitad de un episodio de AnimeAV1, al abrir Miraru te ofrece seguir justo en ese minuto. Un clic y el vídeo arranca donde ibas.",
             "donde": ["Inicio", "Anime"],
             "pasos": ["Abre la ventana de la extensión y pulsa «Actualizar» si te lo pide."]},
            {"icono": "📊", "titulo": "Estadísticas de todo",
             "texto": "Estadísticas tiene ahora tres pestañas: Anime, Manga y Series y pelis. Y una lista nueva, «Viendo actualmente», con lo que llevas a medias.",
             "donde": ["Estadísticas"],
             "accion": {"texto": "Ver mis estadísticas", "url": "/stats"}},
            {"icono": "✨", "titulo": "Plus, de estreno y gratis",
             "texto": "Mientras se abre la venta en la Microsoft Store, Miraru Plus es gratis para todos. Además: los avisos del móvil llevan la portada y te llevan al anime, y hay cifras nuevas en «Tus hábitos».",
             "donde": ["Más", "Miraru Plus"]},
            {"icono": "🧩", "titulo": "Ajustes de la extensión, más claros",
             "texto": "Los ajustes de la ventana de la extensión van ahora en grupos, con interruptores y una explicación debajo de cada uno.",
             "donde": ["Extensión", "Ajustes"]},
            {"icono": "🧹", "titulo": "Arreglos",
             "texto": "Miraru a veces no arrancaba (código -2147483645) por la ventanita «Abriendo Miraru…»: ahora va aparte y no puede tumbarlo. En el recorrido, «Siguiente» ya no se sale de la tarjeta."},
        ],
    },
    {
        "version": "2.18.0",
        "titulo": "Llega Miraru Plus",
        "puntos": [
            {"icono": "✨", "titulo": "Miraru Plus, opcional",
             "texto": "Una suscripción con funciones extra, por 2,49 € al mes o 19,99 € al año, que se paga en la Microsoft Store. Todo lo que ya tenías sigue gratis y sin anuncios.",
             "donde": ["Más", "Miraru Plus"],
             "accion": {"texto": "Ver Miraru Plus", "url": "/app#plus"}},
            {"icono": "📲", "titulo": "Avisos en el móvil",
             "texto": "Con Plus, cuando sale un episodio de lo que sigues te llega un aviso al móvil, aunque no estés en casa.",
             "donde": ["Más", "Miraru Plus"],
             "pasos": ["Instala la app gratuita «ntfy» en tu móvil.",
                       "En Miraru Plus, pulsa «Activar avisos en el móvil».",
                       "Escanea el código con el móvil y pulsa «Probar»."]},
            {"icono": "🔄", "titulo": "Tu lista en todos tus PCs",
             "texto": "Con Plus, lo que marcas en un PC aparece en los demás. Usa la carpeta de tu nube de la copia de seguridad y nunca borra nada.",
             "donde": ["Más", "Miraru Plus"]},
            {"icono": "📊", "titulo": "Estadísticas avanzadas",
             "texto": "Con Plus: a qué horas y qué días ves más anime, tu ritmo, tu maratón más largo y cuánto te falta de lo que estás viendo. «Mi año en anime» suma tus hábitos del año.",
             "donde": ["Estadísticas", "Tus hábitos"]},
            {"icono": "🎨", "titulo": "Temas exclusivos",
             "texto": "Seis colores nuevos para Miraru, solo con Plus: Sakura, Aurora, Atardecer, Medianoche, Oro y Neón.",
             "donde": ["🎨 abajo a la derecha", "Color de acento"]},
            {"icono": "⏭️", "titulo": "Saltar opening y siguiente, en Plus",
             "texto": "Saltar el opening y pasar solo al siguiente episodio en AnimeAV1 pasan a ser de Miraru Plus. Marcar episodios desde la extensión sigue gratis.",
             "donde": ["Extensión", "AnimeAV1", "Debajo del vídeo"]},
            {"icono": "🧹", "titulo": "Arreglos",
             "texto": "Si un anime entró como completado al importar una lista y marcas en AnimeAV1 un episodio anterior, Miraru lo corrige y te deja en ese episodio. La ventana de la extensión ya no dice «¡Completado!» si no lo has terminado."},
        ],
    },
    {
        "version": "2.17.11",
        "titulo": "Del ending al siguiente, solo",
        "puntos": [
            {"icono": "⏩", "titulo": "Siguiente automático, encendido",
             "texto": "En AnimeAV1, cuando empieza el ending, la extensión marca el episodio como visto (también en Miraru, aunque no tengas la sesión de AnimeAV1 abierta) y pasa sola al siguiente. Se puede apagar.",
             "donde": ["Extensión", "AnimeAV1", "Debajo del vídeo"],
             "pasos": ["Abre la ventana de la extensión y pulsa «Actualizar» si te lo pide."]},
            {"icono": "⏭️", "titulo": "Saltar opening en más servidores",
             "texto": "Ya no hace falta elegir «HLS»: también funciona en Byse, VidHide, MP4Upload, YourUpload y otros que usan un vídeo normal.",
             "donde": ["Extensión", "AnimeAV1", "Debajo del vídeo"]},
            {"icono": "🖼️", "titulo": "Portadas que faltaban",
             "texto": "Si un anime se quedó sin portada porque no se encontraba, Miraru la busca en otra fuente y solo la pone si el título coincide de verdad."},
            {"icono": "🧹", "titulo": "Arreglos",
             "texto": "El calendario ya no deja un día suelto en otra fila y, en la versión del móvil, el aviso de «tira para refrescar» ya no asoma por arriba."},
        ],
    },
    {
        "version": "2.17.10",
        "titulo": "Calendario nuevo y pantallas más claras",
        "puntos": [
            {"icono": "📅", "titulo": "La semana entera, de un vistazo",
             "texto": "El calendario enseña los siete días con lo que sale cada uno, la hora y cuánto falta para lo de hoy. Los días sin nada salen en gris, así sabes cuándo toca.",
             "donde": ["Anime", "Calendario"],
             "accion": {"texto": "Abrir el calendario", "url": "/calendario"}},
            {"icono": "📥", "titulo": "Importar, más claro",
             "texto": "Traer tu lista desde AniList o MyAnimeList va primero y con pasos numerados. Pegar una lista de nombres sigue ahí, plegado debajo.",
             "donde": ["Más", "Importar"]},
            {"icono": "📱", "titulo": "Conectar el móvil, paso a paso",
             "texto": "La pantalla del móvil explica en tres pasos cómo conectarlo, y ya sale entera en tu idioma.",
             "donde": ["Más", "Móvil"]},
            {"icono": "🧹", "titulo": "Arreglos",
             "texto": "La versión del móvil ya sale en tu idioma, los botones de abajo a la derecha no tapan lo último de cada página, el menú de inicio cabe en el móvil, el tema claro se lee mejor y lo que sale en menos de una hora dice los minutos que faltan."},
            {"icono": "☕", "titulo": "Apoyar Miraru, nueva dirección",
             "texto": "«Más → Apoyar Miraru» lleva ahora a ko-fi.com/miraru.",
             "donde": ["Más", "Apoyar Miraru"]},
        ],
    },
    {
        "version": "2.17.9",
        "titulo": "Saltar openings en AnimeAV1",
        "puntos": [
            {"icono": "⏭️", "titulo": "Saltar opening",
             "texto": "Cuando empieza el opening sale «Saltar opening» dentro del vídeo, también a pantalla completa. Si dejas el interruptor encendido, lo salta solo y te ofrece «Ver opening» por si querías verlo.",
             "donde": ["Extensión", "AnimeAV1", "Debajo del vídeo"],
             "pasos": ["Abre la ventana de la extensión y pulsa «Actualizar» si te lo pide.",
                       "En AnimeAV1, abre un episodio y elige el servidor «HLS».",
                       "Enciende «Saltar opening» debajo del vídeo."],
             "accion": {"texto": "Ver la guía de la extensión", "url": "/extension"}},
            {"icono": "⏩", "titulo": "Siguiente automático",
             "texto": "A los 2 segundos de empezar el ending sale una cuenta atrás y pasa solo al siguiente episodio. Antes marca como visto el que acabas de terminar, así que se apunta en Miraru sin hacer nada. «Cancelar» lo detiene.",
             "donde": ["Extensión", "AnimeAV1", "Debajo del vídeo"]},
            {"icono": "⏱️", "titulo": "Sabe cuándo empieza cada cosa",
             "texto": "Al lado de los interruptores ves cuándo empiezan el opening y el ending de ese episodio. Si un episodio no tiene tiempos guardados, el botón salta 85 segundos.",
             "donde": ["Extensión", "AnimeAV1", "Debajo del vídeo"]},
            {"icono": "⚙️", "titulo": "Todo se puede apagar",
             "texto": "En los ajustes de la extensión eliges si salta los openings solo, si pasa al siguiente episodio y si marca como visto al pasar.",
             "donde": ["Extensión", "Ajustes", "AnimeAV1"]},
            {"icono": "🪟", "titulo": "Abrir y cerrar, más fino",
             "texto": "Mientras Miraru arranca sale una ventanita «Abriendo Miraru…». Y al apagar el PC, cerrar sesión o actualizarse desde la Store, Miraru se cierra guardando todo, sin que Windows diga que no responde."},
        ],
    },
    # silenciosa: solo arreglos; no abre la ventana de novedades.
    {
        "version": "2.17.8",
        "silenciosa": True,
        "titulo": "Arreglos",
        "puntos": [
            {"icono": "🪟", "titulo": "Un aviso cada vez",
             "texto": "Las novedades y la elección de navegador ya no salen una encima de otra: primero una y, al cerrarla, la siguiente."},
            {"icono": "🧹", "titulo": "Menú «Más» más limpio",
             "texto": "Fuera «Aleatorio»."},
        ],
    },
    {
        "version": "2.17.7",
        "titulo": "Tu navegador, tus ideas y temporadas al día",
        "puntos": [
            {"icono": "🧭", "titulo": "Elige tu navegador",
             "texto": "Miraru se abre en el navegador que elijas. Puedes cambiarlo cuando quieras en «Más → Navegador».",
             "donde": ["Más", "Navegador"]},
            {"icono": "🐞", "titulo": "Reportar un bug",
             "texto": "En «Más → Reportar un bug» puedes contarme un fallo o una idea: me llega directamente.",
             "donde": ["Más", "Reportar un bug"]},
            {"icono": "🆕", "titulo": "Temporadas nuevas, a fondo",
             "texto": "Miraru sigue toda la cadena de secuelas de lo que ves o has visto, y enseña las que ya se emiten o acaban de terminar.",
             "donde": ["Anime", "Temporadas nuevas de lo que viste"]},
            {"icono": "🧩", "titulo": "Extensión en tu idioma",
             "texto": "La extensión habla español, inglés, francés y alemán, guarda lo que ves aunque Miraru esté cerrado y su guía tiene dirección corta: 127.0.0.1:8765/extension.",
             "donde": ["Extensión", "Ajustes", "Idioma"],
             "accion": {"texto": "Ver la extensión", "url": "/extension"}},
        ],
    },
    {
        "version": "2.17.6",
        "titulo": "La extensión se actualiza sola",
        "puntos": [
            {"icono": "⬆️", "titulo": "Actualizar desde la extensión",
             "texto": "Cuando haya una versión nueva de la extensión, su ventana te avisa y se instala con un botón, sin ir a la página de extensiones.",
             "donde": ["Extensión", "Ventana de la extensión"]},
            {"icono": "🧩", "titulo": "También en animeflv.or.at",
             "texto": "La pastilla «✓ Marcar visto» sale en los episodios de animeflv.or.at y cuenta el tiempo desde que pulsas el reproductor.",
             "accion": {"texto": "Ver la extensión", "url": "/app#extension"}},
        ],
    },
    # silenciosa: solo arreglos; no abre la ventana de novedades.
    {
        "version": "2.17.5",
        "silenciosa": True,
        "titulo": "Arreglos",
        "puntos": [
            {"icono": "📡", "titulo": "Continuar, primero lo que puedes ver",
             "texto": "En «Continuar», lo que está al día con lo emitido va detrás, y los que se emiten dicen cuántos episodios han salido («Ep 3 · 6 emitidos»)."},
            {"icono": "🧩", "titulo": "Extensión: «Viendo ahora»",
             "texto": "La ventana de la extensión enseña lo que estás viendo en Netflix, Crunchyroll o AnimeFLV y cuánto falta para que se apunte."},
        ],
    },
    # silenciosa: solo arreglos; no abre la ventana de novedades.
    {
        "version": "2.17.4",
        "silenciosa": True,
        "titulo": "Arreglos",
        "puntos": [
            {"icono": "🆕", "titulo": "Temporadas nuevas, solo las que ya salen",
             "texto": "«Temporadas nuevas de lo que viste» ya no enseña lo anunciado para dentro de meses: solo lo que está en emisión y tiene algún episodio."},
        ],
    },
    {
        "version": "2.17.3",
        "titulo": "Animes en emisión, bien contados",
        "puntos": [
            {"icono": "📡", "titulo": "Al día con lo emitido",
             "texto": "En los animes que aún se están emitiendo, Miraru cuenta los episodios que ya han salido: «7/7 emitidos» y «✓ Al día» en vez de «Ep 8 / 13». El «+1» no pasa de lo emitido y no se pueden marcar como completados hasta que acaben."},
            {"icono": "↩️", "titulo": "Deshacer en la extensión",
             "texto": "Si se apunta un episodio que no era (o lo desmarcas en AnimeAV1), Miraru lo corrige: la ventana de la extensión tiene «Deshacer»."},
            {"icono": "🧩", "titulo": "AnimeFLV, y Netflix más fiable",
             "texto": "La extensión también funciona en AnimeFLV: «✓ Marcar visto» en la página del episodio. En Netflix lee el episodio aunque los controles estén ocultos. Pulsa ↻ en su tarjeta de extensiones para actualizarla.",
             "accion": {"texto": "Ver la extensión", "url": "/app#extension"}},
        ],
    },
    {
        "version": "2.17.2",
        "titulo": "Inicio nuevo",
        "puntos": [
            {"icono": "🚪", "titulo": "Anime, manga y series, de un vistazo",
             "texto": "La pantalla de inicio tiene una tarjeta por apartado con lo que llevas en cada uno, y «Continuar» incluye también tus mangas.",
             "accion": {"texto": "Ver el inicio", "url": "/"}},
            {"icono": "🎨", "titulo": "Con tu color",
             "texto": "El título, los botones y las barras del inicio usan el color que elijas en 🎨."},
            {"icono": "☕", "titulo": "Apoya Miraru",
             "texto": "Miraru sigue siendo gratis y sin anuncios. Si te gusta, en «Más → Apoyar Miraru» puedes invitarme a un café."},
        ],
    },
    # silenciosa: solo arreglos; no abre la ventana de novedades.
    {
        "version": "2.17.1",
        "silenciosa": True,
        "titulo": "Arreglos",
        "puntos": [
            {"icono": "🧭", "titulo": "Recorrido más limpio",
             "texto": "El botón «Siguiente» del recorrido ya no sale con un doble borde."},
        ],
    },
    {
        "version": "2.17.0",
        "titulo": "Manga aparte y el móvil con un toque",
        "puntos": [
            {"icono": "📖", "titulo": "Manga, en su propio apartado",
             "texto": "Pulsa «Manga» en la cabecera: tus mangas van aparte del anime, con sus capítulos y su «+1» también en los que siguen publicándose.",
             "accion": {"texto": "Abrir Manga", "url": "/manga"}},
            {"icono": "📱", "titulo": "El móvil, con un toque",
             "texto": "En «Más → Móvil» pulsa «Conectar el móvil» y escanea el código con la cámara. Sin PIN ni reiniciar, y no vuelve a pedirlo aunque apagues el PC.",
             "accion": {"texto": "Conectar el móvil", "url": "/mobile"}},
            {"icono": "🔗", "titulo": "AniList con un botón",
             "texto": "Pulsa «Conectar», autoriza en AniList y listo. Subir tu lista ahora tarda segundos: solo se sube lo que ha cambiado.",
             "accion": {"texto": "Conectar AniList", "url": "/app#anilist"}},
            {"icono": "📺", "titulo": "Netflix y Crunchyroll",
             "texto": "La extensión del navegador apunta sola los episodios de anime que terminas en Netflix y Crunchyroll, y ahora se instala en dos clics.",
             "accion": {"texto": "Instalar la extensión", "url": "/app#extension"}},
            {"icono": "📥", "titulo": "Trae tu lista entera",
             "texto": "Con tu usuario de AniList o el archivo de MyAnimeList, tu lista entra de golpe con estados, notas y progreso.",
             "accion": {"texto": "Traer mi lista", "url": "/import"}},
            {"icono": "🆕", "titulo": "Temporadas nuevas de lo que viste",
             "texto": "Si algo que completaste tiene una temporada nueva (o anunciada), sale arriba de tu lista para añadirla con un clic."},
            {"icono": "⋯", "titulo": "Cabecera más despejada",
             "texto": "Lo de cada día queda a la vista y lo demás está en «Más». «No Anime» pasa a llamarse «Series y pelis»."},
            {"icono": "🔁", "titulo": "Revisionados y fechas",
             "texto": "Apunta cuántas veces has vuelto a ver algo y corrige el día en que viste cada episodio. La ficha guarda lo avanzado en «Más opciones»."},
            {"icono": "🌍", "titulo": "«Mi año en anime» en tu idioma",
             "texto": "Los meses, las frases y los botones salen ya en inglés, francés o alemán si usas Miraru en esos idiomas."},
        ],
    },
    {
        "version": "2.16.3",
        "titulo": "Menos repetidos y más notas de IMDb",
        "puntos": [
            {"icono": "🧹", "titulo": "Repetidos, también sin identificar",
             "texto": "Miraru junta ahora los animes repetidos aunque uno no estuviera identificado, y lo hace nada más arrancar."},
            {"icono": "⭐", "titulo": "IMDb en casi todo",
             "texto": "La nota sale abajo a la izquierda de cada portada y ahora también en temporadas sin ficha propia (llevan la de su serie)."},
            {"icono": "🔔", "titulo": "Avisos más claros",
             "texto": "El número rojo del botón Avisos son episodios nuevos que aún no has visto."},
            {"icono": "📚", "titulo": "Temporadas de verdad",
             "texto": "Las carpetas dicen «T3 P2», «Final» u «OVA» en vez de numerar cada entrada, y van en orden de emisión."},
            {"icono": "🧭", "titulo": "Recorrido renovado",
             "texto": "Se adapta a tu lista y enseña lo nuevo. Repítelo con el botón «?».",
             "accion": {"texto": "Verlo ahora", "url": "/app#recorrido"}},
            {"icono": "🧩", "titulo": "AnimeAV1 más listo",
             "texto": "Lo que ya viste entero en AnimeAV1 entra como completado y lo que llevas a medias, como viendo."},
        ],
    },
    {
        "version": "2.16.2",
        "titulo": "Anime y manga, cada uno en su sitio",
        "puntos": [
            {"icono": "📖", "titulo": "Pestañas Anime y Manga",
             "texto": "Si tienes manga, arriba de tu lista eliges qué ver: anime, manga o todo. Las cifras de la cabecera van con la pestaña."},
            {"icono": "🔍", "titulo": "Buscar manga de verdad",
             "texto": "Con «📖 Manga» elegido, el buscador encuentra y añade manga (antes podía guardarlo como anime)."},
            {"icono": "🤝", "titulo": "El manga y su anime, juntos sin chocar",
             "texto": "Ya puedes tener el anime y el manga de la misma obra aunque se llamen igual, y AniList no mezcla sus progresos."},
            {"icono": "📊", "titulo": "Horas y logros solo con anime",
             "texto": "Los capítulos leídos dan su propia XP y ya no cuentan como horas de anime ni para tu rango ninja."},
        ],
    },
    {
        "version": "2.16.1",
        "titulo": "Sin repetidos y con nota de IMDb",
        "puntos": [
            {"icono": "🧹", "titulo": "Adiós a los repetidos",
             "texto": "Si un anime estaba dos veces (con nombres distintos según de dónde llegó), Miraru los junta en uno sin perder nada."},
            {"icono": "⭐", "titulo": "Nota de IMDb",
             "texto": "Cada anime lleva su nota de IMDb en una esquina, en tu lista y al buscar."},
            {"icono": "🧩", "titulo": "Tus listas de AnimeAV1",
             "texto": "La extensión trae también lo que tienes en «Mis Listas» de AnimeAV1, sin duplicar nada.",
             "accion": {"texto": "Ver la extensión", "url": "/app#extension"}},
            {"icono": "🏅", "titulo": "Niveles y logros renovados",
             "texto": "Títulos por nivel, de dónde sale tu XP, tu camino ninja y cuánto te falta para cada logro.",
             "accion": {"texto": "Ver mis logros", "url": "/stats#logros-section"}},
            {"icono": "📸", "titulo": "«Mi año en anime», más visual",
             "texto": "La imagen para compartir lleva las portadas de lo que más viste."},
            {"icono": "🎬", "titulo": "«Pelis» ahora es «No Anime»",
             "texto": "Y en Estadísticas puedes pulsar Completados, Viendo ahora o Episodios este año para ver la lista."},
        ],
    },
    {
        "version": "2.16.0",
        "titulo": "Más rápida, más clara y con recorrido guiado",
        "puntos": [
            {"icono": "🧭", "titulo": "Recorrido por la app",
             "texto": "Te enseñamos cada parte de Miraru paso a paso. Repítelo cuando quieras con el botón «?» de abajo a la derecha.",
             "accion": {"texto": "Verlo ahora", "url": "/app#recorrido"}},
            {"icono": "📊", "titulo": "Tu «Mi año en anime»",
             "texto": "Meses, rachas, lo que más viste y una imagen para compartir. Y las estadísticas, con dos cifras nuevas.",
             "accion": {"texto": "Ver mi año", "url": "/stats#mi-ano"}},
            {"icono": "📱", "titulo": "En el móvil, sin instalar nada",
             "texto": "Escanea un QR y Miraru se abre en el navegador de tu móvil (misma WiFi).",
             "accion": {"texto": "Activarlo", "url": "/mobile"}},
            {"icono": "📂", "titulo": "Compartir por carpetas",
             "texto": "Tu biblioteca compartida separa anime de series y películas, con cada saga en su carpeta."},
            {"icono": "✨", "titulo": "Más cómoda",
             "texto": "Un solo menú al buscar, desplegables más claros y la lista ya no salta arriba sola."},
            {"icono": "📗", "titulo": "Google Sheets al día",
             "texto": "Cualquier cambio llega a tu hoja de cálculo sola, también lo que viene de AniList o AnimeAV1."},
        ],
    },
    {
        "version": "2.15.0",
        "titulo": "Tu lista, a salvo en tu nube",
        "puntos": [
            {"icono": "☁️", "titulo": "Copia en la nube automática",
             "texto": "Miraru guarda una copia en tu OneDrive, Google Drive o Dropbox. Si formateas el PC, la recuperas con un clic.",
             "accion": {"texto": "Ver mi copia", "url": "/app#copia"}},
            {"icono": "🧩", "titulo": "Conecta AnimeAV1",
             "texto": "Con la extensión para Chrome, cada episodio que marcas como visto en AnimeAV1 se apunta solo en Miraru.",
             "accion": {"texto": "Cómo se instala", "url": "/app#animeav1"}},
            {"icono": "🔔", "titulo": "Aviso de actualizaciones",
             "texto": "Cuando salga una versión nueva te avisaremos con lo que trae."},
        ],
    },
]


def _clave(v: str) -> tuple:
    out = []
    for p in (v or "0").split("."):
        try:
            out.append(int(p))
        except ValueError:
            out.append(0)
    return tuple(out)


def pendientes(vista: str | None, actual: str, maximo: int = 3) -> list[dict]:
    """Versiones con novedades que el usuario aún no ha visto: más nuevas que
    `vista` y no más nuevas que `actual` (por si el código va por delante)."""
    v0, v1 = _clave(vista or "0"), _clave(actual)
    out = [n for n in NOVEDADES if v0 < _clave(n["version"]) <= v1 and not n.get("silenciosa")]
    out.sort(key=lambda n: _clave(n["version"]), reverse=True)
    return out[:maximo]
