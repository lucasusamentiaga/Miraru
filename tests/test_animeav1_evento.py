"""AnimeAV1 → Miraru al instante (extensión del navegador).

La extensión ve el POST /api/user/library {"mediaId", "episode"} que hace
animeav1.com al pulsar «Marcar como visto» y lo manda a /api/animeav1/evento.
Sin red: la ficha de AnimeAV1 y AniList se simulan.
"""
from __future__ import annotations

import importlib
import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from scrapers.base import AnimeData

ROOT = Path(__file__).resolve().parent.parent
H = {"X-Miraru-Extension": "1"}


@pytest.fixture
def cliente(db):
    import main
    importlib.reload(main)
    with TestClient(main.app, client=("127.0.0.1", 1)) as c:
        yield c, main


def _eps_log(db, n):
    with db.get_conn() as c:
        return [r[0] for r in c.execute("SELECT episodio FROM ep_log WHERE nombre=? ORDER BY episodio", (n,))]


def test_sin_la_cabecera_de_la_extension_no_se_acepta(cliente):
    c, _ = cliente
    assert c.post("/api/animeav1/evento", json={"mediaId": 1, "episode": 1}).status_code == 403


def test_marcar_visto_actualiza_por_titulo_y_recuerda_el_id(cliente, db):
    c, _ = cliente
    db.guardar_anime({"nombre": "Sousou no Frieren", "capitulos": "28", "episodios_vistos": 4})
    r = c.post("/api/animeav1/evento", headers=H, json={
        "mediaId": 77, "episode": 5, "slug": "sousou-no-frieren",
        "titulo": "Sousou no Frieren Episodio 5 Sub Español Online en HD - AnimeAV1"})
    assert r.status_code == 200, r.text
    assert r.json()["accion"] == "actualizado"
    a = db.obtener_anime("Sousou no Frieren")
    assert a["episodios_vistos"] == 5 and a["estado_usuario"] == "viendo"
    assert _eps_log(db, "Sousou no Frieren") == [5]           # cuenta en el mapa de actividad
    import animeav1_sync
    assert animeav1_sync._ids()["Sousou no Frieren"] == 77
    # Siguiente evento: ya va por el id, aunque no venga título
    c.post("/api/animeav1/evento", headers=H, json={"mediaId": 77, "episode": 6})
    assert db.obtener_anime("Sousou no Frieren")["episodios_vistos"] == 6


def test_desmarcar_baja_el_episodio(cliente, db):
    c, _ = cliente
    db.guardar_anime({"nombre": "Dandadan", "capitulos": "12", "episodios_vistos": 3})
    import animeav1_sync
    animeav1_sync.recordar_id("Dandadan", 9)
    c.post("/api/animeav1/evento", headers=H, json={"mediaId": 9, "episode": 4})
    c.post("/api/animeav1/evento", headers=H, json={"mediaId": 9, "episode": 3})   # «no visto»
    assert db.obtener_anime("Dandadan")["episodios_vistos"] == 3
    assert _eps_log(db, "Dandadan") == []


def test_un_episodio_atrasado_no_baja_el_progreso(cliente, db):
    c, _ = cliente
    db.guardar_anime({"nombre": "Dandadan", "capitulos": "12", "episodios_vistos": 10,
                      "estado_usuario": "viendo"})
    import animeav1_sync
    animeav1_sync.recordar_id("Dandadan", 9)
    r = c.post("/api/animeav1/evento", headers=H, json={"mediaId": 9, "episode": 2})
    assert r.json()["accion"] == "ya visto"          # v2.17.12: Miraru iba por delante
    assert db.obtener_anime("Dandadan")["episodios_vistos"] == 10


def test_ultimo_episodio_lo_completa(cliente, db):
    c, _ = cliente
    db.guardar_anime({"nombre": "Dandadan", "capitulos": "12", "episodios_vistos": 11,
                      "estado_usuario": "viendo"})
    import animeav1_sync
    animeav1_sync.recordar_id("Dandadan", 9)
    c.post("/api/animeav1/evento", headers=H, json={"mediaId": 9, "episode": 12})
    assert db.obtener_anime("Dandadan")["estado_usuario"] == "completado"
    c.post("/api/animeav1/evento", headers=H, json={"mediaId": 9, "episode": 11})   # desmarcar
    a = db.obtener_anime("Dandadan")
    assert a["episodios_vistos"] == 11 and a["estado_usuario"] == "viendo"


def test_anime_nuevo_se_anade(cliente, db, monkeypatch):
    c, main = cliente
    from scrapers import animeav1 as av1
    monkeypatch.setattr(av1, "obtener_media", lambda slug, s=None: {
        "id": 5, "title": "Kusuriya no Hitorigoto", "malId": 54492, "aka": {}})

    class AL:
        def buscar_por_mal(self, mal):
            return AnimeData(nombre="The Apothecary Diaries", capitulos=24, imagen="", genero=[],
                             sinopsis="", fuente="anilist", estado_anime="", anilist_id=161645)
    from scrapers import SCRAPERS
    monkeypatch.setitem(SCRAPERS, "anilist", AL())
    r = c.post("/api/animeav1/evento", headers=H, json={"mediaId": 5, "episode": 1, "slug": "kusuriya"})
    assert r.json()["accion"] == "añadido"
    a = db.obtener_anime("The Apothecary Diaries")
    assert a["episodios_vistos"] == 1 and a["estado_usuario"] == "viendo" and a["anilist_id"] == 161645
    assert c.get("/api/animeav1/extension").json()["ultimo"]["nombre"] == "The Apothecary Diaries"


