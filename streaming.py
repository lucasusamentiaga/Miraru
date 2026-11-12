"""Netflix y Crunchyroll → Miraru (v2.17).

La extensión del navegador ve qué episodio terminas (pasado el ~80 %) y manda
lo que enseña la página: el nombre de la serie, la temporada y el episodio
(«Attack on Titan · T3:E5»). Aquí se averigua qué anime de AniList es:

1. Se busca la serie en AniList y solo vale un título que case ENTERO (inglés,
   romaji, nativo o un sinónimo). Así «Stranger Things» o un reality nunca se
   convierten en un anime parecido: lo que no es anime no se apunta.
2. Las temporadas se recorren por las secuelas de AniList (solo series de
   TV/ONA; películas, OVAs y especiales no cuentan como temporada). Si la
   página numera los episodios seguidos (T2:E26), se descuentan los de las
   temporadas anteriores.
3. Si la serie no está en AniList con ese nombre (Netflix lo traduce), se mira
   también tu propia lista por si la tienes guardada con ese nombre.

La cadena de temporadas de cada serie se guarda para no preguntar a AniList
en cada episodio.
"""
from __future__ import annotations

import json
import re
import unicodedata
from collections.abc import Callable
from typing import Optional

import database as db
from scrapers import adulto
from scrapers import anilist as al

_FORMATOS_SERIE = {"TV", "TV_SHORT", "ONA"}
_FORMATOS_PELI = {"MOVIE"}
_MAX_TEMPORADAS = 12
_CFG = "streaming_series"

_CAMPOS = """
      id isAdult popularity format status episodes
      title { romaji english native }
      synonyms
      coverImage { large }
      genres
      description(asHtml: false)
      nextAiringEpisode { episode }
      relations { edges { relationType node { id type format } } }
"""

QUERY_BUSCAR = """
query ($search: String) {
  Page(perPage: 10) {
    media(search: $search, type: ANIME, sort: SEARCH_MATCH, isAdult: false) {""" + _CAMPOS + """}
  }
}
"""

QUERY_ID = """
query ($id: Int) {
  Media(id: $id, type: ANIME) {""" + _CAMPOS + """}
}
"""


def norm(t: str) -> str:
    t = unicodedata.normalize("NFKD", t or "").encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "", t.lower())


def _titulos(media: dict) -> list[str]:
    t = media.get("title") or {}
    return [x for x in (t.get("english"), t.get("romaji"), t.get("native"), *(media.get("synonyms") or [])) if x]


def casa_entero(nombre: str, media: dict) -> bool:
    """El nombre de la página es, entero, uno de los títulos del anime."""
    q = norm(nombre)
    return bool(q) and any(norm(t) == q for t in _titulos(media))


def _secuela_serie(media: dict) -> Optional[int]:
    for e in ((media.get("relations") or {}).get("edges") or []):
        n = e.get("node") or {}
        if e.get("relationType") == "SEQUEL" and n.get("type") == "ANIME" and n.get("format") in _FORMATOS_SERIE:
            return int(n["id"])
    return None


def _episodios(media: dict) -> int:
    eps = int(media.get("episodes") or 0)
    if not eps:
        nae = (media.get("nextAiringEpisode") or {}).get("episode") or 0
        eps = max(0, int(nae) - 1)
    return eps


def _buscar(nombre: str, pelicula: bool, post: Callable) -> Optional[dict]:
    """El anime (TV/ONA o película) cuyo título es exactamente `nombre`."""
    data = post(QUERY_BUSCAR, {"search": nombre}, timeout=15)
    medias = [m for m in ((data.get("Page") or {}).get("media") or []) if m and not m.get("isAdult")]
    formatos = _FORMATOS_PELI if pelicula else _FORMATOS_SERIE
    casan = [m for m in medias if m.get("format") in formatos and casa_entero(nombre, m)]
    if not casan:
        return None
    return max(casan, key=lambda m: m.get("popularity") or 0)


def _alargar(cadena: list[dict], hasta: int, post: Callable) -> bool:
    """Añade secuelas de TV a la cadena hasta tener `hasta` temporadas (solo
    las que hacen falta: recorrer toda una saga larga tardaba casi un minuto).
    Devuelve True si ha añadido alguna."""
    out = cadena
    vistos = {m["id"] for m in out}
    actual = out[-1]
    antes = len(out)
    while len(out) < min(hasta, _MAX_TEMPORADAS):
        sid = _secuela_serie(actual)
        if not sid or sid in vistos:
            break
        m = (post(QUERY_ID, {"id": sid}, timeout=15) or {}).get("Media")
        if not m:
            break
        out.append(m)
        vistos.add(sid)
        actual = m
    return len(out) > antes


def _guardadas() -> dict:
    try:
        d = json.loads(db.get_config(_CFG) or "{}")
        return d if isinstance(d, dict) else {}
    except Exception:
        return {}


def _guardar(clave: str, valor) -> None:
    d = _guardadas()
    d[clave] = valor
    if len(d) > 300:                    # que no crezca sin fin
        for k in list(d)[:len(d) - 300]:
            d.pop(k, None)
    db.set_config(_CFG, json.dumps(d, separators=(",", ":"), ensure_ascii=False))


_RE_PARTE = re.compile(r"\b(?:part|cour)\s*(\d+)|\b(\d+)(?:st|nd|rd|th)\s+(?:part|cour)\b", re.I)


def _es_parte(media: dict) -> bool:
    """«Season 3 Part 2», «Cour 2», «2nd Part»: en Netflix y Crunchyroll suele
    ser la misma temporada que la entrada anterior."""
    for t in _titulos(media)[:2]:
        m = _RE_PARTE.search(t or "")
        if m and int(m.group(1) or m.group(2) or 0) >= 2:
            return True
    return False


