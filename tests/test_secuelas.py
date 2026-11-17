"""«Temporadas nuevas de lo que viste» a fondo (v2.17.7)."""
from __future__ import annotations

import datetime as dt
import json
import time

import pytest

import secuelas

HOY = dt.date(2026, 11, 17)


def _m(i, titulo, status, secuelas_=(), fmt="TV", eps=12, nxt=None, fin=None, inicio=(2026, 10, 1), adult=False):
    return {"id": i, "isAdult": adult, "title": {"romaji": titulo, "english": None}, "synonyms": [],
            "format": fmt, "status": status, "episodes": eps, "genres": ["Action"], "description": "",
            "coverImage": {"large": ""}, "startDate": dict(zip(("year", "month", "day"), inicio, strict=True)),
            "endDate": dict(zip(("year", "month", "day"), fin, strict=True)) if fin else {},
            "nextAiringEpisode": {"episode": nxt} if nxt else None,
            "relations": {"edges": [{"relationType": "SEQUEL", "node": {"id": s, "type": "ANIME", "format": "TV"}}
                                    for s in secuelas_] + [{"relationType": "PREQUEL", "node": {"id": 999, "type": "ANIME"}}]}}


MEDIAS = {
    1: _m(1, "Saga S1", "FINISHED", [2], fin=(2024, 3, 1)),
    2: _m(2, "Saga S2", "FINISHED", [3], fin=(2025, 3, 1)),        # te la saltaste (vieja): no sale
    3: _m(3, "Saga S3", "RELEASING", [4], nxt=7),                  # en emisión, 2 saltos: sale
    4: _m(4, "Saga S4", "NOT_YET_RELEASED", eps=0),                 # anunciada: no sale
    10: _m(10, "Otra", "FINISHED", [11]),
    11: _m(11, "Otra 2", "FINISHED", fin=(2026, 10, 20)),          # terminada hace poco: sale
    20: _m(20, "Viendo", "FINISHED", [21]),
    21: _m(21, "Viendo 2", "RELEASING", nxt=1),                     # en emisión sin episodios aún: no
    30: _m(30, "Pendiente", "FINISHED", [31]),
    31: _m(31, "Pendiente 2", "RELEASING", nxt=3),                 # de algo pendiente: no cuenta
    40: _m(40, "Peli base", "FINISHED", [41]),
    41: _m(41, "La película", "RELEASING", fmt="MOVIE", nxt=2),     # película: no es temporada
    999: _m(999, "Precuela", "RELEASING", nxt=5),                   # precuela: no se sigue
}


def _post(llamadas):
    def post(query, variables):
        llamadas.append(sorted(variables["ids"]))
        return {"Page": {"media": [MEDIAS[i] for i in variables["ids"] if i in MEDIAS]}}
    return post


def test_cadena_de_secuelas():
    animes = [{"nombre": "Saga S1", "anilist_id": 1, "estado_usuario": "completado"},
              {"nombre": "Otra", "anilist_id": 10, "estado_usuario": "completado"},
              {"nombre": "Viendo", "anilist_id": 20, "estado_usuario": "viendo"},
              {"nombre": "Pendiente", "anilist_id": 30, "estado_usuario": "pendiente"},
              {"nombre": "Peli base", "anilist_id": 40, "estado_usuario": "completado"}]
    llamadas = []
    r = secuelas.buscar(animes, _post(llamadas), hoy=HOY)
    assert [(x["anilist_id"], x["motivo"], x["de"]) for x in r] == [(3, "emision", "Saga S1"), (11, "reciente", "Otra")]
    assert r[0]["eps_emitidos"] == 6
    assert 999 not in {i for lote in llamadas for i in lote}        # las precuelas no se piden


def test_lo_que_ya_tienes_o_ignoraste_no_sale():
    base = [{"nombre": "Saga S1", "anilist_id": 1, "estado_usuario": "completado"},
            {"nombre": "Otra", "anilist_id": 10, "estado_usuario": "completado"}]
    # S3 ya en la lista sin id de AniList (por nombre); «Otra 2» ignorada
    r = secuelas.buscar(base + [{"nombre": "Saga S3", "estado_usuario": "pendiente"}], _post([]),
                        ignorados={11}, hoy=HOY)
    assert r == []


def test_si_anilist_no_contesta_no_rompe():
    def post(q, v):
        raise TimeoutError
    assert secuelas.buscar([{"nombre": "Saga S1", "anilist_id": 1, "estado_usuario": "completado"}], post) == []


@pytest.fixture
def cliente(db):
    import importlib

    from fastapi.testclient import TestClient

    import main
    importlib.reload(main)
    return main, TestClient(main.app, client=("127.0.0.1", 1))


def test_ruta_cache_e_ignorar(cliente, db, monkeypatch):
    main, c = cliente
    from scrapers import anilist as al
    llamadas = []
    monkeypatch.setattr(al, "_post", _post(llamadas))
    monkeypatch.setattr(main, "ANILIST_MIN_INTERVAL", 0)
    monkeypatch.setattr(secuelas, "DIAS_RECIENTE", 100000)
    db.guardar_anime({"nombre": "Saga S1", "anilist_id": 1, "estado_usuario": "completado"})
    ids = [x["anilist_id"] for x in c.get("/api/secuelas?refrescar=1").json()["items"]]
    assert ids == [3, 2]                     # S2 (terminada) también, con «reciente» sin límite
    n = len(llamadas)
    assert [x["anilist_id"] for x in c.get("/api/secuelas").json()["items"]] == [3, 2] and len(llamadas) == n
    assert c.post("/api/secuelas/ignorar", json={"anilist_id": 3}).json()["ok"]
    assert [x["anilist_id"] for x in c.get("/api/secuelas").json()["items"]] == [2]
    db.guardar_anime({"nombre": "Saga S2", "estado_usuario": "pendiente"})          # la añades a mano
    assert c.get("/api/secuelas").json()["items"] == []


def test_cache_antigua_se_recalcula(cliente, db, monkeypatch):
    main, c = cliente
    from scrapers import anilist as al
    llamadas = []
    monkeypatch.setattr(al, "_post", _post(llamadas))
    monkeypatch.setattr(main, "ANILIST_MIN_INTERVAL", 0)
    db.set_config("secuelas_cache", json.dumps({"v": 2, "t": time.time(), "items": [
        {"anilist_id": 7, "nombre": "DAL F", "estado_anime": "Sin estrenar", "de": "DAL"}]}))
    assert c.get("/api/secuelas").json()["items"] == []
