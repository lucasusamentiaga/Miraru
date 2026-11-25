"""v2.18.5: géneros en el idioma de la interfaz y «vas por el ep N» en Mi año."""
from __future__ import annotations

import datetime
import importlib

import pytest
from fastapi.testclient import TestClient

import generos


def test_traduce_y_deja_lo_desconocido():
    assert generos.nombre("Comedy", "es") == "Comedia"
    assert generos.nombre("Slice of Life", "fr") == "Tranche de vie"
    assert generos.nombre("Comedy", "en") == "Comedy"
    assert generos.nombre("Comedia", "es") == "Comedia"          # ya traducido (series y pelis)
    assert generos.contar(["Comedy", "Comedia", "Action"], "es") == {"Comedia": 2, "Acción": 1}
    assert generos.mapa("es")["Action"] == "Acción" and generos.mapa("en") == {}


@pytest.fixture
def cliente(db):
    import main
    importlib.reload(main)
    with TestClient(main.app, client=("127.0.0.1", 1)) as c:
        yield c, db


def test_stats_y_mi_ano_en_espanol_y_vas_por(cliente):
    c, db = cliente
    c.post("/api/lang", json={"lang": "es"})
    db.guardar_anime({"nombre": "Gurren Lagann", "genero": "Action, Comedy", "capitulos": "27",
                  "estado_usuario": "viendo", "episodios_vistos": 21})
    hoy = datetime.datetime.now().strftime("%Y-%m-%d %H:")
    with db.get_conn() as conn:
        for ep in range(15, 22):
            conn.execute("INSERT INTO ep_log (nombre, episodio, fecha) VALUES (?, ?, ?)",
                         ("Gurren Lagann", ep, f"{hoy}{ep:02d}:00"))
    s = c.get("/api/stats").json()
    assert "Acción" in s["genres"] and "Action" not in s["genres"]
    w = c.get("/api/stats/wrapped").json()
    v = w["vistos_anio"][0]
    assert v["episodios"] == 7 and v["vas_por"] == 21
    assert {g["genero"] for g in w["top_generos"]} == {"Acción", "Comedia"}
    assert c.get("/api/lang").json()["generos"]["Comedy"] == "Comedia"
