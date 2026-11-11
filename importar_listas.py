"""Traer de golpe la lista de otro sitio (v2.17).

- AniList: basta el nombre de usuario (la lista tiene que ser pública). No hace
  falta crear ninguna app de desarrollador como para la sincronización.
- MyAnimeList: el archivo .xml que MAL deja exportar.

Las dos traen anime y manga con su estado, nota y progreso. Todo se pide a
AniList en lotes (50 fichas por petición), así que una lista de cientos de
títulos entra en unos segundos y no en minutos.
"""
from __future__ import annotations

import xml.etree.ElementTree as ET
from collections.abc import Callable

import database as db
from scrapers import adulto
from scrapers import anilist as al

MAX_TITULOS = 2000

_CAMPOS = """
      id idMal isAdult
      title { romaji english native }
      episodes chapters volumes format
      coverImage { large }
      genres
      description(asHtml: false)
      status
      nextAiringEpisode { episode }
"""

QUERY_USUARIO = """
query ($user: String, $type: MediaType) {
  MediaListCollection(userName: $user, type: $type) {
    lists { isCustomList entries {
      status progress progressVolumes
      score(format: POINT_10_DECIMAL)
      media {""" + _CAMPOS + """}
    } }
  }
}
"""

QUERY_POR_MAL = """
query ($ids: [Int], $type: MediaType) {
  Page(perPage: 50) {
    media(idMal_in: $ids, type: $type) {""" + _CAMPOS + """}
  }
}
"""

_ESTADO_ANILIST = {"CURRENT": "viendo", "REPEATING": "viendo", "COMPLETED": "completado",
                   "PAUSED": "pausa", "DROPPED": "abandonado", "PLANNING": "pendiente"}
_ESTADO_MAL = {"watching": "viendo", "reading": "viendo", "completed": "completado",
               "on-hold": "pausa", "dropped": "abandonado",
               "plan to watch": "pendiente", "plan to read": "pendiente"}


def _guardar(media: dict, tipo: str, estado: str, nota, progreso, volumenes, res: dict) -> None:
    """Guarda una ficha con lo que el usuario llevaba y apunta el resultado."""
    ficha = al._parse_media(media, "", "anilist", tipo)
    if not ficha or not (ficha.nombre or "").strip() or adulto.es_adulto(ficha):
        res["omitidos"] += 1
        return
    d = ficha.__dict__.copy()
    d.pop("adulto", None)
    d["estado_usuario"] = estado
    d["episodios_vistos"] = max(0, int(progreso or 0))
    if nota:
        d["puntuacion"] = min(10.0, max(0.0, float(nota)))
    if tipo == "MANGA" and volumenes:
        d["volumenes_leidos"] = max(0, int(volumenes))
    ok, msg = db.guardar_anime(d)
    if ok:
        res["añadidos"] += 1
        if tipo == "MANGA":
            res["mangas"] += 1
    elif msg == "duplicado":
        res["duplicados"] += 1
    else:
        res["omitidos"] += 1


def _resultado() -> dict:
    return {"ok": True, "añadidos": 0, "mangas": 0, "duplicados": 0, "omitidos": 0}


def desde_anilist(usuario: str, post: Callable = al._post) -> dict:
    """Trae la lista pública de `usuario` (anime y manga)."""
    usuario = (usuario or "").strip().lstrip("@")
    if not usuario:
        return {"ok": False, "error": "Escribe tu nombre de usuario de AniList."}
    res = _resultado()
    encontrado = False
    for tipo in ("ANIME", "MANGA"):
        try:
            data = post(QUERY_USUARIO, {"user": usuario, "type": tipo}, timeout=30)
        except Exception as e:
            if not encontrado and tipo == "ANIME":
                no_existe = "404" in str(e)
                return {"ok": False, "error":
                        "No hay ningún usuario de AniList con ese nombre, o su lista es privada." if no_existe
                        else "Ahora mismo no se puede leer esa lista. Inténtalo en un rato."}
            continue
        listas = ((data or {}).get("MediaListCollection") or {}).get("lists") or []
        vistos: set[int] = set()
        for lista in listas:
            if lista.get("isCustomList"):
                continue        # las listas propias repiten lo de las normales
            for e in lista.get("entries") or []:
                media = e.get("media") or {}
                if not media.get("id") or media["id"] in vistos or res["añadidos"] >= MAX_TITULOS:
                    continue
                vistos.add(media["id"])
                encontrado = True
                _guardar(media, tipo, _ESTADO_ANILIST.get(e.get("status") or "", "pendiente"),
                         e.get("score"), e.get("progress"), e.get("progressVolumes"), res)
    if not encontrado:
        return {"ok": False, "error": "Esa lista está vacía o es privada. "
                "En AniList, ponla pública en Ajustes → Listas y vuelve a probar."}
    res["usuario"] = usuario
    return res


def _entradas_mal(contenido: bytes) -> list[dict]:
    try:
        raiz = ET.fromstring(contenido)
    except ET.ParseError as e:
        raise ValueError("Ese archivo no es el .xml que exporta MyAnimeList.") from e
    out = []
    for nodo, tipo, c_id, c_prog, c_vol in (("anime", "ANIME", "series_animedb_id", "my_watched_episodes", None),
                                            ("manga", "MANGA", "manga_mangadb_id", "my_read_chapters",
                                             "my_read_volumes")):
        for n in raiz.iter(nodo):
            def num(campo, n=n):
                try:
                    return int(float((n.findtext(campo) or "0").strip() or 0))
                except ValueError:
                    return 0
            mal = num(c_id)
            if mal <= 0:
                continue
            out.append({"tipo": tipo, "mal": mal,
                        "estado": _ESTADO_MAL.get((n.findtext("my_status") or "").strip().lower(), "pendiente"),
                        "nota": num("my_score"), "progreso": num(c_prog),
                        "volumenes": num(c_vol) if c_vol else 0})
    return out[:MAX_TITULOS]


def desde_mal_xml(contenido: bytes, post: Callable = al._post, pausa: Callable = lambda: None) -> dict:
    """Importa el .xml exportado de MyAnimeList (anime y/o manga)."""
    try:
        entradas = _entradas_mal(contenido)
    except ValueError as e:
        return {"ok": False, "error": str(e)}
    if not entradas:
        return {"ok": False, "error": "Ese archivo no trae ningún anime ni manga."}
    res = _resultado()
    res["no_encontrados"] = 0
    for tipo in ("ANIME", "MANGA"):
        mias = {e["mal"]: e for e in entradas if e["tipo"] == tipo}
        ids = list(mias)
        for i in range(0, len(ids), 50):
            lote = ids[i:i + 50]
            if i:
                pausa()
            try:
                data = post(QUERY_POR_MAL, {"ids": lote, "type": tipo}, timeout=30)
            except Exception:
                res["no_encontrados"] += len(lote)
                continue
            hallados = set()
            for media in ((data or {}).get("Page") or {}).get("media") or []:
                e = mias.get(media.get("idMal"))
                if not e or media.get("idMal") in hallados:
                    continue
                hallados.add(media["idMal"])
                _guardar(media, tipo, e["estado"], e["nota"], e["progreso"], e["volumenes"], res)
            res["no_encontrados"] += len(lote) - len(hallados)
    res["total"] = len(entradas)
    return res
