"""Pedir valoración en la Store (valorar.py, v2.18.4)."""
from __future__ import annotations

import datetime
import time

import pytest

import plus
import valorar


@pytest.fixture
def base(db, monkeypatch):
    monkeypatch.setattr(plus, "empaquetado", lambda: True)
    monkeypatch.setattr(valorar, "db", db)
    return db


def _eps(db, n, dias_atras=10):
    f = (datetime.datetime.now() - datetime.timedelta(days=dias_atras)).strftime("%Y-%m-%d %H:%M:%S")
    with db.get_conn() as conn:
        for i in range(n):
            conn.execute("INSERT INTO ep_log (nombre, episodio, fecha) VALUES (?, ?, ?)", ("X", i + 1, f))


class _Res:
    def __init__(self, status):
        self.status = status
        self.was_updated = False


class _Ctx:
    def __init__(self, status=0):
        self.llamadas = 0
        self.status = status

    def request_rate_and_review_app_async(self):
        self.llamadas += 1
        return _Res(self.status)


def test_no_toca_sin_uso(base):
    _eps(base, 5)
    assert not valorar.toca()


def test_no_toca_fuera_de_la_store(base, monkeypatch):
    _eps(base, 30)
    monkeypatch.setattr(plus, "empaquetado", lambda: False)
    assert not valorar.toca()


def test_no_toca_si_es_reciente(base):
    _eps(base, 30, dias_atras=1)
    assert not valorar.toca()


def test_pide_una_vez_y_si_valora_no_vuelve(base, monkeypatch):
    _eps(base, 30)
    ctx = _Ctx(status=0)
    monkeypatch.setattr(plus, "_contexto", lambda: ctx)
    monkeypatch.setattr(plus, "_esperar", lambda op: op)
    assert valorar.toca()
    assert valorar.pedir()["pedida"] is True and ctx.llamadas == 1
    assert not valorar.toca(time.time() + 200 * 86400)


def test_si_cancela_espera_y_como_mucho_dos(base, monkeypatch):
    _eps(base, 30)
    ctx = _Ctx(status=1)
    monkeypatch.setattr(plus, "_contexto", lambda: ctx)
    monkeypatch.setattr(plus, "_esperar", lambda op: op)
    valorar.pedir()
    assert not valorar.toca()                              # recién preguntado
    assert valorar.toca(time.time() + 91 * 86400)          # a los 90 días, otra vez
    d = valorar._leer(); d["ts"] = 0; valorar._guardar(d)
    valorar.pedir()
    assert ctx.llamadas == 2
    d = valorar._leer(); d["ts"] = 0; valorar._guardar(d)
    assert not valorar.toca()                              # máximo dos veces
