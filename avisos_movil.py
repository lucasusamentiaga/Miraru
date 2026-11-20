"""Avisos en el móvil (Miraru Plus, v2.18) con ntfy.

Sin servidor de Miraru ni cuentas: ntfy (https://ntfy.sh, gratuito y de código
abierto) reenvía los avisos a su app del móvil. Miraru crea un «tema» con un
nombre largo y aleatorio (solo lo conoces tú: hace de contraseña); lo abres en
la app de ntfy escaneando un código y, cuando sale un episodio nuevo de lo que
sigues, Miraru lo publica en ese tema y te llega al móvil, estés donde estés.

Lo que viaja: el nombre del anime y el número del episodio. Nada más.
"""
from __future__ import annotations

import json
import logging
import secrets

import requests

import database as db

log = logging.getLogger("miraru.avisos_movil")

SERVIDOR = "https://ntfy.sh"
CLAVE = "avisos_movil"


def _leer() -> dict:
    try:
        d = json.loads(db.get_config(CLAVE) or "{}")
        return d if isinstance(d, dict) else {}
    except ValueError:
        return {}


def _guardar(d: dict) -> None:
    db.set_config(CLAVE, json.dumps(d, ensure_ascii=False))


def estado() -> dict:
    d = _leer()
    tema = d.get("tema") or ""
    return {"activo": bool(d.get("activo") and tema), "tema": tema,
            "url": f"{SERVIDOR}/{tema}" if tema else "",
            # Con la app de ntfy instalada, este enlace abre el tema en ella; si no, su web.
            "url_qr": f"{SERVIDOR}/{tema}" if tema else ""}


def activar() -> dict:
    d = _leer()
    if not d.get("tema"):
        d["tema"] = "miraru-" + secrets.token_urlsafe(18).replace("_", "").replace("-", "")[:24].lower()
    d["activo"] = True
    _guardar(d)
    return estado()


def desactivar() -> dict:
    d = _leer()
    d["activo"] = False
    _guardar(d)
    return estado()


def nuevo_tema() -> dict:
    """Por si alguien vio el código: tema nuevo (hay que volver a escanear)."""
    d = _leer()
    d["tema"] = ""
    _guardar(d)
    return activar()


def enviar(titulo: str, texto: str, etiquetas: str = "tv", clic: str = "", sesion=None) -> bool:
    """Publica un aviso. Nunca lanza. True si ntfy lo aceptó."""
    e = estado()
    if not e["activo"]:
        return False
    try:
        s = sesion or requests
        # Cabeceras HTTP en latin-1: el título va en el cuerpo JSON (admite tildes y emojis).
        r = s.post(SERVIDOR, timeout=10, json={
            "topic": e["tema"], "title": titulo[:200], "message": texto[:1000],
            "tags": [t for t in etiquetas.split(",") if t], **({"click": clic} if clic else {})})
        return r.status_code < 300
    except Exception as ex:  # noqa: BLE001
        log.warning("ntfy: %s", ex)
        return False
