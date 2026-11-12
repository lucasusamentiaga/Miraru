"""Miraru en el móvil con un botón (v2.17): sin PIN, sin reiniciar, y el móvil
sigue conectado aunque se reinicie el PC."""
from __future__ import annotations

import pytest


@pytest.fixture
def pc(db, monkeypatch):
    from fastapi.testclient import TestClient

    import acceso_movil
    import main
    # Nada de abrir puertos de verdad en los tests.
    monkeypatch.setattr(acceso_movil, "arrancar", lambda app, puerto: "192.168.1.50:8765")
    acceso_movil.codigo(nuevo=True)
    return TestClient(main.app, client=("127.0.0.1", 1))


@pytest.fixture
def movil():
    from fastapi.testclient import TestClient

    import main
    return TestClient(main.app, client=("192.168.1.77", 5000))


def test_un_boton_y_el_qr_lleva_el_codigo(pc, movil):
    d = pc.post("/api/mobile/conectar").json()
    assert d["activado"] and d["escuchando"] and d["moviles"] == 0
    assert d["url"] == "http://192.168.1.50:8765/m"
    largo = d["url_qr"].split("#c=")[1]
    # Sin sesión, los datos siguen cerrados.
    assert movil.get("/api/mobile/animes").status_code == 401
    r = movil.post("/api/mobile/emparejar", json={"codigo": largo},
                   headers={"user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)"})
    assert r.status_code == 200
    tok = r.json()["token"]
    assert movil.get("/api/mobile/animes", headers={"X-Mobile-Token": tok}).status_code == 200
    assert pc.get("/api/mobile/estado").json()["moviles"] == 1


def test_codigo_corto_y_codigo_malo(pc, movil):
    d = pc.post("/api/mobile/conectar").json()
    assert movil.post("/api/mobile/emparejar", json={"codigo": "000000x"}).status_code == 403
    r = movil.post("/api/mobile/emparejar", json={"codigo": d["codigo"][:3] + " " + d["codigo"][3:]})
    assert r.status_code == 200


def test_la_sesion_sobrevive_a_reiniciar(pc, movil):
    import main
    d = pc.post("/api/mobile/conectar").json()
    tok = movil.post("/api/mobile/emparejar", json={"codigo": d["codigo"]}).json()["token"]
    main._mobile_tokens.clear()              # lo que se perdía al reiniciar
    assert movil.get("/api/mobile/animes", headers={"X-Mobile-Token": tok}).status_code == 200


def test_desconectar_cierra_las_sesiones(pc, movil):
    d = pc.post("/api/mobile/conectar").json()
    tok = movil.post("/api/mobile/emparejar", json={"codigo": d["codigo"]}).json()["token"]
    assert movil.post("/api/mobile/disable").status_code in (401, 403)   # el móvil no puede
    assert pc.post("/api/mobile/disable").status_code == 200
    assert pc.get("/api/mobile/estado").json()["activado"] is False
    import database
    database.set_config("mobile_enabled", "1")
    assert movil.get("/api/mobile/animes", headers={"X-Mobile-Token": tok}).status_code == 401


def test_el_codigo_solo_se_ve_desde_el_pc(pc, movil):
    pc.post("/api/mobile/conectar")
    assert movil.get("/api/mobile/estado").status_code in (401, 403)


def test_codigo_caducado(pc, movil, monkeypatch):
    import acceso_movil
    d = pc.post("/api/mobile/conectar").json()
    acceso_movil._codigo["expira"] = 0
    assert movil.post("/api/mobile/emparejar", json={"codigo": d["codigo"]}).status_code == 403


def test_el_pin_de_antes_sigue_valiendo(pc, movil):
    assert pc.post("/api/mobile/enable", json={"pin": "4321"}).status_code == 200
    assert movil.post("/api/mobile/emparejar", json={"codigo": "4321"}).status_code == 200
    assert movil.post("/api/mobile/auth", json={"pin": "4321"}).status_code == 200


def test_ip_local_no_da_loopback():
    import acceso_movil
    ip = acceso_movil.ip_local()
    assert not ip.startswith("127.")
