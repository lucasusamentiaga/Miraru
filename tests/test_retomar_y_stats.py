"""v2.18.1: «Retomar por donde lo dejaste», pestañas de Estadísticas y «Viendo actualmente»."""
from __future__ import annotations

import importlib

import pytest
from fastapi.testclient import TestClient

H = {"X-Miraru-Extension": "1"}


@pytest.fixture
def cliente(db):
    import main
    importlib.reload(main)
    with TestClient(main.app, client=("127.0.0.1", 1)) as c:
        yield c, main


def _prog(**k):
    base = {"mediaId": 7, "slug": "sousou-no-frieren", "episode": 5, "titulo": "Sousou no Frieren Episodio 5 - AnimeAV1",
            "t": 754, "d": 1440, "url": "https://animeav1.com/media/sousou-no-frieren/5"}
    return {**base, **k}


def test_retomar_guarda_y_ofrece_el_minuto(cliente):
    c, _ = cliente
    assert c.post("/api/extension/progreso", json=_prog()).status_code == 403
    assert c.post("/api/extension/progreso", json=_prog(), headers=H).json()["ok"]
    r = c.get("/api/retomar").json()["retomar"]
    assert r["nombre"] == "Sousou no Frieren" and r["episodio"] == 5 and r["t"] == 754
    assert r["url"] == "https://animeav1.com/media/sousou-no-frieren/5#miraru-t=754"
    c.post("/api/retomar/descartar")
    assert c.get("/api/retomar").json()["retomar"] is None


def test_retomar_no_si_casi_terminado_o_recien_empezado(cliente):
    c, _ = cliente
    c.post("/api/extension/progreso", json=_prog(t=1400), headers=H)
    assert c.get("/api/retomar").json()["retomar"] is None
    c.post("/api/extension/progreso", json=_prog(t=20), headers=H)
    assert c.get("/api/retomar").json()["retomar"] is None


def test_retomar_rechaza_urls_de_otra_web(cliente):
    c, _ = cliente
    r = c.post("/api/extension/progreso", json=_prog(url="https://malo.example/x", slug="../x"), headers=H)
    assert r.status_code == 422


def test_marcar_el_episodio_quita_el_retomar(db):
    import retomar
    retomar.guardar(_prog())
    retomar.marcado(7, 5)
    assert retomar.pendiente() is None


def test_viendo_actualmente_y_pestanas(cliente):
    c, _ = cliente
    import database as d
    d.guardar_anime({"nombre": "A", "estado_usuario": "viendo", "episodios_vistos": 3, "capitulos": "12"})
    d.guardar_anime({"nombre": "B", "estado_usuario": "completado"})
    d.guardar_anime({"nombre": "M", "tipo": "manga", "estado_usuario": "viendo", "episodios_vistos": 40, "puntuacion": 9})
    s = c.get("/api/stats").json()
    assert [a["nombre"] for a in s["watching"]] == ["A"]
    m = c.get("/api/stats/biblioteca?tipo=manga").json()
    assert m["total"] == 1 and m["capitulos"] == 40 and m["watching"][0]["nombre"] == "M"
    v = c.get("/api/stats/biblioteca?tipo=media").json()
    assert v["total"] == 0 and v["peliculas"] == 0
    assert c.get("/api/stats/biblioteca?tipo=x").status_code == 400
