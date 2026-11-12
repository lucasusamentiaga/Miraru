"""Instalar la extensión en dos clics (v2.17)."""
from __future__ import annotations

import json

import extension_local as ext


def _origen(tmp_path, version):
    o = tmp_path / "origen"
    (o / "iconos").mkdir(parents=True, exist_ok=True)
    (o / "manifest.json").write_text(json.dumps({"version": version}), encoding="utf-8")
    (o / "iconos" / "48.png").write_bytes(b"png")
    return o


def test_copiar_y_actualizar_solo_si_ya_existe(tmp_path, monkeypatch):
    dest = tmp_path / "Miraru" / "extension-navegador"
    monkeypatch.setenv("MIRARU_EXT_DIR", str(dest))
    o = _origen(tmp_path, "1.0")
    assert not ext.actualizar_si_existe(o)          # no instalada: no se crea nada
    assert not dest.exists()
    ext.copiar(o)
    assert (dest / "iconos" / "48.png").read_bytes() == b"png"
    assert not ext.actualizar_si_existe(o)          # misma versión
    _origen(tmp_path, "1.1")
    assert ext.actualizar_si_existe(o)
    assert json.loads((dest / "manifest.json").read_text())["version"] == "1.1"


def test_endpoint_solo_local(db, tmp_path, monkeypatch):
    from fastapi.testclient import TestClient

    import main
    monkeypatch.setenv("MIRARU_EXT_DIR", str(tmp_path / "ext"))
    monkeypatch.setattr(ext, "abrir_extensiones", lambda: "Chrome")
    monkeypatch.setattr(ext, "al_portapapeles", lambda t: True)
    r = TestClient(main.app, client=("127.0.0.1", 1)).post("/api/extension/preparar")
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["navegador"] == "Chrome" and d["portapapeles"]
    assert (tmp_path / "ext" / "manifest.json").is_file()
    r = TestClient(main.app, client=("192.168.1.20", 1)).post("/api/extension/preparar")
    assert r.status_code == 403