def _temporadas(cadena: list[dict]) -> list[list[dict]]:
    """La cadena de AniList agrupada como la cuentan los servicios."""
    grupos: list[list[dict]] = []
    for m in cadena:
        if grupos and _es_parte(m):
            grupos[-1].append(m)
        else:
            grupos.append([m])
    return grupos


def _dentro(grupo: list[dict], ep: int) -> tuple[dict, int]:
    """El episodio `ep` de una temporada que AniList parte en varias entradas."""
    for m in grupo[:-1]:
        n = _episodios(m)
        if not n or ep <= n:
            return m, ep
        ep -= n
    return grupo[-1], ep


def temporada_y_episodio(cadena: list[dict], temporada: int, episodio: int) -> tuple[Optional[dict], int]:
    """Qué entrada de AniList es «T{temporada}:E{episodio}» y qué episodio suyo.

    - Normal: la temporada N es la N-ésima de la cadena.
    - Numeración seguida (T2:E26 cuando la T1 tenía 25): se descuentan los
      episodios de las temporadas anteriores.
    - Una «temporada» de la página que AniList parte en dos (T1:E30 con una T1
      de 24): se pasa a la siguiente entrada con el resto."""
    grupos = _temporadas(cadena)
    if not grupos:
        return None, 0
    t = max(1, int(temporada or 1))
    ep = max(1, int(episodio or 1))
    if t > len(grupos):
        return None, 0
    i = t - 1
    eps_g = lambda g: sum(_episodios(m) for m in g) if all(_episodios(m) for m in g) else 0  # noqa: E731
    total_i = eps_g(grupos[i])
    if total_i and ep > total_i and i > 0:
        previos = sum(eps_g(g) for g in grupos[:i])
        if previos and 1 <= ep - previos <= total_i:
            return _dentro(grupos[i], ep - previos)
    while total_i and ep > total_i and i + 1 < len(grupos):
        ep -= total_i
        i += 1
        total_i = eps_g(grupos[i])
    return _dentro(grupos[i], ep)


def resolver(serie: str, temporada: Optional[int], episodio: Optional[int],
             temporada_nombre: str = "", post: Callable = al._post) -> dict:
    """{"media": dict | None, "episodio": int, "local": dict | None}.

    `local` es el anime de tu lista si ya lo tienes (por AniList o por nombre)."""
    serie = (serie or "").strip()
    pelicula = not episodio
    locales = db.listar_animes()
    por_aid = {int(a.get("anilist_id") or 0): a for a in locales if a.get("anilist_id")}
    por_clave = {db.clave_nombre(a["nombre"]): a for a in locales if (a.get("tipo") or "anime") != "manga"}

    # Crunchyroll da a veces el nombre de la temporada («… Season 3 Part 2»):
    # si casa entero con una entrada de AniList, es esa sin más.
    if temporada_nombre and norm(temporada_nombre) != norm(serie):
        try:
            m = _buscar(temporada_nombre, False, post)
        except Exception:
            m = None
        if m:
            return {"media": m, "episodio": int(episodio or 1), "local": por_aid.get(int(m["id"]))}

    clave = ("P|" if pelicula else "S|") + norm(serie)
    cadena: list[dict] = list(_guardadas().get(clave) or [])
    cambiada = False
    if not cadena:
        try:
            primera = _buscar(serie, pelicula, post)
        except Exception:
            primera = None
        if primera:
            cadena, cambiada = [_compacta(primera)], True
    if cadena and not pelicula:
        # Solo las temporadas que hacen falta: hasta la pedida y una más (por
        # si la página numera seguido o la temporada sigue en otra entrada).
        # Las «Part 2» de AniList cuentan dentro de su temporada.
        t = max(1, int(temporada or 1))
        while len(_temporadas(cadena)) <= t and len(cadena) < _MAX_TEMPORADAS:
            completa = [*cadena]
            try:
                if not _alargar(completa, len(cadena) + 1, post):
                    break
            except Exception:
                break
            cadena = cadena + [_compacta(m) for m in completa[len(cadena):]]
            cambiada = True
    if cambiada:
        _guardar(clave, cadena)

    if cadena:
        if pelicula:
            m, ep = cadena[0], 1
        else:
            m, ep = temporada_y_episodio(cadena, temporada or 1, episodio or 1)
        if m:
            return {"media": m, "episodio": ep, "local": por_aid.get(int(m["id"]))}

    # No está en AniList con ese nombre: ¿lo tienes tú guardado así?
    k = db.clave_nombre(serie)
    if (temporada or 1) > 1:
        for suf in (f" Season {temporada}", f" {temporada}nd Season", f" {temporada}rd Season", f" {temporada}th Season"):
            if db.clave_nombre(serie + suf) in por_clave:
                return {"media": None, "episodio": int(episodio or 1), "local": por_clave[db.clave_nombre(serie + suf)]}
    elif k in por_clave:
        return {"media": None, "episodio": int(episodio or 1), "local": por_clave[k]}
    return {"media": None, "episodio": 0, "local": None}


def _compacta(m: dict) -> dict:
    """Lo justo para guardar: id, formato, episodios, títulos y ficha."""
    return {k: m.get(k) for k in ("id", "format", "status", "episodes", "title", "coverImage",
                                    "genres", "description", "nextAiringEpisode", "isAdult", "relations")}


def a_ficha(m: dict):
    """La entrada de AniList como ficha de Miraru (AnimeData), o None si es para adultos."""
    ficha = al._parse_media(m, "", "anilist", "ANIME")
    if not ficha or adulto.es_adulto(ficha):
        return None
    return ficha
