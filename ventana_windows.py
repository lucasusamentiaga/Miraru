"""Miraru en Windows: ventana de arranque y cierre ordenado (v2.17.9).

Por qué existe: la Microsoft Store marcaba «no responde» (hang) en casi todos
los equipos (19 de 19 en un mes, una vez por equipo). Miraru no tenía NINGUNA
ventana: un proceso sin ventanas no puede contestar cuando Windows pregunta a
las apps si pueden cerrarse (apagar o reiniciar el PC, cerrar sesión, o la
Store actualizando la app mientras está abierta: Miraru siempre lo está, de
fondo). Windows esperaba, no recibía respuesta y lo cerraba a la fuerza, y eso
cuenta como «no responde». Tampoco había ninguna señal visible al abrirlo
desde Inicio hasta que aparecía el navegador.

Ahora, en Windows:
1. `pantalla_de_arranque`: una ventanita «Abriendo Miraru…» mientras arranca
   el servidor (en su propio hilo; se cierra sola en cuanto está listo).
2. `bucle_de_mensajes`: una ventana oculta de nivel superior que atiende los
   mensajes de Windows en el hilo principal (WM_QUERYENDSESSION → «sí, puedo
   cerrar»; WM_ENDSESSION / WM_CLOSE → se cierra en orden). Mientras tanto
   comprueba cada segundo que el servidor sigue vivo.
Fuera de Windows no hace nada (las funciones vuelven sin más).
"""
from __future__ import annotations

import locale
import os
import sys
import threading
import time
from collections.abc import Callable
from pathlib import Path
from typing import Optional

ES_WINDOWS = sys.platform == "win32"

TEXTOS = {"es": "Abriendo Miraru…", "en": "Opening Miraru…",
          "fr": "Ouverture de Miraru…", "de": "Miraru wird geöffnet…"}


def idioma_sistema() -> str:
    try:
        if ES_WINDOWS:
            import ctypes
            lang = locale.windows_locale.get(ctypes.windll.kernel32.GetUserDefaultUILanguage(), "")
        else:
            lang = (locale.getlocale()[0] or "")
    except Exception:  # noqa: BLE001
        lang = ""
    lang = (lang or "es")[:2].lower()
    return lang if lang in TEXTOS else "en" if lang else "es"


# ── 1. Pantalla de arranque ──────────────────────────────────────────────────
def pantalla_de_arranque(listo: threading.Event, logo: Optional[Path] = None,
                         maximo: float = 45.0, log: Callable[[str], None] = lambda s: None) -> Optional[threading.Thread]:
    """Enseña «Abriendo Miraru…» hasta que `listo` se active (o `maximo` s)."""
    if not ES_WINDOWS or os.environ.get("MIRARU_SIN_DIALOGOS") == "1":
        return None

    def _hilo():
        try:
            import tkinter as tk
            root = tk.Tk()
            root.overrideredirect(True)
            root.attributes("-topmost", True)
            fondo, texto, gris = "#0a0812", "#edecf4", "#a49dc0"
            root.configure(bg=fondo)
            ancho, alto = 300, 108
            x = (root.winfo_screenwidth() - ancho) // 2
            y = (root.winfo_screenheight() - alto) // 2
            root.geometry(f"{ancho}x{alto}+{x}+{y}")
            marco = tk.Frame(root, bg=fondo, highlightbackground="#3a3258", highlightthickness=1)
            marco.pack(fill="both", expand=True)
            img = None
            if logo and logo.is_file():
                try:
                    img = tk.PhotoImage(file=str(logo))
                    if img.width() > 64:                    # se espera el icono de 48 px
                        paso = img.width() // 48
                        img = img.subsample(paso, paso)
                    tk.Label(marco, image=img, bg=fondo).pack(side="left", padx=(18, 12))
                except Exception:  # noqa: BLE001
                    img = None
            caja = tk.Frame(marco, bg=fondo)
            caja.pack(side="left", fill="y", expand=True, anchor="w")
            tk.Label(caja, text="Miraru", fg=texto, bg=fondo, font=("Segoe UI Semibold", 14)).pack(anchor="w", pady=(28, 0))
            puntos = tk.Label(caja, text=TEXTOS[idioma_sistema()], fg=gris, bg=fondo, font=("Segoe UI", 10))
            puntos.pack(anchor="w")
            inicio = time.time()

            def mirar():
                if listo.is_set() or time.time() - inicio > maximo:
                    root.destroy()
                    return
                root.after(150, mirar)
            root.after(150, mirar)
            root.mainloop()
        except Exception as e:  # noqa: BLE001
            log(f"Pantalla de arranque: {e}")

    t = threading.Thread(target=_hilo, daemon=True, name="miraru-arranque")
    t.start()
    return t