def test_la_lista_avisa_de_cambios(cliente, db):
    c, _ = cliente
    v1 = c.get("/api/biblioteca/version").json()["v"]
    db.guardar_anime({"nombre": "Dandadan"})
    assert c.get("/api/biblioteca/version").json()["v"] != v1


def test_titulo_de_pestana():
    import animeav1_sync as s
    assert s.titulo_de_pestana("Sousou no Frieren Episodio 1 Sub Español Online en HD - AnimeAV1") == "Sousou no Frieren"
    assert s.titulo_de_pestana("One Piece - AnimeAV1") == "One Piece"


def test_extension_descargable_y_coherente(cliente):
    c, _ = cliente
    r = c.get("/api/animeav1/extension.zip")
    assert r.status_code == 200
    import io
    import zipfile
    z = zipfile.ZipFile(io.BytesIO(r.content))
    nombres = set(z.namelist())
    assert {"miraru-animeav1/manifest.json", "miraru-animeav1/background.js",
            "miraru-animeav1/popup.html", "miraru-animeav1/iconos/128.png"} <= nombres
    m = json.loads(z.read("miraru-animeav1/manifest.json"))
    assert m["manifest_version"] == 3 and "webRequest" in m["permissions"]
    bg = z.read("miraru-animeav1/background.js").decode()
    # La extensión manda la cabecera que exige el servidor y a la ruta correcta.
    assert "X-Miraru-Extension" in bg and "/api/animeav1/evento" in bg
    assert "https://animeav1.com/api/user/library" in bg


def test_anime_nuevo_ya_terminado_entra_como_completado(cliente, db, monkeypatch):
    c, _ = cliente
    from scrapers import SCRAPERS
    from scrapers import animeav1 as av1
    monkeypatch.setattr(av1, "obtener_media", lambda slug, s=None: {"id": 6, "title": "Corto", "malId": 1})

    class AL:
        def buscar_por_mal(self, mal):
            return AnimeData(nombre="Corto", capitulos=3, imagen="", genero=[], sinopsis="",
                             fuente="anilist", estado_anime="")
    monkeypatch.setitem(SCRAPERS, "anilist", AL())
    c.post("/api/animeav1/evento", headers=H, json={"mediaId": 6, "episode": 3, "slug": "corto"})
    assert db.obtener_anime("Corto")["estado_usuario"] == "completado"


def test_contenido_adulto_no_entra_por_animeav1(cliente, db, monkeypatch):
    """El AniList con filtro no lo da (es adulto) y la ficha de AnimeAV1 viene
    marcada como `mature`: no se añade nada."""
    c, _ = cliente
    from scrapers import SCRAPERS
    from scrapers import animeav1 as av1
    monkeypatch.setattr(av1, "obtener_media", lambda slug, s=None: {
        "id": 8, "title": "Algo H", "malId": 99, "mature": True, "genres": [{"name": "Hentai"}]})

    class AL:
        def buscar_por_mal(self, mal):
            return None
    monkeypatch.setitem(SCRAPERS, "anilist", AL())
    r = c.post("/api/animeav1/evento", headers=H, json={"mediaId": 8, "episode": 1, "slug": "algo-h"})
    assert r.status_code == 422
    assert db.obtener_anime("Algo H") is None


def test_animeav1_usa_el_anilist_con_filtro_de_adultos():
    import inspect

    import animeav1_sync
    src = inspect.getsource(animeav1_sync)
    assert "AniListScraper()" not in src.replace("AniListScraper() suelto", "")
    from scrapers import SCRAPERS
    assert animeav1_sync._anilist_protegido() is SCRAPERS["anilist"]
    assert hasattr(SCRAPERS["anilist"].buscar_por_mal, "__wrapped__")


@pytest.mark.parametrize("vistos,ep,accion,esperado", [
    (6, 5, "marcar", 6),       # dos clics desordenados: el 5 llega tras el 6 → no baja
    (4, 5, "marcar", 5),
    (6, 5, "desmarcar", 5),    # «Marcar como no visto» en el 6
    (8, 3, "desmarcar", 3),    # «desmarcar hasta el anterior» desde un episodio antiguo
    (3, 5, "desmarcar", 3),    # desmarcar nunca sube
    (6, 5, None, 5),           # extensión antigua: N-1 = desmarcar
    (8, 3, None, 8),
])
def test_marcar_y_desmarcar(cliente, db, vistos, ep, accion, esperado):
    c, _ = cliente
    db.guardar_anime({"nombre": "Dandadan", "capitulos": "12", "episodios_vistos": vistos,
                      "estado_usuario": "viendo"})
    import animeav1_sync
    animeav1_sync.recordar_id("Dandadan", 9)
    cuerpo = {"mediaId": 9, "episode": ep}
    if accion:
        cuerpo["accion"] = accion
    assert c.post("/api/animeav1/evento", headers=H, json=cuerpo).status_code == 200
    assert db.obtener_anime("Dandadan")["episodios_vistos"] == esperado


