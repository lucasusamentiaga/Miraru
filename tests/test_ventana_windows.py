"""Cierre ordenado en Windows (v2.17.9): la Store marcaba «no responde» porque
Miraru no tenía ventana con la que contestar a Windows al apagar o actualizar."""
from __future__ import annotations

import threading

import ventana_windows as vw


def test_contesta_a_windows():
    assert vw.decidir(vw.WM_QUERYENDSESSION, 0) == "si"          # «¿puedo apagar?» → sí
    assert vw.decidir(vw.WM_ENDSESSION, 1) == "cerrar"           # se apaga de verdad → cerrar en orden
    assert vw.decidir(vw.WM_ENDSESSION, 0) == ""                 # se canceló el apagado → seguir
    assert vw.decidir(vw.WM_CLOSE, 0) == "cerrar"                # la Store pide cerrar para actualizar
    assert vw.decidir(vw.WM_TIMER, 0) == ""


def test_fuera_de_windows_no_hace_nada(monkeypatch):
    monkeypatch.setattr(vw, "ES_WINDOWS", False)
    assert vw.pantalla_de_arranque(threading.Event()) is None
    assert vw.bucle_de_mensajes(lambda: True, lambda m: None) is False


def test_textos_en_los_cuatro_idiomas():
    assert set(vw.TEXTOS) == {"es", "en", "fr", "de"}
    assert vw.idioma_sistema() in vw.TEXTOS


def test_el_launcher_lo_usa():
    from pathlib import Path
    src = (Path(__file__).resolve().parent.parent / "launcher.py").read_text(encoding="utf-8")
    assert "ventana_windows.pantalla_de_arranque(" in src and "ventana_windows.bucle_de_mensajes(" in src
