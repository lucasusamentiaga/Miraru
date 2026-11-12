"""Miraru en el móvil con un botón (v2.17).

Antes: inventar un PIN → cerrar Miraru y volver a abrirlo → escanear el QR →
escribir el PIN en el móvil. Y cada vez que se reiniciaba el PC, el móvil
pedía el PIN otra vez (las sesiones solo vivían en memoria).

Ahora:
1. «Conectar el móvil» en el PC: Miraru empieza a escuchar en tu WiFi en ese
   mismo momento (un segundo servidor en la IP de la red, sin reiniciar) y
   enseña un QR que ya lleva un código de un solo uso.
2. Escaneas el QR y el móvil entra solo. Si no tienes cámara, la dirección y
   un código de 6 cifras.
3. El móvil se queda conectado aunque reinicies el PC: las sesiones se guardan
   (solo su huella, no el token) en la base de datos.

Seguridad: solo escucha en la red de tu casa; todo lo que va bajo /api/ desde
la red exige sesión (ver main._lan_auth_guard). El código caduca a los 10 min
y los intentos van con límite por IP.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
import secrets
import socket
import threading
import time
from typing import Any, Optional

import database as db

log = logging.getLogger("miraru.movil")

CODIGO_TTL = 600                  # 10 min
SESION_TTL = 86400 * 365          # un año
_CFG_SESIONES = "mobile_sesiones"

_lock = threading.Lock()
_servidor: Any = None
_hilo: Optional[threading.Thread] = None
_ip_red = ""
_puerto = 0
_error = ""
_codigo: dict = {}


# ── IP de la red ─────────────────────────────────────────────────────────────
def ip_local() -> str:
    """IP de este PC en la WiFi/red de casa (la de la ruta por defecto). No
    envía nada: un socket UDP «conectado» solo elige la interfaz."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            s.connect(("10.255.255.255", 1))
            ip = s.getsockname()[0]
        finally:
            s.close()
    except OSError:
        return ""
    return "" if ip.startswith(("127.", "0.")) else ip


# ── Servidor en la red ───────────────────────────────────────────────────────
def escuchando() -> bool:
    return bool(_servidor is not None and getattr(_servidor, "started", False)
                and _hilo is not None and _hilo.is_alive())


def direccion() -> str:
    return f"{_ip_red}:{_puerto}" if escuchando() else ""


def ultimo_error() -> str:
    return _error


def arrancar(app, puerto: int) -> str:
    """Empieza a escuchar en la IP de la red (además de en 127.0.0.1). Si ya
    escucha en la IP buena no hace nada; si la IP ha cambiado, se mueve.
    Devuelve «ip:puerto» o "" si no se pudo (y deja el motivo en ultimo_error)."""
    global _servidor, _hilo, _ip_red, _puerto, _error
    import uvicorn
    with _lock:
        ip = ip_local()
        if not ip:
            _error = "Este PC no está conectado a ninguna red WiFi o de cable."
            return ""
        if escuchando() and ip == _ip_red and puerto == _puerto:
            return direccion()
        _parar_sin_lock()
        cfg = uvicorn.Config(app, host=ip, port=int(puerto), lifespan="off",
                             log_config=None, log_level="warning", access_log=False)
        srv = uvicorn.Server(cfg)
        hilo = threading.Thread(target=srv.run, daemon=True, name="miraru-red")
        hilo.start()
        for _ in range(60):                    # hasta 3 s
            if srv.started or not hilo.is_alive():
                break
            time.sleep(0.05)
        if not srv.started:
            srv.should_exit = True
            _error = f"No se pudo abrir el puerto {puerto} en {ip}."
            log.warning("Acceso móvil: %s", _error)
            return ""
        _servidor, _hilo, _ip_red, _puerto, _error = srv, hilo, ip, int(puerto), ""
        try:
            db.set_config("network_host", f"{ip}:{puerto}")
        except Exception:  # noqa: BLE001
            pass
        log.info("Acceso móvil: escuchando en %s:%s", ip, puerto)
        return f"{ip}:{puerto}"


def _parar_sin_lock() -> None:
    global _servidor, _hilo
    if _servidor is not None:
        _servidor.should_exit = True
        if _hilo is not None:
            _hilo.join(timeout=3)
    _servidor, _hilo = None, None


def parar() -> None:
    with _lock:
        _parar_sin_lock()


# ── Código para emparejar ────────────────────────────────────────────────────
def codigo(nuevo: bool = False) -> dict:
    """{"largo", "corto", "expira"}. El largo va en el QR; el corto (6 cifras)
    es para escribirlo a mano. Valen los dos hasta que caducan."""
    global _codigo
    ahora = time.time()
    if nuevo or not _codigo or _codigo["expira"] < ahora + 30:
        _codigo = {"largo": secrets.token_urlsafe(18),
                   "corto": f"{secrets.randbelow(10**6):06d}",
                   "expira": int(ahora + CODIGO_TTL)}
    return dict(_codigo)


def codigo_valido(texto: str) -> bool:
    t = (texto or "").strip().replace(" ", "")
    c = _codigo
    if not t or not c or c["expira"] < time.time():
        return False
    return hmac.compare_digest(t, c["largo"]) or hmac.compare_digest(t, c["corto"])


# ── Sesiones guardadas ───────────────────────────────────────────────────────
def _huella(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _sesiones() -> dict:
    try:
        d = json.loads(db.get_config(_CFG_SESIONES) or "{}")
        return d if isinstance(d, dict) else {}
    except Exception:  # noqa: BLE001
        return {}


def _guardar(d: dict) -> None:
    db.set_config(_CFG_SESIONES, json.dumps(d, separators=(",", ":")))


def nueva_sesion(dispositivo: str = "") -> str:
    token = secrets.token_urlsafe(32)
    ahora = time.time()
    d = {h: v for h, v in _sesiones().items() if v.get("exp", 0) > ahora}
    d[_huella(token)] = {"exp": int(ahora + SESION_TTL), "disp": (dispositivo or "")[:60],
                        "desde": int(ahora)}
    _guardar(d)
    return token


def sesion_valida(token: str) -> bool:
    if not token:
        return False
    v = _sesiones().get(_huella(token))
    return bool(v and v.get("exp", 0) > time.time())


def num_sesiones() -> int:
    ahora = time.time()
    return sum(1 for v in _sesiones().values() if v.get("exp", 0) > ahora)


def borrar_sesiones() -> None:
    _guardar({})


def dispositivo_de(user_agent: str) -> str:
    """«iPhone», «Android · Samsung»… para la lista del PC."""
    ua = user_agent or ""
    if "iPhone" in ua:
        return "iPhone"
    if "iPad" in ua:
        return "iPad"
    if "Android" in ua:
        return "Android"
    return "Navegador"
