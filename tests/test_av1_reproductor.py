"""AnimeAV1: saltar opening y siguiente episodio automático (extensión 1.8)."""
from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

import pytest

EXT = Path(__file__).resolve().parent.parent / "static" / "extension-animeav1"


def _js(archivo, expr):
    if not shutil.which("node"):
        pytest.skip("sin node")
    code = f"const s=require({json.dumps(str(EXT / archivo))});console.log(JSON.stringify({expr}))"
    return json.loads(subprocess.run(["node", "-e", code], capture_output=True, text=True,
                                     encoding="utf-8", check=True).stdout)


C = {"op": [90, 180], "ed": [1300, 1390], "saltar": False, "auto": True, "haySiguiente": True}


def _d(c, t, dur=1440, mem=None):
    return _js("reproductor.js", f"s.decidir({json.dumps(c)}, {t}, {dur}, {json.dumps(mem or {})})")


def test_opening():
    assert _d(C, 100)["botonSaltar"] is True                          # durante el opening: botón
    assert _d({**C, "saltar": True}, 100)["saltarA"] == 180             # con «saltar solo»: salta
    assert _d({**C, "saltar": True}, 100, mem={"saltadoOp": True})["saltarA"] is None   # una vez
    assert _d(C, 200)["botonSaltar"] is False
    sin = {**C, "op": None}
    assert _d(sin, 60)["botonSaltar"] is True and _d(sin, 400)["botonSaltar"] is False  # «+85 s» al principio


def test_siguiente_a_los_2_segundos_del_ending():
    assert _d(C, 1299)["cuenta"] is None
    assert _d(C, 1300)["cuenta"] == 2 and _d(C, 1301.2)["cuenta"] == 1
    assert _d(C, 1302)["siguiente"] is True
    assert _d(C, 1302, mem={"cancelado": True})["siguiente"] is False   # «Cancelar»
    assert _d({**C, "auto": False}, 1302)["siguiente"] is False
    assert _d({**C, "haySiguiente": False}, 1302)["siguiente"] is False  # último episodio
    sin = {**C, "ed": None}                                             # sin tiempos: 90 s antes del final
    assert _d(sin, 1440 - 88)["siguiente"] is True and _d(sin, 1440 - 91)["cuenta"] is None


def test_aniskip_y_datos_de_la_pagina():
    r = _js("animeav1-player.js", "s.leerAniSkip({results:[{interval:{startTime:3.2,endTime:93.2},skipType:'op'},"
                                  "{interval:{startTime:1417,endTime:1507},skipType:'ed'}]})")
    assert r == {"op": [3.2, 93.2], "ed": [1417, 1507]}
    assert _js("animeav1-player.js", "s.leerAniSkip({found:false,results:[]})") == {"op": None, "ed": None}
    datos = {"nodes": [None, {"type": "data", "data": [{"user": 1}, None]},
                       {"type": "data", "data": [{"media": 1, "episode": 4}, {"id": 2, "malId": 3, "episodesCount": 4},
                                                 4459, 52991, 28]}]}
    assert _js("animeav1-player.js", f"s.leerMedia({json.dumps(datos)})") == {"mediaId": 4459, "malId": 52991, "episodios": 28}


def test_manifest():
    m = json.loads((EXT / "manifest.json").read_text(encoding="utf-8"))
    cs = {tuple(c["js"]): c for c in m["content_scripts"]}
    assert cs[("i18n.js", "animeav1-player.js")]["matches"] == ["https://animeav1.com/*"]
    rep = cs[("reproductor.js",)]
    assert rep["all_frames"]
    assert "https://*.zilla-networks.com/*" in rep["matches"]
    assert len(m["description"]) <= 132


def test_servidores_de_animeav1_iguales_en_manifest_y_script():
    """v1.9: «Saltar opening» en más servidores (Byse, VidHide, MP4Upload…). La lista
    de animeav1-player.js (a quién habla) y la del manifest (dónde entra) van a la par."""
    import re
    m = json.loads((EXT / "manifest.json").read_text(encoding="utf-8"))
    rep = next(c for c in m["content_scripts"] if c["js"] == ["reproductor.js"])
    en_manifest = {re.sub(r"^https://(\*\.)?|/\*$", "", x) for x in rep["matches"]}
    js = (EXT / "animeav1-player.js").read_text(encoding="utf-8")
    en_js = set(re.findall(r"'([a-z0-9.-]+\.[a-z]+)'", js[js.index("HOSTS_REPRODUCTOR"):js.index("];", js.index("HOSTS_REPRODUCTOR"))]))
    assert en_js and en_js == en_manifest
    assert {"zilla-networks.com", "n1mwq.org", "mp4upload.com"} <= en_js
