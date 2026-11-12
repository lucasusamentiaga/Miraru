"""v2.17: Netflix y Crunchyroll → Miraru (streaming.py, /api/streaming/evento y la extensión)."""
import importlib
import json
import shutil
import subprocess
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import streaming


def _m(i, titulo, eps, fmt="TV", secuela=None, sinonimos=(), estado="FINISHED"):
    edges = [{"relationType": "SEQUEL", "node": {"id": secuela, "type": "ANIME", "format": "TV"}}] if secuela else []
    return {"id": i, "isAdult": False, "popularity": 1000 - i, "format": fmt, "status": estado, "episodes": eps,
            "title": {"english": titulo, "romaji": titulo, "native": None}, "synonyms": list(sinonimos),
            "coverImage": {"large": ""}, "genres": ["Action"], "description": "", "nextAiringEpisode": None,
            "relations": {"edges": edges}}


# Attack on Titan como en AniList: S3 partida en dos entradas, Final Season también.
AOT = {1: _m(1, "Attack on Titan", 25, secuela=2, sinonimos=["Ataque a los Titanes"]),
       2: _m(2, "Attack on Titan Season 2", 12, secuela=3),
       3: _m(3, "Attack on Titan Season 3", 12, secuela=4),
       4: _m(4, "Attack on Titan Season 3 Part 2", 10, secuela=5),
       5: _m(5, "Attack on Titan Final Season", 16, secuela=6),
       6: _m(6, "Attack on Titan Final Season Part 2", 12)}


def _post_falso(medias, llamadas=None):
    def post(query, variables, timeout=0):
        if llamadas is not None:
            llamadas.append(variables)
        if "search" in variables:
            q = streaming.norm(variables["search"])
            hits = [m for m in medias.values()
                    if any(q and q in streaming.norm(t) for t in streaming._titulos(m))]
            return {"Page": {"media": hits}}
        return {"Media": medias.get(variables["id"])}
    return post


@pytest.mark.parametrize("t,e,esperado", [
    (1, 5, (1, 5)), (2, 3, (2, 3)), (3, 5, (3, 5)),
    (3, 15, (4, 3)),        # la «Season 3» del servicio sigue en la Part 2 de AniList
    (3, 50, (4, 1)),        # numeración seguida: 25 + 12 + 12 = 49 → el 50 es la Part 2, ep 1
    (4, 20, (6, 4)),        # Final Season (16) + Part 2
    (2, 26, (2, 1)),        # numeración seguida en la temporada 2
    (9, 1, (None, 0)),      # no existe
])
def test_temporadas_como_las_cuentan_los_servicios(db, t, e, esperado):
    r = streaming.resolver("Attack on Titan", t, e, post=_post_falso(AOT))
    assert ((r["media"] or {}).get("id"), r["episodio"]) == esperado


def test_titulo_traducido_por_sinonimo_y_lo_que_no_es_anime(db):
    post = _post_falso({**AOT, 50: _m(50, "Stranger Things no Kyoufu", 12)})
    assert streaming.resolver("Ataque a los titanes", 1, 3, post=post)["media"]["id"] == 1
    # Solo vale el título ENTERO: «Stranger Things» no se convierte en un anime parecido.
    assert streaming.resolver("Stranger Things", 1, 1, post=post) == {"media": None, "episodio": 0, "local": None}


def test_crunchyroll_por_nombre_de_temporada(db):
    r = streaming.resolver("Attack on Titan", 3, 3, temporada_nombre="Attack on Titan Season 3 Part 2",
                           post=_post_falso(AOT))
    assert (r["media"]["id"], r["episodio"]) == (4, 3)


def test_solo_pide_las_temporadas_que_hacen_falta_y_lo_guarda(db):
    llamadas = []
    post = _post_falso(AOT, llamadas)
    streaming.resolver("Attack on Titan", 1, 5, post=post)
    assert [v.get("id") for v in llamadas if "id" in v] == [2]          # T1 + una más
    llamadas.clear()
    streaming.resolver("Attack on Titan", 1, 7, post=post)
    assert llamadas == []                                               # de lo guardado


