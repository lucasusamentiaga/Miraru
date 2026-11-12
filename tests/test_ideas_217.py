"""v2.17: revisionados, temporadas nuevas de lo completado y fechas de episodios."""
import importlib

from fastapi.testclient import TestClient

from scrapers import AnimeData


def _cliente():
    import main
    importlib.reload(main)
    return main, TestClient(main.app, client=("127.0.0.1", 1))


def test_revisionados_se_guardan_con_limites(db):
    main, c = _cliente()
    db.guardar_anime({"nombre": "Frieren", "capitulos": "28", "estado_usuario": "completado"})
    assert c.patch("/api/animes/Frieren", json={"revisionados": 2}).status_code == 200
    assert db.obtener_anime("Frieren")["revisionados"] == 2
    assert c.patch("/api/animes/Frieren", json={"revisionados": -1}).status_code == 422
    assert c.patch("/api/animes/Frieren", json={"revisionados": 500}).status_code == 422
    slim = c.get("/api/animes/slim").json()["animes"]
    assert slim[0]["revisionados"] == 2


def test_secuelas_de_lo_completado(db, monkeypatch):
    main, c = _cliente()
    db.guardar_anime({"nombre": "AoT", "anilist_id": 1, "estado_usuario": "completado"})
    db.guardar_anime({"nombre": "Frieren", "anilist_id": 5, "estado_usuario": "viendo"})
    db.guardar_anime({"nombre": "AoT S2", "anilist_id": 2, "estado_usuario": "pendiente"})
    # Relaciones guardadas: AoT → 2 (ya en tu lista), 3 (en emisión), 4 (vieja);
    # Frieren (no completado) → 6: no cuenta.
    main._guardar_relaciones({1: [2, 3, 4], 5: [6]})
    pedidos = []

    class Falso:
        def buscar_por_ids(self, ids, media_type="ANIME"):
            pedidos.append(sorted(ids))
            return {3: AnimeData(nombre="AoT Final", capitulos="?", imagen="", genero=[], sinopsis="",
                                 fuente="anilist", estado_anime="En emisión", anilist_id=3),
                    4: AnimeData(nombre="AoT OVA", capitulos=3, imagen="", genero=[], sinopsis="",
                                 fuente="anilist", estado_anime="Finalizado", anilist_id=4)}
    monkeypatch.setitem(main.SCRAPERS, "anilist", Falso())
    d = c.get("/api/secuelas?refrescar=1").json()
    assert pedidos == [[3, 4]]
    assert [(x["nombre"], x["de"]) for x in d["items"]] == [("AoT Final", "AoT")]
    # De la caché, sin volver a preguntar; y «No me interesa» lo quita.
    assert c.get("/api/secuelas").json()["items"][0]["anilist_id"] == 3 and len(pedidos) == 1
    assert c.post("/api/secuelas/ignorar", json={"anilist_id": 3}).json()["ok"]
    assert c.get("/api/secuelas").json()["items"] == []
    assert c.get("/api/secuelas?refrescar=1").json()["items"] == []


def test_corregir_la_fecha_de_un_episodio(db):
    main, c = _cliente()
    db.guardar_anime({"nombre": "Dandadan", "capitulos": "12"})
    c.post("/api/animes/Dandadan/plus1")
    c.post("/api/animes/Dandadan/plus1")
    eps = c.get("/api/animes/Dandadan/episodios-vistos").json()["episodios"]
    assert [e["episodio"] for e in eps] == [2, 1]
    assert c.post("/api/animes/Dandadan/episodios-vistos", json={"episodio": 1, "fecha": "2024-03-09"}).json()["ok"]
    eps = {e["episodio"]: e["fecha"] for e in c.get("/api/animes/Dandadan/episodios-vistos").json()["episodios"]}
    assert eps[1].startswith("2024-03-09 ") and len(eps[1]) == 19
    # Uno que no estaba apuntado, se apunta con esa fecha.
    c.post("/api/animes/Dandadan/episodios-vistos", json={"episodio": 7, "fecha": "2024-03-10"})
    assert db.episodios_vistos_log("Dandadan")[0] == {"episodio": 7, "fecha": "2024-03-10 12:00:00"}
    assert c.post("/api/animes/Dandadan/episodios-vistos", json={"episodio": 1, "fecha": "2999-01-01"}).status_code == 400
    assert c.post("/api/animes/Nadie/episodios-vistos", json={"episodio": 1, "fecha": "2024-01-01"}).status_code == 404


def test_cabecera_con_menu_mas_y_series_y_pelis(db):
    main, c = _cliente()
    html = c.get("/app").text
    for falta in ('id="btn-menu-movil"', 'class="header-utils"', 'class="header-settings"', 'id="export-menu"', ">No Anime<"):
        assert falta not in html, falta
    menu = html.split('id="menu-mas"')[1].split("</header>")[0]
    for id_ in ("btn-sync", "btn-anilist", "btn-copia", "btn-extension", "btn-watchfolder", "lang-sel", "btn-theme", "btn-random"):
        assert f'id="{id_}"' in menu, id_
    assert "Series y pelis" in html and "¿Ya llevas tu lista en AniList o MyAnimeList?" in html
