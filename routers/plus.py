"""
routers/plus.py — Miraru Plus (v2.18): estado, compra y las funciones de pago
(avisos en el móvil, sincronización entre PCs, estadísticas avanzadas).
"""
from __future__ import annotations

import asyncio
import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

import avisos_movil
import plus
import sincro_pcs
import stats_plus
from core import executor

router = APIRouter(tags=["plus"])


async def _hilo(f, *a):
    return await asyncio.get_running_loop().run_in_executor(executor, f, *a)


def _exigir_plus():
    if not plus.activo():
        raise HTTPException(402, "Esto es de Miraru Plus")


class _Plan(BaseModel):
    plan: str = "anual"


class _Activa(BaseModel):
    activa: bool


@router.get("/api/plus")
async def plus_estado():
    return plus.estado()


@router.post("/api/plus/refrescar")
async def plus_refrescar():
    return await _hilo(plus.refrescar)


@router.post("/api/plus/comprar")
async def plus_comprar(req: _Plan):
    if req.plan not in plus.OFERTAS:
        raise HTTPException(400, "Plan no válido")
    return await _hilo(plus.comprar, req.plan)


@router.get("/api/extension/plus")
async def plus_extension(request: Request):
    """La extensión pregunta si puede usar «Saltar opening» y «Siguiente automático»."""
    if request.headers.get("X-Miraru-Extension") != "1":
        raise HTTPException(403, "Solo la extensión de Miraru puede usar esta ruta")
    return {"plus": plus.activo()}


# ── Avisos en el móvil ──────────────────────────────────────────────────────
@router.get("/api/plus/movil")
async def movil_estado():
    return {**avisos_movil.estado(), "plus": plus.activo()}


@router.post("/api/plus/movil/activar")
async def movil_activar():
    _exigir_plus()
    return avisos_movil.activar()


@router.post("/api/plus/movil/desactivar")
async def movil_desactivar():
    return avisos_movil.desactivar()


@router.post("/api/plus/movil/nuevo")
async def movil_nuevo():
    _exigir_plus()
    return avisos_movil.nuevo_tema()


@router.post("/api/plus/movil/probar")
async def movil_probar():
    _exigir_plus()
    ok = await _hilo(avisos_movil.enviar, "📺 Miraru", "¡Listo! Así te llegarán los episodios nuevos.")
    if not ok:
        raise HTTPException(502, "No se pudo enviar el aviso. ¿Hay internet?")
    return {"ok": True}


# ── Sincronización entre PCs ────────────────────────────────────────────────
@router.get("/api/plus/sync")
async def sync_estado():
    return {**(await _hilo(sincro_pcs.estado)), "plus": plus.activo()}


@router.post("/api/plus/sync")
async def sync_poner(req: _Activa):
    if req.activa:
        _exigir_plus()
    est = sincro_pcs.poner(req.activa)
    if req.activa:
        est["resultado"] = await _hilo(sincro_pcs.sincronizar, True)
    return est


@router.post("/api/plus/sync/ahora")
async def sync_ahora():
    _exigir_plus()
    return await _hilo(sincro_pcs.sincronizar, True)


# ── Estadísticas ────────────────────────────────────────────────────────────
@router.get("/api/stats/avanzadas")
async def stats_avanzadas():
    _exigir_plus()
    return await _hilo(stats_plus.avanzadas)


@router.get("/api/stats/wrapped/extra")
async def wrapped_extra(year: Optional[int] = None):
    _exigir_plus()
    return await _hilo(stats_plus.wrapped_extra, year or datetime.datetime.now().year)
