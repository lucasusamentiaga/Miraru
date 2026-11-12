"""Subir todo a AniList: solo lo distinto y en lotes (v2.17)."""
from __future__ import annotations

import anilist_sync as s


def _anime(db, nombre, aid, estado="viendo", eps=3, nota=8):
    import database
    ok, msg = database.guardar_anime({"nombre": nombre, "estado_usuario": estado, "anilist_id": aid,
                                      "episodios_vistos": eps, "puntuacion": nota})
    assert ok, msg


def test_solo_sube_lo_distinto_y_en_lotes(db, monkeypatch):
    import database
    for i in range(1, 26):
        _anime(db, f"Anime {i}", 100 + i)
    database.set_config("anilist_token", "TOK")
    database.set_config("anilist_userid", "7")
    llamadas = []

    def post(query, variables, token):
        llamadas.append(query)
        if "MediaListCollection" in query:
            if variables["type"] == "MANGA":
                return {"data": {"MediaListCollection": {"lists": []}}}
            # 5 ya iguales, 1 con otro progreso
            ents = [{"mediaId": 100 + i, "status": "CURRENT", "progress": 3, "score": 80} for i in range(1, 6)]
            ents.append({"mediaId": 106, "status": "CURRENT", "progress": 1, "score": 80})
            return {"data": {"MediaListCollection": {"lists": [{"entries": ents}]}}}
        ids = [int(x.split("mediaId: ")[1].split(",")[0]) for x in query.split("SaveMediaListEntry")[1:]]
        return {"data": {f"m{j}": {"mediaId": m} for j, m in enumerate(ids)}}

    monkeypatch.setattr(s, "push_anime", lambda a: (_ for _ in ()).throw(AssertionError("no debería")))
    r = s.push_all(post=post, sleep=lambda *_: None)
    assert r == {"pushed": 20, "errors": 0, "sin_cambios": 5}
    muts = [q for q in llamadas if q.startswith("mutation")]
    assert len(muts) == 2                       # 20 en lotes de 10
    assert "status: CURRENT, scoreRaw: 80, progress: 3" in muts[0]


def test_lote_que_falla_sube_de_uno_en_uno(db, monkeypatch):
    import database
    _anime(db, "A", 1)
    _anime(db, "B", 2)
    database.set_config("anilist_token", "TOK")

    def post(query, variables, token):
        raise RuntimeError("400")

    subidos = []
    monkeypatch.setattr(s, "push_anime", lambda a: subidos.append(a["nombre"]) or {"ok": 1})
    r = s.push_all(post=post, sleep=lambda *_: None)
    assert r["pushed"] == 2 and sorted(subidos) == ["A", "B"]


def test_sin_conectar(db):
    assert s.push_all()["error"] == "no conectado"
