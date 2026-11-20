"""Tu lista sincronizada entre PCs (Miraru Plus, v2.18).

Sin servidor: aprovecha la copia en la nube (copia_nube). Cada PC ya deja su
copia, `miraru-copia-<equipo>.zip`, en la carpeta de tu nube; aquí cada PC lee
las copias de los OTROS y trae lo que ha cambiado en ellos.

Reglas (para no perder nada nunca):
  - Lo que falta aquí se añade.
  - Nunca se borra nada (si quitas un anime en un PC, en los otros se queda).
  - Fusión a tres bandas: de cada PC se guarda cómo estaba cada anime la última
    vez que se leyó. Si allí cambió desde entonces (lo tocaste en ese PC), ese
    cambio se aplica aquí, aunque sea bajar (p. ej. volver a verlo). Si no
    cambió allí, manda lo de aquí.
  - La primera vez con un PC (sin foto previa) solo se sube: más episodios,
    mejor estado, la nota si aquí no hay.
"""
from __future__ import annotations

import json
import logging
import sqlite3
import tempfile
import threading
import time
import zipfile
from pathlib import Path

import copia_nube
import database as db

log = logging.getLogger("miraru.sincro_pcs")

CLAVE = "sincro_pcs"              # {activa, ultima, equipos: {equipo: {ts, foto}}}
INTERVALO = 5 * 60
CAMPOS = ("estado_usuario", "episodios_vistos", "puntuacion", "favorito")
# Columnas que se copian al añadir un anime que aquí no está.
_NUEVO = ("nombre", "fuente", "capitulos", "imagen", "genero", "sinopsis", "estado_anime",
          "estado_usuario", "puntuacion", "episodios_vistos", "temporada", "favorito",
          "notas", "fecha_inicio", "fecha_fin", "tipo", "anilist_id")

_lock = threading.Lock()


def _leer() -> dict:
    try:
        d = json.loads(db.get_config(CLAVE) or "{}")
        return d if isinstance(d, dict) else {}
    except ValueError:
        return {}


def _guardar(d: dict) -> None:
    db.set_config(CLAVE, json.dumps(d, ensure_ascii=False))


def activa() -> bool:
    return bool(_leer().get("activa"))


def poner(activa_: bool) -> dict:
    d = _leer()
    d["activa"] = bool(activa_)
    _guardar(d)
    return estado()


def estado() -> dict:
    d = _leer()
    otros = [c for c in copia_nube.buscar_copias() if not c.get("este_pc")]
    return {"activa": bool(d.get("activa")), "ultima": d.get("ultima") or {},
            "carpeta": copia_nube.estado().get("carpeta", ""),
            "equipos": [{"equipo": c.get("equipo") or Path(c["archivo"]).stem.replace(copia_nube.PREFIJO, ""),
                         "fecha": c.get("fecha", ""), "animes": c.get("animes", 0)} for c in otros]}


def _rango(e: str) -> int:
    return db._RANGO_ESTADO.get(e or "", 0)


def _filas(zip_path: Path) -> tuple[dict, list, list[str]]:
    """{nombre: fila} de la copia, sus ep_log y las columnas de animes."""
    with tempfile.TemporaryDirectory() as tmp:
        with zipfile.ZipFile(zip_path) as z:
            z.extract("anime_tracker.db", tmp)
        c = sqlite3.connect(str(Path(tmp) / "anime_tracker.db"))
        c.row_factory = sqlite3.Row
        try:
            cols = [r[1] for r in c.execute("PRAGMA table_info(animes)")]
            filas = {r["nombre"]: dict(r) for r in c.execute("SELECT * FROM animes")}
            try:
                log_ = [tuple(r) for r in c.execute("SELECT nombre, episodio, fecha FROM ep_log")]
            except sqlite3.DatabaseError:
                log_ = []
        finally:
            c.close()
    return filas, log_, cols


def _foto(fila: dict) -> list:
    return [fila.get(k) for k in CAMPOS]


