"""«Retomar por donde lo dejaste» (v2.18.1).

La extensión dice, mientras ves un episodio en AnimeAV1, por qué minuto vas
(cada 15 s). Miraru guarda solo el último. Si cierras el navegador o apagas el
PC a medias, al volver a abrir Miraru aparece «Retomar por donde lo dejaste»:
un clic y AnimeAV1 se abre en ese episodio y en ese minuto (la extensión salta
ahí sola).

No se ofrece si ya lo terminaste (≥ 92 %), si apenas lo empezaste (< 1 min),
si lo marcaste como visto, si lo descartas o si han pasado más de 14 días.
"""
from __future__ import annotations

import json
import re
import time
from typing import Optional

import database as db

CLAVE = "retomar_av1"
CADUCA = 14 * 86400
_URL = re.compile(r"^https://(www\.)?animeav1\.com/media/[\w-]+/\d+$")


def _leer() -> dict:
    try:
        d = json.loads(db.get_config(CLAVE) or "{}")
        return d if isinstance(d, dict) else {}
    except ValueError:
        return {}


def guardar(p: dict) -> dict:
    url = str(p.get("url") or "")
    if not _URL.match(url):
        slug, ep = str(p.get("slug") or ""), int(p.get("episode") or 0)
        url = f"https://animeav1.com/media/{slug}/{ep}" if re.fullmatch(r"[\w-]+", slug) and ep > 0 else ""
    if not url:
        return {"ok": False}
    d = {"mediaId": int(p.get("mediaId") or 0), "slug": str(p.get("slug") or "")[:200],
         "episode": int(p.get("episode") or 0), "titulo": str(p.get("titulo") or "")[:200],
         "t": max(0, int(p.get("t") or 0)), "d": max(0, int(p.get("d") or 0)), "url": url,
         "ts": time.time(), "descartado": False}
    db.set_config(CLAVE, json.dumps(d, ensure_ascii=False))
    return {"ok": True}


def descartar() -> None:
    d = _leer()
    if d:
        d["descartado"] = True
        db.set_config(CLAVE, json.dumps(d, ensure_ascii=False))


def marcado(media_id: int, episodio: Optional[int]) -> None:
    """Marcaste ese episodio como visto: ya no hay nada que retomar."""
    d = _leer()
    if d and episodio and int(d.get("mediaId") or 0) == int(media_id or 0) and int(d.get("episode") or 0) <= int(episodio):
        descartar()


def _anime_local(d: dict) -> Optional[dict]:
    try:
        import animeav1_sync
        ids = animeav1_sync._ids()
        por_nombre = {a["nombre"]: a for a in db.listar_animes()}
        for nombre, mid in ids.items():
            if mid == d.get("mediaId") and nombre in por_nombre:
                return por_nombre[nombre]
        t = animeav1_sync.titulo_de_pestana(d.get("titulo") or "")
        if t:
            clave = db.clave_nombre(t)
            return next((a for a in por_nombre.values() if db.clave_nombre(a["nombre"]) == clave), None)
    except Exception:  # noqa: BLE001
        return None
    return None


def pendiente(ahora: Optional[float] = None) -> Optional[dict]:
    d = _leer()
    ahora = ahora or time.time()
    if not d or d.get("descartado") or ahora - float(d.get("ts") or 0) > CADUCA:
        return None
    t, dur = int(d.get("t") or 0), int(d.get("d") or 0)
    if t < 60 or (dur and t / dur >= 0.92):
        return None
    local = _anime_local(d)
    nombre = (local or {}).get("nombre") or d.get("titulo") or ""
    import animeav1_sync
    nombre = nombre if local else animeav1_sync.titulo_de_pestana(nombre) or nombre
    return {"nombre": nombre, "imagen": (local or {}).get("imagen") or "", "episodio": d.get("episode"),
            "t": t, "d": dur, "url": f"{d['url']}#miraru-t={t}", "ts": d.get("ts")}
