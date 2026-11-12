"""Instalar la extensión del navegador en dos clics (v2.17).

Antes había que descargar un .zip, descomprimirlo, abrir chrome://extensions a
mano y buscar la carpeta. Ahora Miraru:

1. Deja la extensión en una carpeta fija (`~/Miraru/extension-navegador`) y
   copia su ruta al portapapeles.
2. Abre la página de extensiones de Chrome (o de Edge si no hay Chrome).
   Allí solo queda «Modo de desarrollador» → «Cargar descomprimida» → Ctrl+V.

Al arrancar Miraru, si esa carpeta ya existe y la extensión trae una versión
nueva, se actualiza sola: en Chrome basta con pulsar ↻ en su tarjeta.

La carpeta va en tu carpeta de usuario y no en AppData: la versión de la
Microsoft Store guarda AppData en un sitio que Chrome no ve.
"""
from __future__ import annotations

import json
import logging
import os
import shutil
import subprocess
import sys
from pathlib import Path

log = logging.getLogger("miraru.extension")


def carpeta() -> Path:
    return Path(os.environ.get("MIRARU_EXT_DIR") or (Path.home() / "Miraru" / "extension-navegador"))


def _version(d: Path) -> str:
    try:
        return str(json.loads((d / "manifest.json").read_text(encoding="utf-8")).get("version") or "")
    except Exception:
        return ""


def copiar(origen: Path, destino: Path | None = None) -> Path:
    """Copia la extensión a la carpeta fija (sustituye lo que hubiera)."""
    destino = destino or carpeta()
    destino.mkdir(parents=True, exist_ok=True)
    for f in sorted(origen.rglob("*")):
        rel = f.relative_to(origen)
        if f.is_dir():
            (destino / rel).mkdir(parents=True, exist_ok=True)
        elif f.is_file():
            (destino / rel).parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(f, destino / rel)
    return destino


def actualizar_si_existe(origen: Path) -> bool:
    """Al arrancar: si ya la instalaste y hay versión nueva, se pone al día."""
    d = carpeta()
    if not (d / "manifest.json").is_file() or not origen.is_dir():
        return False
    if _version(d) == _version(origen):
        return False
    copiar(origen, d)
    log.info("Extensión del navegador actualizada a %s en %s", _version(origen), d)
    return True


def al_portapapeles(texto: str) -> bool:
    if sys.platform != "win32":
        return False
    try:
        subprocess.run(["clip"], input=texto.encode("utf-16le"), check=True, timeout=5,
                       creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
        return True
    except Exception:  # noqa: BLE001
        return False


def _navegadores() -> list[tuple[str, Path, str]]:
    pf = [os.environ.get(k) for k in ("PROGRAMFILES", "PROGRAMFILES(X86)", "LOCALAPPDATA")]
    out = []
    for nombre, rel, url in (("Chrome", r"Google\Chrome\Application\chrome.exe", "chrome://extensions"),
                             ("Edge", r"Microsoft\Edge\Application\msedge.exe", "edge://extensions"),
                             ("Brave", r"BraveSoftware\Brave-Browser\Application\brave.exe", "brave://extensions")):
        for base in pf:
            if base and (Path(base) / rel).is_file():
                out.append((nombre, Path(base) / rel, url))
                break
    return out


def abrir_extensiones() -> str:
    """Abre la página de extensiones del primer navegador que haya. Devuelve
    su nombre, o "" si no se pudo."""
    if sys.platform != "win32":
        return ""
    for nombre, exe, url in _navegadores():
        try:
            subprocess.Popen([str(exe), url], close_fds=True)
            return nombre
        except Exception:  # noqa: BLE001
            continue
    return ""
