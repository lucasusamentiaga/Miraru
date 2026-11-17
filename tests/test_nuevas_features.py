"""
Tests para las nuevas features v2.9:
- Motor de decisión "¿Qué veo esta noche?"
- Notas por episodio
- Página compartible HTML
"""
from __future__ import annotations

import importlib
import os
import tempfile
from pathlib import Path

import pytest


@pytest.fixture
def db(app_dir):
    import database
    importlib.reload(database)
    database.init_db()
    return database


@pytest.fixture
def app_dir(tmp_path, monkeypatch):
    ROOT = Path(__file__).resolve().parents[1]
    monkeypatch.setenv("ANIME_APP_DIR", str(tmp_path))
    monkeypatch.setenv("ANIME_FROZEN_DIR", str(ROOT))
    monkeypatch.setenv("ANIME_DB_PATH", str(tmp_path / "test.db"))
    return tmp_path


@pytest.fixture
def client(db):
    importlib.reload(__import__("main"))
    import main
    importlib.reload(main)
    from fastapi.testclient import TestClient
    with TestClient(main.app, client=("127.0.0.1", 1)) as c:
        yield c


# ── Motor de decisión ────────────────────────────────────────────────────────

class TestQueVeo:
    def test_biblioteca_vacia(self, client):
        r = client.get("/api/que-veo")
        assert r.status_code == 200
        d = r.json()
        assert d["anime"] is None

    def test_recomienda_algo(self, client, db):
        db.guardar_anime({
            "nombre": "Naruto", "fuente": "test", "capitulos": "220",
            "imagen": "", "genero": "Action,Adventure", "sinopsis": "",
            "estado_anime": "Finalizado",
        })
        r = client.get("/api/que-veo")
        assert r.status_code == 200
        d = r.json()
        assert d["anime"] is not None
        assert d["anime"]["nombre"] == "Naruto"

    def test_filtra_por_animo(self, client, db):
        db.guardar_anime({
            "nombre": "Attack on Titan", "fuente": "test", "capitulos": "75",
            "imagen": "", "genero": "Action,Drama", "sinopsis": "",
            "estado_anime": "Finalizado",
        })
        db.guardar_anime({
            "nombre": "K-On!", "fuente": "test", "capitulos": "13",
            "imagen": "", "genero": "Comedy,Slice of Life,Music", "sinopsis": "",
            "estado_anime": "Finalizado",
        })
        r = client.get("/api/que-veo?animo=comedia")
        d = r.json()
        assert d["anime"] is not None
        assert d["animo"] == "comedia"

    def test_devuelve_animos_disponibles(self, client, db):
        db.guardar_anime({
            "nombre": "Test", "fuente": "test", "capitulos": "12",
            "imagen": "", "genero": "Action", "sinopsis": "",
            "estado_anime": "Finalizado",
        })
        r = client.get("/api/que-veo")
        d = r.json()
        assert "animos_disponibles" in d
        assert "accion" in d["animos_disponibles"]
        assert "comedia" in d["animos_disponibles"]

    def test_no_recomienda_completados(self, client, db):
        db.guardar_anime({
            "nombre": "Ya Visto", "fuente": "test", "capitulos": "12",
            "imagen": "", "genero": "Action", "sinopsis": "",
            "estado_anime": "Finalizado",
        })
        db.actualizar_anime("Ya Visto", {"estado_usuario": "completado"})
        r = client.get("/api/que-veo")
        d = r.json()
        assert d["anime"] is None  # no hay pendientes ni viendo

    def test_razon_incluye_info(self, client, db):
        db.guardar_anime({
            "nombre": "My Hero", "fuente": "test", "capitulos": "100",
            "imagen": "", "genero": "Action,Shounen", "sinopsis": "",
            "estado_anime": "En emisión",
        })
        db.actualizar_anime("My Hero", {"estado_usuario": "viendo", "episodios_vistos": 30})
        r = client.get("/api/que-veo?animo=accion")
        d = r.json()
        assert "razon" in d


# ── Notas por episodio ───────────────────────────────────────────────────────

