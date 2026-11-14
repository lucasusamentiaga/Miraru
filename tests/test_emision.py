"""Animes en emisión (v2.17.3): el tope es lo emitido y no se pueden completar
con episodios por salir (caso real: Tokyo Revengers Santen, 7 de 13)."""
from __future__ import annotations

import pytest


@pytest.fixture
def c(db, monkeypatch):
    from fastapi.testclient import TestClient

    import database
    import main

    async def _sin_red(anime):           # AniList no dice nada nuevo
        import emision
        return emision.emitidos(anime)
    monkeypatch.setattr(main, "_refrescar_emitidos", _sin_red)
    ok, msg = database.guardar_anime({"nombre": "Santen", "capitulos": "13", "estado_anime": "En emisión",
                                      "estado_usuario": "viendo", "episodios_vistos": 7, "eps_emitidos": 7})
    assert ok, msg
    return TestClient(main.app, client=("127.0.0.1", 1))


def test_plus1_no_pasa_de_lo_emitido(c):
    r = c.post("/api/animes/Santen/plus1")
    assert r.status_code == 409 and "no ha salido" in r.json()["detail"]


def test_no_se_completa_en_emision(c):
    r = c.patch("/api/animes/Santen", json={"estado_usuario": "completado"})
    assert r.status_code == 409 and "emisión" in r.json()["detail"]
    r = c.patch("/api/animes/Santen", json={"estado_usuario": "completado", "episodios_vistos": 13})
    assert r.status_code == 409                       # 13 > 7 emitidos


def test_al_salir_el_ultimo_si(c):
    import database
    database.refrescar_metadata_anime("Santen", {"eps_emitidos": 13})
    r = c.patch("/api/animes/Santen", json={"estado_usuario": "completado", "episodios_vistos": 13})
    assert r.status_code == 200


def test_la_extension_se_cree_y_no_completa(c):
    """Desde fuera (AnimeAV1, Netflix) no hay error: se corrige sola."""
    import asyncio

    import database
    import main
    asyncio.run(main.actualizar_anime("Santen", main.ActualizarRequest(episodios_vistos=8), estricto=False))
    a = database.obtener_anime("Santen")
    assert a["episodios_vistos"] == 8 and a["eps_emitidos"] == 8       # acaba de salir el 8
    database.actualizar_anime("Santen", {"estado_usuario": "completado"})
    assert database.obtener_anime("Santen")["estado_usuario"] == "viendo"


def test_continuar_lleva_lo_emitido(c):
    a = next(x for x in c.get("/api/continuar").json()["animes"] if x["nombre"] == "Santen")
    assert a["eps_emitidos"] == 7 and a["estado_anime"] == "En emisión"


def test_revisar_completados_en_emision(db):
    import database
    import migrations
    database.guardar_anime({"nombre": "A", "capitulos": "12", "estado_anime": "En emisión",
                            "estado_usuario": "completado", "episodios_vistos": 5, "eps_emitidos": 5})
    database.guardar_anime({"nombre": "B", "capitulos": "12", "estado_anime": "En emisión",
                            "estado_usuario": "completado", "episodios_vistos": 5})   # sin dato fresco
    database.guardar_anime({"nombre": "C", "capitulos": "12", "estado_anime": "Finalizado",
                            "estado_usuario": "completado", "episodios_vistos": 12})
    assert migrations.revisar_completados_en_emision() == 1
    assert database.obtener_anime("A")["estado_usuario"] == "viendo"
    assert database.obtener_anime("B")["estado_usuario"] == "completado"
    assert database.obtener_anime("C")["estado_usuario"] == "completado"


def test_anilist_da_los_emitidos():
    from scrapers.anilist import _parse_media
    m = {"id": 1, "title": {"romaji": "X"}, "episodes": 13, "status": "RELEASING", "format": "TV",
         "coverImage": {"large": ""}, "genres": [], "nextAiringEpisode": {"episode": 8}}
    assert _parse_media(m, "", "anilist", "ANIME").eps_emitidos == 7


def test_cambios_seguros_emitidos():
    from types import SimpleNamespace

    from metadatos import cambios_seguros
    nuevo = SimpleNamespace(capitulos=13, imagen="", sinopsis="", genero=[], estado_anime="En emisión",
                            anilist_id=0, volumenes_totales=0, eps_emitidos=8)
    assert cambios_seguros({"capitulos": "13", "estado_anime": "En emisión", "eps_emitidos": 7}, nuevo)["eps_emitidos"] == 8
    nuevo.estado_anime, nuevo.eps_emitidos = "Finalizado", 0
    assert cambios_seguros({"capitulos": "13", "estado_anime": "En emisión", "eps_emitidos": 13}, nuevo)["eps_emitidos"] == 0


def test_lo_visto_ya_ha_salido():
    """AniList dice 5 emitidos pero ya viste el 6 (otro horario): «6/6», no «6/5»."""
    import emision
    a = {"capitulos": "12", "estado_anime": "En emisión", "eps_emitidos": 5, "episodios_vistos": 6}
    assert emision.emitidos(a) == 6 and emision.tope(a) == 6
