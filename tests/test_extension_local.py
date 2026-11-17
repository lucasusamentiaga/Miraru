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


def test_guia_con_direccion_corta_y_hola(db, tmp_path, monkeypatch):
    """v2.17.7: /extension sirve la guía; la extensión dice su id con /api/extension/hola."""
    import importlib

    from fastapi.testclient import TestClient

    import main
    importlib.reload(main)
    c = TestClient(main.app, client=("127.0.0.1", 1))
    r = c.get("/extension")
    assert r.status_code == 200 and '<base href="/static/extension-animeav1/">' in r.text and "bienvenida.js" in r.text
    assert c.post("/api/extension/hola", json={"id": "a" * 32, "version": "1.7.0"}).status_code == 403
    assert c.post("/api/extension/hola", json={"id": "Z" * 32, "version": "1"}, headers={"X-Miraru-Extension": "1"}).status_code == 422
    assert c.post("/api/extension/hola", json={"id": "abcdefghijklmnopabcdefghijklmnop", "version": "1.7.0"},
                  headers={"X-Miraru-Extension": "1"}).json()["ok"]
    v = c.get("/api/extension/version").json()
    assert v["id"] == "abcdefghijklmnopabcdefghijklmnop" and v["instalada"] == "1.7.0"


def test_extension_en_cuatro_idiomas():
    """Todo texto que la extensión traduce con tr('…') tiene sus tres traducciones."""
    import json
    import re
    import shutil
    import subprocess
    from pathlib import Path

    import pytest
    if not shutil.which("node"):
        pytest.skip("sin node")
    ext = Path(__file__).resolve().parent.parent / "static" / "extension-animeav1"
    claves = set(json.loads(subprocess.run(
        ["node", "-e", f"const g={{}};require({json.dumps(str(ext / 'i18n.js'))});"
                       "console.log(JSON.stringify(Object.keys(globalThis.MiraruI18n?globalThis.MiraruI18n.textos:{})))"],
        capture_output=True, text=True, encoding="utf-8").stdout or "[]"))
    if not claves:   # en node, i18n.js se cuelga de `this` del módulo
        out = subprocess.run(["node", "-e", f"const m={{}};(function(){{eval(require('fs').readFileSync({json.dumps(str(ext / 'i18n.js'))},'utf8'))}}).call(m);"
                              "console.log(JSON.stringify(Object.entries(m.MiraruI18n.textos)))"],
                             capture_output=True, text=True, encoding="utf-8", check=True).stdout
        textos = dict(json.loads(out))
        claves = set(textos)
        assert all(len(v) == 3 and all(v) for v in textos.values())
    usados = set()
    for f in ("popup.js", "bienvenida.js", "background.js", "animeflv.js"):
        src = (ext / f).read_text(encoding="utf-8")
        usados |= set(re.findall(r"\btr\('((?:[^'\\]|\\.)+)'", src))
    faltan = {u for u in usados if u not in claves}
    assert not faltan, faltan
