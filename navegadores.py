"""En qué navegador se abre Miraru (v2.17.7).

Antes se abría siempre en el navegador predeterminado del sistema
(`webbrowser.open`). Ahora el usuario elige: la primera vez que abre esta
versión, Miraru le enseña los navegadores que tiene instalados y guarda la
elección (config «navegador»; vacío = el predeterminado). Se puede cambiar
en «Más → Navegador».

Detección (Windows): rutas habituales de cada navegador y, además, los que
el propio Windows tiene registrados como navegadores (StartMenuInternet), así
sale también cualquier otro que tengas. En Linux/macOS (desarrollo), por PATH.
"""
from __future__ import annotations

import logging
import os
import shutil
import subprocess
import sys
import webbrowser
from pathlib import Path

log = logging.getLogger("miraru.navegadores")

CLAVE = "navegador"
CLAVE_PREGUNTADO = "navegador_preguntado"

# id → (nombre, rutas relativas a Program Files / LocalAppData, ejecutables en PATH)
_CONOCIDOS = {
    "chrome":   ("Google Chrome", [r"Google\Chrome\Application\chrome.exe"], ["google-chrome", "google-chrome-stable"]),
    "edge":     ("Microsoft Edge", [r"Microsoft\Edge\Application\msedge.exe"], ["microsoft-edge"]),
    "firefox":  ("Firefox", [r"Mozilla Firefox\firefox.exe"], ["firefox"]),
    "brave":    ("Brave", [r"BraveSoftware\Brave-Browser\Application\brave.exe"], ["brave-browser", "brave"]),
    "opera":    ("Opera", [r"Programs\Opera\launcher.exe", r"Opera\launcher.exe"], ["opera"]),
    "operagx":  ("Opera GX", [r"Programs\Opera GX\launcher.exe"], []),
    "vivaldi":  ("Vivaldi", [r"Vivaldi\Application\vivaldi.exe"], ["vivaldi"]),
    "chromium": ("Chromium", [r"Chromium\Application\chrome.exe"], ["chromium", "chromium-browser"]),
}

# ProgId del navegador predeterminado (Windows) → id
_PROGID = {"chromehtml": "chrome", "msedgehtm": "edge", "firefoxurl": "firefox", "bravehtml": "brave",
           "operastable": "opera", "operagxstable": "operagx", "vivaldihtm": "vivaldi", "chromiumhtm": "chromium"}


def _bases_windows() -> list[Path]:
    out = []
    for v in ("ProgramFiles", "ProgramFiles(x86)", "LOCALAPPDATA", "ProgramW6432"):
        p = os.environ.get(v)
        if p and Path(p) not in out:
            out.append(Path(p))
    return out


def _registrados_windows() -> dict[str, str]:
    """Navegadores que Windows tiene registrados: {nombre: ruta.exe}."""
    out: dict[str, str] = {}
    try:
        import winreg
    except ImportError:
        return out
    for raiz in (winreg.HKEY_CURRENT_USER, winreg.HKEY_LOCAL_MACHINE):
        try:
            k = winreg.OpenKey(raiz, r"SOFTWARE\Clients\StartMenuInternet")
        except OSError:
            continue
        i = 0
        while True:
            try:
                sub = winreg.EnumKey(k, i)
            except OSError:
                break
            i += 1
            try:
                nombre = winreg.QueryValue(k, sub) or sub
                cmd = winreg.QueryValue(k, sub + r"\shell\open\command") or ""
            except OSError:
                continue
            exe = cmd.strip().split('"')[1] if cmd.strip().startswith('"') else cmd.strip().split(" ")[0]
            if exe.lower().endswith(".exe") and Path(exe).is_file():
                out.setdefault(nombre, exe)
    return out


def _id_por_exe(exe: str) -> str:
    low = exe.lower().replace("/", "\\")
    nombre = low.rsplit("\\", 1)[-1]
    if nombre == "iexplore.exe":
        return "ie"
    if nombre == "msedge.exe":
        return "edge"
    if nombre == "firefox.exe":
        return "firefox"
    if nombre == "brave.exe":
        return "brave"
    if nombre == "vivaldi.exe":
        return "vivaldi"
    if nombre in ("launcher.exe", "opera.exe") and "opera" in low:
        return "operagx" if "opera gx" in low else "opera"
    if nombre == "chrome.exe":
        return "chromium" if "chromium" in low else "chrome"
    return ""


def detectar() -> list[dict]:
    """[{id, nombre, ruta}] de los navegadores instalados."""
    encontrados: list[dict] = []
    rutas_vistas: set[str] = set()

    def poner(id_: str, nombre: str, ruta: str) -> None:
        clave = os.path.normcase(os.path.abspath(ruta))
        if clave in rutas_vistas or any(n["id"] == id_ for n in encontrados):
            return
        rutas_vistas.add(clave)
        encontrados.append({"id": id_, "nombre": nombre, "ruta": ruta})

    if sys.platform == "win32":
        for id_, (nombre, rels, _) in _CONOCIDOS.items():
            for base in _bases_windows():
                for rel in rels:
                    p = base / rel
                    if p.is_file():
                        poner(id_, nombre, str(p))
                        break
        for nombre, exe in _registrados_windows().items():
            id_ = _id_por_exe(exe)
            if id_ == "ie":
                continue
            poner(id_ or "otro:" + Path(exe).stem.lower(), _CONOCIDOS[id_][0] if id_ else nombre, exe)
    else:
        for id_, (nombre, _, bins) in _CONOCIDOS.items():
            for b in bins:
                p = shutil.which(b)
                if p:
                    poner(id_, nombre, p)
                    break
    return encontrados


def predeterminado() -> str:
    """id del navegador predeterminado de Windows ('' si no se sabe)."""
    try:
        import winreg
        k = winreg.OpenKey(winreg.HKEY_CURRENT_USER,
                           r"Software\Microsoft\Windows\Shell\Associations\UrlAssociations\https\UserChoice")
        progid = (winreg.QueryValueEx(k, "ProgId")[0] or "").lower()
    except Exception:  # noqa: BLE001
        return ""
    for pref, id_ in _PROGID.items():
        if progid.startswith(pref):
            return id_
    return ""


def _db():
    import database
    return database


def elegido() -> str:
    try:
        return (_db().get_config(CLAVE) or "").strip()
    except Exception:  # noqa: BLE001
        return ""


def guardar(id_: str) -> None:
    db = _db()
    db.set_config(CLAVE, id_ or "")
    db.set_config(CLAVE_PREGUNTADO, "1")


def preguntado() -> bool:
    try:
        return (_db().get_config(CLAVE_PREGUNTADO) or "") == "1"
    except Exception:  # noqa: BLE001
        return True


def marcar_preguntado() -> None:
    _db().set_config(CLAVE_PREGUNTADO, "1")


def abrir(url: str, id_: str | None = None) -> str:
    """Abre `url` en el navegador elegido (o en `id_`). Devuelve con cuál."""
    id_ = elegido() if id_ is None else id_
    if id_:
        nav = next((n for n in detectar() if n["id"] == id_), None)
        if nav:
            try:
                flags = 0x00000008 if sys.platform == "win32" else 0      # DETACHED_PROCESS
                subprocess.Popen([nav["ruta"], url], creationflags=flags, close_fds=True,
                                 stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                return id_
            except OSError as e:
                log.warning("No se pudo abrir %s: %s", nav["ruta"], e)
        else:
            log.warning("El navegador elegido (%s) ya no está instalado: se usa el predeterminado", id_)
    webbrowser.open(url)
    return ""
