"""v2.17: traer la lista de AniList (por usuario) o de MyAnimeList (.xml) de golpe."""
import importar_listas as il


def _media(i, mal=None, titulo=None, fmt="TV", eps=12, adulto=False):
    return {"id": i, "idMal": mal or i, "isAdult": adulto,
            "title": {"romaji": titulo or f"Anime {i}", "english": None, "native": None},
            "episodes": eps, "chapters": 100, "volumes": 10, "format": fmt,
            "coverImage": {"large": ""}, "genres": ["Action"], "description": "", "status": "FINISHED",
            "nextAiringEpisode": None}


def test_anilist_trae_anime_y_manga_con_estado_nota_y_progreso(db, monkeypatch):
    monkeypatch.setattr(il, "db", db)

    def post(query, variables, timeout=0):
        if variables["type"] == "ANIME":
            entradas = [{"status": "CURRENT", "progress": 5, "score": 8.5, "media": _media(1, titulo="Frieren")},
                        {"status": "COMPLETED", "progress": 12, "score": 0, "media": _media(2)},
                        {"status": "PLANNING", "progress": 0, "score": 0, "media": _media(3, adulto=True)}]
            return {"MediaListCollection": {"lists": [
                {"isCustomList": False, "entries": entradas},
                {"isCustomList": True, "entries": entradas[:1]}]}}      # repetido en una lista propia
        return {"MediaListCollection": {"lists": [{"isCustomList": False, "entries": [
            {"status": "CURRENT", "progress": 120, "progressVolumes": 14, "score": 10,
             "media": _media(9, titulo="Frieren")}]}]}}

    r = il.desde_anilist(" @lucas ", post=post)
    assert r["ok"] and r["añadidos"] == 3 and r["mangas"] == 1 and r["omitidos"] == 1
    a = db.obtener_anime("Frieren")
    assert (a["estado_usuario"], a["episodios_vistos"], a["puntuacion"], a["anilist_id"]) == ("viendo", 5, 8.5, 1)
    m = next(x for x in db.listar_animes() if x.get("tipo") == "manga")
    assert (m["episodios_vistos"], m["volumenes_leidos"], m["puntuacion"]) == (120, 14, 10)
    # Otra vez: nada nuevo, todo repetido.
    r2 = il.desde_anilist("lucas", post=post)
    assert r2["añadidos"] == 0 and r2["duplicados"] == 3


def test_anilist_usuario_que_no_existe_o_lista_privada(db, monkeypatch):
    monkeypatch.setattr(il, "db", db)

    def no_existe(*a, **k):
        raise RuntimeError("404 Client Error: Not Found")
    assert "ningún usuario" in il.desde_anilist("nadie", post=no_existe)["error"]
    vacia = il.desde_anilist("x", post=lambda *a, **k: {"MediaListCollection": {"lists": []}})
    assert not vacia["ok"] and "privada" in vacia["error"]
    assert not il.desde_anilist("  ")["ok"]


XML = b"""<?xml version="1.0"?><myanimelist>
<anime><series_animedb_id>10</series_animedb_id><series_title>A</series_title>
  <my_watched_episodes>7</my_watched_episodes><my_score>9</my_score><my_status>Watching</my_status></anime>
<anime><series_animedb_id>11</series_animedb_id><my_status>Plan to Watch</my_status></anime>
<anime><series_animedb_id>12</series_animedb_id><my_status>On-Hold</my_status></anime>
<manga><manga_mangadb_id>20</manga_mangadb_id><my_read_chapters>30</my_read_chapters>
  <my_read_volumes>3</my_read_volumes><my_status>Reading</my_status></manga>
</myanimelist>"""


def test_mal_xml_en_lotes_por_id(db, monkeypatch):
    monkeypatch.setattr(il, "db", db)
    pedidos = []

    def post(query, variables, timeout=0):
        pedidos.append((variables["type"], sorted(variables["ids"])))
        if variables["type"] == "ANIME":      # el 12 no está en AniList
            return {"Page": {"media": [_media(100, mal=10, titulo="Uno"), _media(101, mal=11, titulo="Dos")]}}
        return {"Page": {"media": [_media(200, mal=20, titulo="Manga")]}}

    r = il.desde_mal_xml(XML, post=post)
    assert pedidos == [("ANIME", [10, 11, 12]), ("MANGA", [20])]
    assert (r["añadidos"], r["mangas"], r["no_encontrados"], r["total"]) == (3, 1, 1, 4)
    uno = db.obtener_anime("Uno")
    assert (uno["estado_usuario"], uno["episodios_vistos"], uno["puntuacion"]) == ("viendo", 7, 9)
    assert db.obtener_anime("Dos")["estado_usuario"] == "pendiente"
    m = db.obtener_anime("Manga")
    assert (m["tipo"], m["episodios_vistos"], m["volumenes_leidos"]) == ("manga", 30, 3)


def test_mal_xml_que_no_lo_es(db):
    assert "MyAnimeList" in il.desde_mal_xml(b"hola")["error"]
    assert not il.desde_mal_xml(b"<myanimelist></myanimelist>")["ok"]


def test_endpoints_de_importar(db, monkeypatch):
    import importlib

    from fastapi.testclient import TestClient

    import main
    importlib.reload(main)
    monkeypatch.setattr(il, "desde_anilist", lambda u: {"ok": True, "añadidos": 2} if u == "bien"
                        else {"ok": False, "error": "mal"})
    c = TestClient(main.app, client=("127.0.0.1", 1))
    assert c.post("/api/import/anilist", json={"username": "bien"}).json()["añadidos"] == 2
    assert c.post("/api/import/anilist", json={"username": "otro"}).status_code == 400
    r = c.post("/api/import/mal-xml", files={"file": ("lista.xml", b"no es xml", "text/xml")})
    assert r.status_code == 400 and "MyAnimeList" in r.json()["detail"]
