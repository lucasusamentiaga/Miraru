"""Pedir una valoración en la Microsoft Store (v2.18.4).

Las valoraciones pesan en el ranking de la Store y en si la gente se descarga
Miraru al ver la ficha. Se piden con la ventana oficial de Windows
(StoreContext.RequestRateAndReviewAppAsync), y solo:

- en la versión de la Store (la que tiene identidad de paquete);
- cuando ya usas Miraru de verdad: ≥ 20 episodios apuntados y ≥ 3 días desde el primero;
- justo después de un buen momento (marcar un episodio o completar un anime), y la
  página solo lo pide si no hay otra ventana de Miraru abierta;
- como mucho dos veces, con 90 días entre una y otra; si valoras, no vuelve a salir.
"""
from __future__ import annotations

import datetime
import json
import logging
import threading
import time
from typing import Optional

import database as db
import plus

log = logging.getLogger("miraru.valorar")

CLAVE = "valorar_store"
MIN_EPISODIOS = 20
MIN_DIAS = 3
ESPERA = 90 * 86400
MAX_VECES = 2

_lock = threading.Lock()


def _leer() -> dict:
    try:
        d = json.loads(db.get_config(CLAVE) or "{}")
        return d if isinstance(d, dict) else {}
    except ValueError:
        return {}


def _guardar(d: dict) -> None:
    db.set_config(CLAVE, json.dumps(d))


def _uso() -> tuple[int, Optional[datetime.datetime]]:
    """(episodios apuntados, fecha del primero)."""
    with db.get_conn() as conn:
        r = conn.execute("SELECT COUNT(*) AS c, MIN(fecha) AS f FROM ep_log WHERE fecha IS NOT NULL").fetchone()
    primero = None
    try:
        primero = datetime.datetime.fromisoformat(str(r["f"])[:19]) if r["f"] else None
    except ValueError:
        pass
    return int(r["c"] or 0), primero


def toca(ahora: Optional[float] = None) -> bool:
    if not plus.empaquetado():
        return False
    d = _leer()
    ahora = ahora or time.time()
    if d.get("hecho") or int(d.get("veces") or 0) >= MAX_VECES:
        return False
    if d.get("ts") and ahora - float(d["ts"]) < ESPERA:
        return False
    eps, primero = _uso()
    if eps < MIN_EPISODIOS or not primero:
        return False
    return (datetime.datetime.fromtimestamp(ahora) - primero).days >= MIN_DIAS


def pedir() -> dict:
    """Si toca, abre la ventana de valorar de la Store. Nunca lanza."""
    if not _lock.acquire(blocking=False):
        return {"pedida": False}
    try:
        if not toca():
            return {"pedida": False}
        d = _leer()
        d["veces"] = int(d.get("veces") or 0) + 1
        d["ts"] = time.time()
        _guardar(d)
        try:
            ctx = plus._contexto()
            res = plus._esperar(ctx.request_rate_and_review_app_async())
            estado = int(getattr(res, "status", 3))
            # 0 = enviada; was_updated: ya había valorado y la cambió
            if estado == 0 or getattr(res, "was_updated", False):
                d["hecho"] = True
                _guardar(d)
            return {"pedida": True, "estado": estado}
        except Exception as e:  # noqa: BLE001
            log.warning("Valorar en la Store: %s", e)
            return {"pedida": False}
    finally:
        _lock.release()
