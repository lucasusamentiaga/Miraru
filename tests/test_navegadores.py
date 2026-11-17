"""Elegir en qué navegador se abre Miraru (v2.17.7)."""
from __future__ import annotations

import importlib

import pytest
from fastapi.testclient import TestClient

import navegadores

NAVS = [{"id": "chrome", "nombre": "Google Chrome", "ruta": "/x/chrome"},
        {"id": "edge", "nombre": "Microsoft Edge", "ruta": "/x/msedge"}]


@pytest.fixture
def c(db, monkeypatch):
    import main
    importlib.reload(main)
    monkeypatch.setattr(navegadores, "detectar", lambda: list(NAVS))
    monkeypatch.setattr(navegadores, "predeterminado", lambda: "edge")
    return main, TestClient(main.app, client=("127.0.0.1", 1))


def test_primera_vez_pregunta_y_luego_no(c, monkeypatch):
    main, cli = c
    d = cli.get("/api/navegadores").json()
    assert d["preguntar"] is True and [n["id"] for n in d["navegadores"]] == ["chrome", "edge"]
    assert "ruta" not in d["navegadores"][0]                       # las rutas no salen del PC
    abiertos = []
    monkeypatch.setattr(navegadores, "abrir", lambda url, id_=None: abiertos.append((url, id_)) or id_)
    r = cli.post("/api/navegador", json={"id": "chrome", "abrir": True}).json()
    assert r["elegido"] == "chrome" and abiertos and abiertos[0][1] == "chrome"
    d = cli.get("/api/navegadores").json()
    assert d["preguntar"] is False and d["elegido"] == "chrome"
    assert cli.post("/api/navegador", json={"id": "netscape"}).status_code == 404
    assert cli.post("/api/navegador", json={"id": ""}).json()["elegido"] == ""      # el predeterminado


def test_con_un_solo_navegador_no_pregunta(c, monkeypatch):
    main, cli = c
    monkeypatch.setattr(navegadores, "detectar", lambda: NAVS[:1])
    assert cli.get("/api/navegadores").json()["preguntar"] is False


def test_desde_el_movil_ni_pregunta_ni_cambia(c):
    main, cli = c
    movil = TestClient(main.app, client=("192.168.1.40", 1))
    assert movil.get("/api/navegadores").json()["preguntar"] is False
    assert movil.post("/api/navegador", json={"id": "chrome"}).status_code == 403


def test_abrir_usa_el_elegido_o_el_predeterminado(db, monkeypatch):
    lanzados, por_defecto = [], []
    monkeypatch.setattr(navegadores, "detectar", lambda: list(NAVS))
    monkeypatch.setattr(navegadores.subprocess, "Popen", lambda args, **k: lanzados.append(args))
    monkeypatch.setattr(navegadores.webbrowser, "open", lambda url: por_defecto.append(url))
    navegadores.guardar("edge")
    assert navegadores.abrir("http://127.0.0.1:8765") == "edge" and lanzados == [["/x/msedge", "http://127.0.0.1:8765"]]
    navegadores.guardar("vivaldi")                                     # desinstalado
    assert navegadores.abrir("http://127.0.0.1:8765") == "" and por_defecto


def test_id_por_ejecutable():
    f = navegadores._id_por_exe
    assert f(r"C:\Users\x\AppData\Local\Programs\Opera GX\launcher.exe") == "operagx"
    assert f(r"C:\Users\x\AppData\Local\Programs\Opera\launcher.exe") == "opera"
    assert f(r"C:\Program Files\Google\Chrome\Application\chrome.exe") == "chrome"
    assert f(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe") == "edge"
    assert f(r"C:\Program Files\Internet Explorer\iexplore.exe") == "ie"