class TestNotasEpisodio:
    def test_guardar_y_leer_nota(self, db):
        db.guardar_anime({
            "nombre": "Steins;Gate", "fuente": "test", "capitulos": "24",
            "imagen": "", "genero": "Sci-Fi", "sinopsis": "",
            "estado_anime": "Finalizado",
        })
        assert db.guardar_nota_episodio("Steins;Gate", 12, "El twist!!")
        notas = db.obtener_notas_episodio("Steins;Gate")
        assert len(notas) == 1
        assert notas[0]["episodio"] == 12
        assert notas[0]["nota"] == "El twist!!"

    def test_actualizar_nota_existente(self, db):
        db.guardar_anime({
            "nombre": "Test", "fuente": "test", "capitulos": "12",
            "imagen": "", "genero": "", "sinopsis": "", "estado_anime": "",
        })
        db.guardar_nota_episodio("Test", 1, "Primera impresión")
        db.guardar_nota_episodio("Test", 1, "Actualizada")
        assert [n["nota"] for n in db.obtener_notas_episodio("Test")] == ["Actualizada"]

    def test_borrar_nota(self, db):
        db.guardar_anime({
            "nombre": "Test", "fuente": "test", "capitulos": "12",
            "imagen": "", "genero": "", "sinopsis": "", "estado_anime": "",
        })
        db.guardar_nota_episodio("Test", 5, "Borrame")
        assert db.borrar_nota_episodio("Test", 5)
        assert db.obtener_notas_episodio("Test") == []

    def test_nota_vacia_no_aparece(self, db):
        db.guardar_anime({
            "nombre": "Test", "fuente": "test", "capitulos": "12",
            "imagen": "", "genero": "", "sinopsis": "", "estado_anime": "",
        })
        db.guardar_nota_episodio("Test", 1, "")
        notas = db.obtener_notas_episodio("Test")
        assert len(notas) == 0  # nota vacía no se lista

    def test_api_guardar_nota(self, client, db):
        db.guardar_anime({
            "nombre": "API Test", "fuente": "test", "capitulos": "12",
            "imagen": "", "genero": "", "sinopsis": "", "estado_anime": "",
        })
        r = client.post(
            "/api/animes/API Test/notas-episodio/3",
            json={"nota": "Buen episodio"}
        )
        assert r.status_code == 200
        r2 = client.get("/api/animes/API Test/notas-episodio")
        assert r2.status_code == 200
        assert len(r2.json()["notas"]) == 1

    def test_api_borrar_nota(self, client, db):
        db.guardar_anime({
            "nombre": "Del Test", "fuente": "test", "capitulos": "12",
            "imagen": "", "genero": "", "sinopsis": "", "estado_anime": "",
        })
        client.post("/api/animes/Del Test/notas-episodio/1", json={"nota": "Borrar"})
        r = client.delete("/api/animes/Del Test/notas-episodio/1")
        assert r.status_code == 200

    def test_plus1_con_nota(self, client, db):
        db.guardar_anime({
            "nombre": "Plus1 Nota", "fuente": "test", "capitulos": "12",
            "imagen": "", "genero": "", "sinopsis": "", "estado_anime": "",
        })
        r = client.post("/api/animes/Plus1 Nota/plus1?nota=Primer%20ep%20genial")
        assert r.status_code == 200
        assert [n["nota"] for n in db.obtener_notas_episodio("Plus1 Nota")] == ["Primer ep genial"]


# ── Puntuaciones externas ───────────────────────────────────────────────────

class TestScoresEndpoint:
    def test_scores_devuelve_estructura(self, client, db):
        db.guardar_anime({
            "nombre": "Naruto", "fuente": "test", "capitulos": "220",
            "imagen": "", "genero": "Action", "sinopsis": "",
            "estado_anime": "Finalizado",
        })
        r = client.get("/api/animes/Naruto/scores")
        assert r.status_code == 200
        d = r.json()
        assert "anilist" in d
        assert "mal" in d
        assert "kitsu" in d
        assert "media" in d
        assert "usuario" in d
        # Cada fuente tiene score, score_raw, url
        for key in ["anilist", "mal", "kitsu"]:
            assert "score" in d[key]
            assert "url" in d[key]

    def test_scores_incluye_puntuacion_usuario(self, client, db):
        db.guardar_anime({
            "nombre": "Scored Anime", "fuente": "test", "capitulos": "12",
            "imagen": "", "genero": "", "sinopsis": "",
            "estado_anime": "Finalizado",
        })
        db.actualizar_anime("Scored Anime", {"puntuacion": 8.5})
        r = client.get("/api/animes/Scored Anime/scores")
        assert r.status_code == 200
        d = r.json()
        assert d["usuario"] == 8.5

    def test_scores_anime_inexistente(self, client, db):
        r = client.get("/api/animes/NoExiste123xyz/scores")
        assert r.status_code == 200
        d = r.json()
        # No debería crashear, usuario será None
        assert d["usuario"] is None