def decidir(local: dict, remoto: dict, antes: list | None) -> dict:
    """Cambios para `local` según `remoto` (y cómo estaba `remoto` la última vez)."""
    cambios: dict = {}
    for i, k in enumerate(CAMPOS):
        r, lo = remoto.get(k), local.get(k)
        if r == lo or (k != "puntuacion" and r is None):
            continue
        if antes is not None and i < len(antes):
            if antes[i] != r:                 # cambió en el otro PC: manda ese cambio
                cambios[k] = r
            continue
        # Primera vez con este PC: solo subir.
        if k == "episodios_vistos" and int(r or 0) > int(lo or 0):
            cambios[k] = int(r)
        elif ((k == "estado_usuario" and _rango(r) > _rango(lo))
              or (k == "puntuacion" and r is not None and lo is None)):
            cambios[k] = r
        elif k == "favorito" and r and not lo:
            cambios[k] = 1
    return cambios


def sincronizar(forzar: bool = False) -> dict:
    """Una pasada. Devuelve {ok, añadidos, actualizados, equipos}."""
    if not forzar and not activa():
        return {"ok": False, "motivo": "apagada"}
    with _lock:
        d = _leer()
        equipos = d.setdefault("equipos", {})
        anadidos = actualizados = 0
        leidos = []
        for copia in copia_nube.buscar_copias():
            if copia.get("este_pc"):
                continue
            eq = copia.get("equipo") or Path(copia["archivo"]).stem
            prev = equipos.get(eq) or {}
            if not forzar and int(copia.get("ts", 0)) <= int(prev.get("ts", 0)):
                continue
            try:
                remotas, log_remoto, cols_r = _filas(Path(copia["archivo"]))
            except Exception as e:  # noqa: BLE001
                log.warning("sincro: copia de %s ilegible: %s", eq, e)
                continue
            fotos_antes = prev.get("foto") or {}
            with db.get_conn() as conn:
                cols_l = {r[1] for r in conn.execute("PRAGMA table_info(animes)")}
                locales = {r["nombre"]: dict(r) for r in conn.execute("SELECT * FROM animes")}
                for nombre, rf in remotas.items():
                    lf = locales.get(nombre)
                    if lf is None:
                        ks = [k for k in _NUEVO if k in cols_l and k in cols_r]
                        conn.execute(f"INSERT OR IGNORE INTO animes ({','.join(ks)}) VALUES "
                                     f"({','.join('?' * len(ks))})", [rf.get(k) for k in ks])
                        anadidos += 1
                        continue
                    ch = decidir(lf, rf, fotos_antes.get(nombre))
                    if ch:
                        sets = ", ".join(f"{k}=?" for k in ch)
                        conn.execute(f"UPDATE animes SET {sets} WHERE nombre=?", [*ch.values(), nombre])
                        actualizados += 1
                if log_remoto:
                    conn.executemany("INSERT OR IGNORE INTO ep_log (nombre, episodio, fecha) VALUES (?,?,?)",
                                     log_remoto)
                conn.commit()
            equipos[eq] = {"ts": int(copia.get("ts", 0)),
                           "foto": {n: _foto(f) for n, f in remotas.items()}}
            leidos.append(eq)
        if anadidos or actualizados:
            db._invalidar_cache()
        d["ultima"] = {"ts": int(time.time()), "anadidos": anadidos, "actualizados": actualizados,
                       "equipos": leidos} if leidos else d.get("ultima") or {}
        _guardar(d)
    return {"ok": True, "anadidos": anadidos, "actualizados": actualizados, "equipos": leidos}


_hilo: threading.Thread | None = None


def iniciar_hilo(es_plus) -> None:
    """Cada 5 min, si está activa y hay Plus. `es_plus`: función sin argumentos."""
    global _hilo
    if _hilo is not None:
        return

    def bucle():
        time.sleep(60)
        while True:
            try:
                if activa() and es_plus():
                    sincronizar()
            except Exception as e:  # noqa: BLE001
                log.warning("sincro entre PCs: %s", e)
            time.sleep(INTERVALO)

    _hilo = threading.Thread(target=bucle, daemon=True, name="sincro-pcs")
    _hilo.start()
