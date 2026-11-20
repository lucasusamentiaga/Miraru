"""Miraru Plus (v2.18): estado, bloqueos y sus funciones (móvil, entre PCs, stats)."""
from __future__ import annotations

import importlib
import json
import sqlite3
import zipfile

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def cliente(db):
    import main
    importlib.reload(main)
    with TestClient(main.app, client=("127.0.0.1", 1)) as c:
        yield c, main


def _sin_plus(monkeypatch):
    monkeypatch.setenv("MIRARU_PLUS", "0")


# ── Estado ───────────────────────────────────────────────────────────────────
def test_desde_el_codigo_fuente_hay_plus(cliente):
    c, _ = cliente
    r = c.get("/api/plus").json()
    assert r["plus"] is True and r["fuente"] == "desarrollo"
    assert {v["id"] for v in r["ventajas"]} == {"saltar", "sync", "movil", "stats", "wrapped", "temas"}
    assert r["precios"]["mensual"].startswith("2,49")


def test_sin_plus_y_sin_store_no_se_puede_comprar(cliente, monkeypatch):
    c, _ = cliente
    _sin_plus(monkeypatch)
    r = c.get("/api/plus").json()
    assert r["plus"] is False and r["se_puede_comprar"] is False


def test_la_licencia_guardada_caduca_tras_la_gracia(db, monkeypatch):
    import plus
    _sin_plus(monkeypatch)
    monkeypatch.setattr(plus, "empaquetado", lambda: False)
    import time
    ahora = time.time()
    db.set_config(plus.CLAVE, json.dumps({"plus": True, "comprobado": ahora, "caduca": ahora + 86400}))
    assert plus.estado()["plus"] is True
    db.set_config(plus.CLAVE, json.dumps({"plus": True, "comprobado": ahora,
                                          "caduca": ahora - plus.GRACIA - 10}))
    assert plus.estado()["plus"] is False
    db.set_config(plus.CLAVE, json.dumps({"plus": True, "comprobado": ahora - plus.CADA - plus.GRACIA - 10}))
    assert plus.estado()["plus"] is False


def test_la_extension_pregunta_si_hay_plus(cliente, monkeypatch):
    c, _ = cliente
    assert c.get("/api/extension/plus").status_code == 403
    assert c.get("/api/extension/plus", headers={"X-Miraru-Extension": "1"}).json() == {"plus": True}
    _sin_plus(monkeypatch)
    assert c.get("/api/extension/plus", headers={"X-Miraru-Extension": "1"}).json() == {"plus": False}


def test_sin_plus_las_funciones_de_pago_se_niegan(cliente, monkeypatch):
    c, _ = cliente
    _sin_plus(monkeypatch)
    assert c.get("/api/stats/avanzadas").status_code == 402
    assert c.get("/api/stats/wrapped/extra").status_code == 402
    assert c.post("/api/plus/movil/activar").status_code == 402
    assert c.post("/api/plus/sync", json={"activa": True}).status_code == 402
    # Apagar sí se puede siempre.
    assert c.post("/api/plus/movil/desactivar").status_code == 200
    assert c.post("/api/plus/sync", json={"activa": False}).status_code == 200


def test_comprar_un_plan_desconocido(cliente):
    c, _ = cliente
    assert c.post("/api/plus/comprar", json={"plan": "gratis"}).status_code == 400


# ── Avisos en el móvil ───────────────────────────────────────────────────────
class _Sesion:
    def __init__(self):
        self.enviados = []

    def post(self, url, json=None, timeout=None):
        self.enviados.append((url, json))
        return type("R", (), {"status_code": 200})()


def test_avisos_movil_tema_largo_y_envio(db):
    import avisos_movil
    assert avisos_movil.enviar("x", "y", sesion=_Sesion()) is False   # apagado
    e = avisos_movil.activar()
    assert e["activo"] and e["tema"].startswith("miraru-") and len(e["tema"]) >= 25
    assert e["url_qr"].endswith(e["tema"])
    s = _Sesion()
    assert avisos_movil.enviar("Frieren", "Episodio 5 disponible", sesion=s)
    assert s.enviados[0][1]["topic"] == e["tema"] and s.enviados[0][1]["title"] == "Frieren"
    viejo = e["tema"]
    assert avisos_movil.nuevo_tema()["tema"] != viejo
    assert avisos_movil.desactivar()["activo"] is False


def test_episodio_nuevo_avisa_al_movil_sin_web_push(cliente, monkeypatch):
    _, main = cliente
    import avisos_movil
    import database as db
    db.guardar_anime({"nombre": "Frieren", "episodios_vistos": 3, "estado_usuario": "viendo"})
    with db.get_conn() as conn:
        conn.execute("UPDATE animes SET notif_activa=1 WHERE nombre='Frieren'")
    db._invalidar_cache()
    avisos_movil.activar()
    enviados = []
    monkeypatch.setattr(avisos_movil, "enviar", lambda t, x, **k: enviados.append((t, x)) or True)
    monkeypatch.setattr(main, "_fetch_ultimos_episodios",
                        lambda activos: {"Frieren": {"next_ep": 0, "next_at": 0, "total": 4}})
    assert main._comprobar_nuevos_episodios() == [("Frieren", 4)]
    assert enviados == [("Frieren", "Episodio 4 disponible")]


