"""v2.18.6: un título largo no puede acabar añadiendo un anime cuyo nombre es
solo un trozo suyo («Tenkou-saki no Seiso…» → «Saki»)."""
from __future__ import annotations

from types import SimpleNamespace as NS

import main

LARGO = "Tenkou-saki no Seiso Karen na Bishoujo ga, Mukashi Danshi to Omotte Issho ni Asonda Osananajimi Datta Ken"


def test_es_trozo():
    assert main._es_trozo(LARGO, NS(nombre="Saki"))
    assert not main._es_trozo(LARGO, NS(nombre="Tenkousaki no Seiso Karen na Bishoujo ga, Mukashi Danshi to "
                                               "Omotte Issho ni Asonda Osananajimi datta Ken"))
    assert not main._es_trozo("Shingeki no Kyojin", NS(nombre="Attack on Titan"))
    assert not main._es_trozo("saki", NS(nombre="Saki"))


def test_saga_no_casa_por_una_palabra_suelta():
    saki = [{"nombre": "Saki", "titulos": ["咲 -Saki-"]}, {"nombre": "Saki Achiga-hen", "titulos": []}]
    assert not main.saga_casa_con(LARGO, saki)
    buena = [{"nombre": "Tenkousaki no Seiso Karen na Bishoujo ga, Mukashi Danshi to Omotte Issho ni "
                        "Asonda Osananajimi datta Ken", "titulos": ["Oh Boy, Was I Wrong About Her"]}]
    assert main.saga_casa_con(LARGO, buena)
    assert main.saga_casa_con("atack on titans", [{"nombre": "Attack on Titan", "titulos": []}])
