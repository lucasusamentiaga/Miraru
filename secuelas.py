"""«Temporadas nuevas de lo que viste» (v2.17.7: revisión a fondo).

Antes: se miraban solo las relaciones DIRECTAS guardadas (una sola vez, nunca
se volvían a pedir) de lo que habías COMPLETADO, y valía cualquier relación
(precuelas, resúmenes…). Una temporada anunciada después de guardar las
relaciones no salía nunca, y si te habías saltado la 2.ª, la 3.ª tampoco.

Ahora, cada vez que se recalcula (como mucho cada 12 h):

1. Se parte de lo que has visto o estás viendo (completado, viendo, en pausa).
2. Se siguen en AniList las SECUELAS (y las temporadas que cuelgan de ellas)
   hasta 4 saltos, con relaciones FRESCAS, en lotes de 50 por petición.
3. Sale lo que ya se puede ver y no tienes en tu lista:
   - en emisión con algún episodio emitido, o
   - terminado hace poco (≤ 120 días): una temporada nueva que te perdiste.
   Lo anunciado (sin estrenar) no sale: aún no existe.
4. Nada que ya tengas (por id de AniList o por nombre), ni lo que marcaste
   «No me interesa», ni contenido para adultos.
"""
from __future__ import annotations

import datetime as _dt
import time as _time
from collections.abc import Callable
from typing import Optional

FORMATOS = {"TV", "TV_SHORT", "ONA"}
SALTOS = 4
DIAS_RECIENTE = 120
_ESTADOS_BASE = {"completado", "completed", "viendo", "watching", "en pausa", "pausado", "on_hold", "paused"}

QUERY = """
query ($ids: [Int]) {
  Page(perPage: 50) {
    media(id_in: $ids, type: ANIME) {
      id
      isAdult
      title { romaji english native }
      synonyms
      format
      status
      episodes
      genres
      description(asHtml: false)
      coverImage { large }
      startDate { year month day }
      endDate { year month day }
      nextAiringEpisode { episode }
      relations { edges { relationType node { id type format } } }
    }
  }
}
"""


def _fecha(d: Optional[dict]) -> Optional[_dt.date]:
    try:
        if d and d.get("year"):
            return _dt.date(int(d["year"]), int(d.get("month") or 1), int(d.get("day") or 1))
    except (TypeError, ValueError):
        pass
    return None


def emitidos(m: dict) -> int:
    if m.get("status") == "RELEASING":
        nxt = (m.get("nextAiringEpisode") or {}).get("episode")
        if nxt:
            return max(0, int(nxt) - 1)
        return int(m.get("episodes") or 0)          # sin calendario: lo que diga AniList
    if m.get("status") == "FINISHED":
        return int(m.get("episodes") or 0)
    return 0


def motivo(m: dict, hoy: Optional[_dt.date] = None) -> Optional[str]:
    """«emision», «reciente» o None (no se puede ver todavía / ya es vieja)."""
    hoy = hoy or _dt.date.today()
    if m.get("status") == "RELEASING" and emitidos(m) > 0:
        return "emision"
    if m.get("status") == "FINISHED":
        fin = _fecha(m.get("endDate")) or _fecha(m.get("startDate"))
        if fin and 0 <= (hoy - fin).days <= DIAS_RECIENTE:
            return "reciente"
    return None


def _secuelas_de(m: dict) -> list[int]:
    out = []
    for e in ((m.get("relations") or {}).get("edges") or []):
        n = e.get("node") or {}
        if e.get("relationType") == "SEQUEL" and n.get("type") == "ANIME" and n.get("id"):
            out.append(int(n["id"]))
    return out


def _titulos(m: dict) -> list[str]:
    t = m.get("title") or {}
    return [x for x in (t.get("english"), t.get("romaji"), *(m.get("synonyms") or [])) if x]


def buscar(animes: list[dict], post: Callable, ignorados: set[int] = frozenset(),
           clave: Callable[[str], str] = lambda s: s.lower(), es_adulto: Callable[[dict], bool] = lambda m: False,
           hoy: Optional[_dt.date] = None, pausa: float = 0.0) -> list[dict]:
    """Las temporadas nuevas. `post(query, variables)` devuelve el `data` de AniList."""
    en_lista = {int(a.get("anilist_id") or 0) for a in animes} - {0}
    nombres = {clave(a["nombre"]) for a in animes if a.get("nombre")}
    base: dict[int, str] = {}
    for a in animes:
        if (a.get("tipo") or "anime") == "manga" or not a.get("anilist_id"):
            continue
        if (a.get("estado_usuario") or "").lower() in _ESTADOS_BASE:
            base.setdefault(int(a["anilist_id"]), a["nombre"])
    if not base:
        return []

    vistos: dict[int, dict] = {}
    de: dict[int, str] = dict(base)                 # cada id → de qué anime tuyo viene
    pendientes = list(base)
    encontrados: dict[int, dict] = {}
    for _ in range(SALTOS + 1):
        pedir = [i for i in dict.fromkeys(pendientes) if i not in vistos]
        if not pedir:
            break
        siguientes: list[int] = []
        for i in range(0, len(pedir), 50):
            try:
                data = post(QUERY, {"ids": pedir[i:i + 50]}) or {}
            except Exception:
                data = {}
            for m in ((data.get("Page") or {}).get("media") or []):
                if not m or not m.get("id"):
                    continue
                mid = int(m["id"])
                vistos[mid] = m
                for s in _secuelas_de(m):
                    de.setdefault(s, de.get(mid, ""))
                    if s not in vistos:
                        siguientes.append(s)
            if pausa:
                _time.sleep(pausa)
        pendientes = siguientes

    for mid, m in vistos.items():
        if mid in base or mid in en_lista or mid in ignorados:
            continue
        if (m.get("format") or "") not in FORMATOS or m.get("isAdult") or es_adulto(m):
            continue
        if any(clave(t) in nombres for t in _titulos(m)):
            continue                                # lo tienes guardado con otro id o sin él
        mot = motivo(m, hoy)
        if not mot:
            continue
        encontrados[mid] = m

    out = []
    for mid, m in encontrados.items():
        t = m.get("title") or {}
        nombre = t.get("english") or t.get("romaji") or ""
        inicio = _fecha(m.get("startDate"))
        out.append({
            "anilist_id": mid, "nombre": nombre, "imagen": (m.get("coverImage") or {}).get("large") or "",
            "capitulos": str(m.get("episodes") or "?"),
            "estado_anime": "En emisión" if m.get("status") == "RELEASING" else "Finalizado",
            "genero": ", ".join(m.get("genres") or []), "sinopsis": m.get("description") or "",
            "fuente": "anilist", "motivo": motivo(m, hoy), "eps_emitidos": emitidos(m),
            "inicio": inicio.isoformat() if inicio else "", "de": de.get(mid, ""),
        })
    # Primero lo que se está emitiendo, y dentro, lo más reciente.
    out.sort(key=lambda x: (x["motivo"] != "emision", x["inicio"] and -int(x["inicio"].replace("-", "")) or 0, x["nombre"]))
    return out