# ── Entre PCs ────────────────────────────────────────────────────────────────
def test_decidir_tres_bandas():
    import sincro_pcs as s
    lo = {"estado_usuario": "viendo", "episodios_vistos": 5, "puntuacion": None, "favorito": 0}
    # Primera vez: solo sube.
    assert s.decidir(lo, {**lo, "episodios_vistos": 8}, None) == {"episodios_vistos": 8}
    assert s.decidir(lo, {**lo, "episodios_vistos": 2}, None) == {}
    assert s.decidir(lo, {**lo, "estado_usuario": "pendiente"}, None) == {}
    # Ya conocido: lo que cambió allí manda, aunque baje (volver a verlo).
    antes = ["completado", 12, None, 0]
    assert s.decidir({**lo, "estado_usuario": "completado", "episodios_vistos": 12},
                     {**lo, "estado_usuario": "viendo", "episodios_vistos": 1}, antes) == \
        {"estado_usuario": "viendo", "episodios_vistos": 1}
    # No cambió allí: manda lo de aquí.
    assert s.decidir(lo, {**lo, "episodios_vistos": 2}, ["viendo", 2, None, 0]) == {}


def _copia_de_otro_pc(carpeta, filas, equipo="OTRO-PC"):
    carpeta.mkdir(parents=True, exist_ok=True)
    bd = carpeta / "tmp.db"
    c = sqlite3.connect(bd)
    c.execute("CREATE TABLE animes (nombre TEXT, estado_usuario TEXT, episodios_vistos INTEGER, "
              "puntuacion REAL, favorito INTEGER, imagen TEXT)")
    c.execute("CREATE TABLE ep_log (nombre TEXT, episodio INTEGER, fecha TEXT)")
    c.executemany("INSERT INTO animes VALUES (?,?,?,?,?,?)", filas)
    c.execute("INSERT INTO ep_log VALUES ('Frieren', 7, '2026-11-01 22:10:00')")
    c.commit()
    c.close()
    z = carpeta / f"miraru-copia-{equipo}.zip"
    with zipfile.ZipFile(z, "w") as zf:
        zf.write(bd, "anime_tracker.db")
        zf.writestr("miraru.json", json.dumps({"app": "Miraru", "equipo": equipo, "animes": len(filas)}))
    bd.unlink()
    return z


def test_sincronizar_trae_lo_del_otro_pc_sin_borrar(db, tmp_path, monkeypatch):
    import sincro_pcs
    carpeta = tmp_path / "nube" / "Miraru"
    db.set_config("copia_nube_carpeta", str(carpeta))
    db.guardar_anime({"nombre": "Frieren", "episodios_vistos": 3, "estado_usuario": "viendo"})
    db.guardar_anime({"nombre": "Solo aquí", "episodios_vistos": 1, "estado_usuario": "viendo"})
    _copia_de_otro_pc(carpeta, [("Frieren", "viendo", 7, 9.0, 1, ""),
                                ("Nuevo", "pendiente", 0, None, 0, "x.jpg")])
    r = sincro_pcs.sincronizar(forzar=True)
    assert r["ok"] and r["anadidos"] == 1 and r["actualizados"] == 1
    f = db.obtener_anime("Frieren")
    assert f["episodios_vistos"] == 7 and f["puntuacion"] == 9.0 and f["favorito"] == 1
    assert db.obtener_anime("Nuevo") is not None
    assert db.obtener_anime("Solo aquí") is not None
    assert db.max_episodio_registrado("Frieren") == 7
    # Otra pasada sin cambios allí: no toca nada.
    assert sincro_pcs.sincronizar(forzar=True)["actualizados"] == 0


# ── Estadísticas ─────────────────────────────────────────────────────────────
def test_stats_avanzadas_ignoran_marcas_masivas(cliente):
    c, _ = cliente
    import database as db
    db.guardar_anime({"nombre": "A", "episodios_vistos": 2, "estado_usuario": "viendo", "capitulos": "12"})
    with db.get_conn() as conn:
        conn.execute("INSERT INTO ep_log (nombre, episodio, fecha) VALUES ('A', 1, '2026-11-02 23:10:00')")
        conn.execute("INSERT INTO ep_log (nombre, episodio, fecha) VALUES ('A', 2, '2026-11-02 23:40:00')")
        for i in range(3, 13):   # importación: 10 en el mismo minuto
            conn.execute("INSERT INTO ep_log (nombre, episodio, fecha) VALUES ('A', ?, '2026-11-03 10:00:00')", (i,))
    r = c.get("/api/stats/avanzadas").json()
    assert r["marcas"] == 2 and r["hora_top"] == 23 and r["dia_top_txt"] == "lunes"
    assert r["maraton_max"] == 2 and r["franja_top"] == "noche"
    assert r["faltan_episodios"] == 10
    w = c.get("/api/stats/wrapped/extra?year=2026").json()
    assert w["hora_top"] == 23