def test_pelicula_sin_episodio(db):
    pelis = {9: _m(9, "Your Name.", 1, fmt="MOVIE")}
    assert streaming.resolver("Your Name.", None, None, post=_post_falso(pelis))["media"]["id"] == 9


def test_en_tu_lista_con_ese_nombre_aunque_anilist_no_lo_conozca(db):
    db.guardar_anime({"nombre": "Mi Serie Rara Season 2", "capitulos": "12"})
    r = streaming.resolver("Mi Serie Rara", 2, 4, post=_post_falso({}))
    assert r["local"]["nombre"] == "Mi Serie Rara Season 2" and r["episodio"] == 4


def test_evento_anade_actualiza_y_nunca_baja(db, monkeypatch):
    import main
    importlib.reload(main)
    monkeypatch.setattr(streaming, "resolver",
                        lambda serie, t, e, tn="", post=None: {"media": AOT[3], "episodio": e, "local":
                                                               next((a for a in db.listar_animes() if a.get("anilist_id") == 3), None)})
    c = TestClient(main.app, client=("127.0.0.1", 1))
    h = {"X-Miraru-Extension": "1"}
    cuerpo = {"servicio": "netflix", "serie": "Ataque a los titanes", "temporada": 3, "episodio": 5}
    assert c.post("/api/streaming/evento", json=cuerpo).status_code == 403      # sin la cabecera, no
    r = c.post("/api/streaming/evento", json=cuerpo, headers=h).json()
    assert (r["accion"], r["nombre"], r["episodios_vistos"], r["estado"]) == ("añadido", "Attack on Titan Season 3", 5, "viendo")
    r = c.post("/api/streaming/evento", json={**cuerpo, "episodio": 7}, headers=h).json()
    assert (r["accion"], r["episodios_vistos"]) == ("actualizado", 7)
    r = c.post("/api/streaming/evento", json={**cuerpo, "episodio": 2}, headers=h).json()
    assert (r["accion"], r["episodios_vistos"]) == ("sin cambios", 7)            # volver a ver uno viejo no baja
    r = c.post("/api/streaming/evento", json={**cuerpo, "episodio": 12}, headers=h).json()
    assert r["estado"] == "completado"
    monkeypatch.setattr(streaming, "resolver", lambda *a, **k: {"media": None, "episodio": 0, "local": None})
    r = c.post("/api/streaming/evento", json={**cuerpo, "serie": "Stranger Things"}, headers=h)
    assert r.status_code == 404 and "no parece un anime" in r.json()["detail"]


# ── La lectura de las páginas (streaming.js, con node) ───────────────────────
JS = Path(__file__).resolve().parent.parent / "static" / "extension-animeav1" / "streaming.js"


def _js(expr):
    if not shutil.which("node"):
        pytest.skip("sin node")
    code = f"const s=require({json.dumps(str(JS))});console.log(JSON.stringify({expr}))"
    return json.loads(subprocess.run(["node", "-e", code], capture_output=True, text=True, encoding="utf-8",
                                     check=True).stdout)


def test_temporada_y_episodio_en_varios_idiomas():
    r = _js("['T3:E5','S1:E12','St. 2: F. 4','Temp. 2 Ep. 7','E9 - El regreso','Episodio 3','Dolor']"
            ".map(s.leerTemporadaEpisodio)")
    assert r == [{"temporada": 3, "episodio": 5}, {"temporada": 1, "episodio": 12}, {"temporada": 2, "episodio": 4},
                 {"temporada": 2, "episodio": 7}, {"temporada": 1, "episodio": 9}, {"temporada": 1, "episodio": 3}, None]


def test_extension_declara_netflix_y_crunchyroll():
    m = json.loads((JS.parent / "manifest.json").read_text(encoding="utf-8"))
    scripts = [x for c in m["content_scripts"] for x in c["matches"]]
    assert "https://www.netflix.com/*" in scripts and "https://static.crunchyroll.com/*" in scripts
    assert any(c.get("all_frames") for c in m["content_scripts"])      # el reproductor de Crunchyroll va en un marco
    assert m["version"] == "1.5.1"