# ── 2. Ventana oculta: contestar a Windows y cerrarse en orden ──────────────
WM_CLOSE = 0x0010
WM_QUERYENDSESSION = 0x0011
WM_ENDSESSION = 0x0016
WM_TIMER = 0x0113
WM_DESTROY = 0x0002


def decidir(msg: int, wparam: int) -> str:
    """Qué hacer con cada mensaje (separado para poder probarlo en cualquier sistema).
    «si» = contestar TRUE; «cerrar» = cerrarse en orden; «" = lo normal."""
    if msg == WM_QUERYENDSESSION:
        return "si"
    if msg == WM_ENDSESSION:
        return "cerrar" if wparam else ""
    if msg == WM_CLOSE:
        return "cerrar"
    return ""


def bucle_de_mensajes(sigue_vivo: Callable[[], bool], al_cerrar: Callable[[str], None],
                      log: Callable[[str], None] = lambda s: None) -> bool:
    """Ventana oculta + bucle de mensajes en el hilo actual. Vuelve cuando el
    servidor deja de estar vivo. False si no se pudo (fuera de Windows, o error):
    entonces quien llama sigue con su bucle de siempre."""
    if not ES_WINDOWS:
        return False
    try:
        import ctypes
        from ctypes import wintypes
        user32 = ctypes.windll.user32
        kernel32 = ctypes.windll.kernel32
        LRESULT = ctypes.c_ssize_t
        WNDPROC = ctypes.WINFUNCTYPE(LRESULT, wintypes.HWND, wintypes.UINT, wintypes.WPARAM, wintypes.LPARAM)
        user32.DefWindowProcW.restype = LRESULT
        user32.DefWindowProcW.argtypes = [wintypes.HWND, wintypes.UINT, wintypes.WPARAM, wintypes.LPARAM]

        class WNDCLASSW(ctypes.Structure):
            _fields_ = [("style", wintypes.UINT), ("lpfnWndProc", WNDPROC), ("cbClsExtra", ctypes.c_int),
                        ("cbWndExtra", ctypes.c_int), ("hInstance", wintypes.HINSTANCE), ("hIcon", wintypes.HICON),
                        ("hCursor", wintypes.HANDLE), ("hbrBackground", wintypes.HBRUSH),
                        ("lpszMenuName", wintypes.LPCWSTR), ("lpszClassName", wintypes.LPCWSTR)]

        def wndproc(hwnd, msg, wparam, lparam):
            accion = decidir(msg, wparam)
            if accion == "si":
                log("Windows pregunta si Miraru puede cerrarse (apagar, reiniciar o actualizar): sí")
                return 1
            if accion == "cerrar":
                motivo = "fin de sesión" if msg == WM_ENDSESSION else "cierre pedido por Windows"
                log(f"Miraru se cierra en orden ({motivo})")
                try:
                    al_cerrar(motivo)
                finally:
                    os._exit(0)
            if msg == WM_TIMER and not sigue_vivo():
                user32.PostQuitMessage(0)
                return 0
            return user32.DefWindowProcW(hwnd, msg, wparam, lparam)

        proc = WNDPROC(wndproc)               # referencia viva mientras dure el bucle
        hinst = kernel32.GetModuleHandleW(None)
        clase = WNDCLASSW(lpfnWndProc=proc, hInstance=hinst, lpszClassName="MiraruVentanaOculta")
        user32.RegisterClassW(ctypes.byref(clase))
        user32.CreateWindowExW.restype = wintypes.HWND
        # De nivel superior (no «solo mensajes»): así le llegan WM_QUERYENDSESSION
        # y los avisos de cierre de la Store. Nunca se enseña.
        hwnd = user32.CreateWindowExW(0, "MiraruVentanaOculta", "Miraru", 0, 0, 0, 0, 0,
                                      None, None, hinst, None)
        if not hwnd:
            log("No se pudo crear la ventana oculta")
            return False
        global _HWND
        _HWND = int(hwnd)                    # v2.18: la Store la necesita para su ventana de compra
        user32.SetTimer(hwnd, 1, 1000, None)
        msg = wintypes.MSG()
        while user32.GetMessageW(ctypes.byref(msg), None, 0, 0) > 0:
            user32.TranslateMessage(ctypes.byref(msg))
            user32.DispatchMessageW(ctypes.byref(msg))
        user32.DestroyWindow(hwnd)
        return True
    except Exception as e:  # noqa: BLE001
        log(f"Bucle de mensajes: {e}")
        return False


_HWND = 0


def hwnd_principal() -> int:
    """v2.18: la ventana (oculta) de Miraru, para los diálogos de la Store. 0 si no hay."""
    return _HWND