def test_accion_desconocida_se_rechaza(cliente):
    c, _ = cliente
    r = c.post("/api/animeav1/evento", headers=H, json={"mediaId": 9, "episode": 1, "accion": "borrar"})
    assert r.status_code == 422


def test_desmarcar_lo_que_no_tienes_no_lo_anade(cliente, db, monkeypatch):
    c, main = cliente
    import animeav1_sync
    llamadas = []
    monkeypatch.setattr(animeav1_sync, "resolver_evento",
                        lambda *a: llamadas.append(a) or {"local": None, "nuevo": object(), "media": {}})
    r = c.post("/api/animeav1/evento", headers=H, json={"mediaId": 77, "episode": 0, "accion": "desmarcar"})
    assert r.json()["accion"] == "nada" and db.listar_animes() == []


@pytest.mark.parametrize("estado,vistos,ep,esperado", [
    ("completado", 12, 11, ("viendo", 11)),     # desmarcar el último de uno completado
    ("viendo", 1, 0, ("pendiente", 0)),         # marcaste el 1 sin querer
    ("viendo", 5, 4, ("viendo", 4)),
])
def test_desmarcar_corrige_el_estado(cliente, db, estado, vistos, ep, esperado):
    c, _ = cliente
    db.guardar_anime({"nombre": "Frieren", "capitulos": "12", "episodios_vistos": vistos, "estado_usuario": estado})
    import animeav1_sync
    animeav1_sync.recordar_id("Frieren", 5)
    assert c.post("/api/animeav1/evento", headers=H, json={"mediaId": 5, "episode": ep, "accion": "desmarcar"}).status_code == 200
    a = db.obtener_anime("Frieren")
    assert (a["estado_usuario"], a["episodios_vistos"]) == esperado


def test_animeav1_en_emision_no_completa(cliente, db):
    """El caso de Tokyo Revengers: 7 de 13 emitidos, marcas el 7 → viendo, «al día»."""
    c, _ = cliente
    db.guardar_anime({"nombre": "Santen", "capitulos": "13", "estado_anime": "En emisión", "eps_emitidos": 7,
                      "episodios_vistos": 6, "estado_usuario": "viendo"})
    import animeav1_sync
    animeav1_sync.recordar_id("Santen", 6)
    r = c.post("/api/animeav1/evento", headers=H, json={"mediaId": 6, "episode": 7, "accion": "marcar"}).json()
    assert (r["episodios_vistos"], r["estado"], r["eps_emitidos"]) == (7, "viendo", 7)


# ── v2.17.12: marcar un episodio anterior a lo que Miraru tenía «completado» ──
def test_completado_importado_vuelve_al_episodio_marcado():
    """Gurren Lagann entró como completado 27/27 al importar una lista, pero vas
    por el 15: marcar el 15 lo deja en «viendo», ep 15 (nunca apuntaste del 16 en adelante)."""
    import animeav1_sync as s
    local = {"estado_usuario": "completado", "episodios_vistos": 27, "capitulos": "27"}
    assert s.cambios_por_evento(local, 15, None, "marcar", registrado=0) == \
        {"episodios_vistos": 15, "estado_usuario": "viendo"}
    assert s.cambios_por_evento(local, 15, None, "marcar", registrado=14) == \
        {"episodios_vistos": 15, "estado_usuario": "viendo"}


def test_revisionado_no_baja_el_progreso():
    import animeav1_sync as s
    local = {"estado_usuario": "completado", "episodios_vistos": 27, "capitulos": "27"}
    # Apuntaste del 1 al 27 de uno en uno: lo estás volviendo a ver, no se toca.
    assert s.cambios_por_evento(local, 15, None, "marcar", registrado=27) == {}
    # Sin saber lo apuntado (versiones antiguas), tampoco.
    assert s.cambios_por_evento(local, 15, None, "marcar") == {}
    # Si va «viendo», marcar uno antiguo nunca baja.
    v = {"estado_usuario": "viendo", "episodios_vistos": 10, "capitulos": "27"}
    assert s.cambios_por_evento(v, 5, None, "marcar", registrado=0) == {}


def test_respuesta_dice_que_paso(cliente, db):
    c, _ = cliente
    db.guardar_anime({"nombre": "Gurren Lagann", "tipo": "anime", "capitulos": "27",
                      "estado_usuario": "completado", "episodios_vistos": 27, "fuente": "anilist"})
    import animeav1_sync
    animeav1_sync.recordar_id("Gurren Lagann", 4242)
    r = c.post("/api/animeav1/evento", headers=H, json={"mediaId": 4242, "episode": 15, "accion": "marcar"}).json()
    assert r["accion"] == "corregido" and r["episodios_vistos"] == 15 and r["estado"] == "viendo" and r["marcado"] == 15
