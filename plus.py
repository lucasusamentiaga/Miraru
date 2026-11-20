"""Miraru Plus (v2.18): la suscripción de pago, vendida en la Microsoft Store.

Sin servidor propio ni cuentas: la Store cobra, devuelve el dinero si hace
falta y paga los impuestos. Miraru solo le pregunta «¿este usuario tiene Plus?».

  - Instalado desde la Store (MSIX): se pregunta a la Store (Windows.Services.Store)
    si hay una licencia activa de alguno de los complementos de Plus, que se
    reconocen por su «token de oferta» (lo que se escribe al crearlos en
    Partner Center): OFERTAS.
  - Ejecutando el código fuente (quien desarrolla Miraru): Plus siempre activo,
    para poder usarlo y probarlo.
  - Instalador de GitHub (no es de la Store): no se puede comprar; la ventana
    de Plus lo explica y enlaza a la Store.

El resultado se guarda (config `plus_estado`) para no preguntar a la Store a
cada momento y para que Plus siga funcionando unos días sin internet.
"""
from __future__ import annotations

import ctypes
import json
import logging
import os
import sys
import threading
import time
import webbrowser

import database as db

log = logging.getLogger("miraru.plus")

# Tokens de oferta de los complementos en Partner Center (no cambian nunca).
OFERTAS = {"mensual": "miraru_plus_mensual", "anual": "miraru_plus_anual"}
PRECIOS = {"mensual": "2,49 €/mes", "anual": "19,99 €/año"}
APP_STORE_ID = "9PJZK97ZG03G"

CLAVE = "plus_estado"
CADA = 6 * 3600          # se vuelve a preguntar a la Store cada 6 h
GRACIA = 7 * 86400       # sin poder preguntar (sin internet): 7 días más

# Lo que trae Plus (la ventana de Plus y la ficha lo enseñan así).
VENTAJAS = [
    {"id": "saltar", "icono": "⏭️", "titulo": "Saltar opening y siguiente automático",
     "texto": "En AnimeAV1, la extensión salta el opening y, al empezar el ending, marca el episodio y pasa al siguiente."},
    {"id": "sync", "icono": "🔄", "titulo": "Tu lista sincronizada entre PCs",
     "texto": "Lo que ves en un PC aparece en los demás, usando la misma carpeta de tu nube que la copia de seguridad."},
    {"id": "movil", "icono": "📲", "titulo": "Avisos en el móvil",
     "texto": "Cuando sale un episodio de lo que sigues, te llega un aviso al móvil aunque no estés en casa."},
    {"id": "stats", "icono": "📊", "titulo": "Estadísticas avanzadas",
     "texto": "A qué horas y qué días ves más anime, tu ritmo, cuánto te falta de lo que estás viendo y más."},
    {"id": "wrapped", "icono": "✨", "titulo": "«Mi año en anime» premium",
     "texto": "Más tarjetas en tu resumen del año: tu hora favorita, tu día de la semana y tu mes más fuerte."},
    {"id": "temas", "icono": "🎨", "titulo": "Temas exclusivos",
     "texto": "Colores que solo tiene Plus para darle a Miraru tu estilo."},
]

_lock = threading.Lock()


# ── ¿Dónde se está ejecutando? ───────────────────────────────────────────────
def empaquetado() -> bool:
    """¿Es la versión de la Store (MSIX, con identidad de paquete)?"""
    if os.name != "nt":
        return False
    try:
        n = ctypes.c_uint32(0)
        r = ctypes.windll.kernel32.GetCurrentPackageFullName(ctypes.byref(n), None)
        return r != 15700          # APPMODEL_ERROR_NO_PACKAGE
    except Exception:  # noqa: BLE001
        return False


def desde_codigo() -> bool:
    """Ejecutando el código fuente (no el .exe compilado): quien desarrolla."""
    if os.environ.get("MIRARU_PLUS") == "0":
        return False                # para probar cómo lo ve alguien sin Plus
    return not getattr(sys, "frozen", False)


def _leer() -> dict:
    try:
        d = json.loads(db.get_config(CLAVE) or "{}")
        return d if isinstance(d, dict) else {}
    except ValueError:
        return {}


def _guardar(d: dict) -> None:
    db.set_config(CLAVE, json.dumps(d, ensure_ascii=False))


# ── Estado ───────────────────────────────────────────────────────────────────
def activo() -> bool:
    return estado()["plus"]


def estado(refrescar_si_toca: bool = True) -> dict:
    """{plus, fuente, plan, caduca, se_puede_comprar, precios, ventajas}."""
    base = {"precios": PRECIOS, "ventajas": VENTAJAS, "se_puede_comprar": empaquetado()}
    if os.environ.get("MIRARU_PLUS") == "1" or desde_codigo():
        return {**base, "plus": True, "fuente": "desarrollo", "plan": "", "caduca": 0}
    d = _leer()
    ahora = time.time()
    if refrescar_si_toca and empaquetado() and ahora - float(d.get("comprobado", 0) or 0) > CADA:
        threading.Thread(target=refrescar, daemon=True, name="plus-store").start()
    plus = bool(d.get("plus"))
    if plus:
        caduca = float(d.get("caduca", 0) or 0)
        # Sin noticias de la Store durante más de la gracia: se apaga hasta poder comprobarlo.
        if caduca and ahora > caduca + GRACIA:
            plus = False
        if ahora - float(d.get("comprobado", 0) or 0) > CADA + GRACIA:
            plus = False
    return {**base, "plus": plus, "fuente": d.get("fuente", ""), "plan": d.get("plan", ""),
            "caduca": float(d.get("caduca", 0) or 0)}


def refrescar() -> dict:
    """Pregunta a la Store. Nunca lanza: si falla, se queda lo que había."""
    if not empaquetado():
        return estado(refrescar_si_toca=False)
    with _lock:
        try:
            plus, plan, caduca = _licencia_store()
        except Exception as e:  # noqa: BLE001
            log.warning("Plus: no se pudo preguntar a la Store: %s", e)
            return estado(refrescar_si_toca=False)
        _guardar({"plus": plus, "plan": plan, "caduca": caduca, "fuente": "store",
                  "comprobado": time.time()})
    return estado(refrescar_si_toca=False)


def _contexto():
    from winrt.windows.services.store import StoreContext
    ctx = StoreContext.get_default()
    # Las apps de escritorio tienen que decirle a la Store su ventana (para los diálogos).
    try:
        import ventana_windows
        hwnd = ventana_windows.hwnd_principal()
        if hwnd:
            from winrt._winrt import initialize_with_window  # type: ignore[import-not-found]
            initialize_with_window(ctx, hwnd)
    except Exception:  # noqa: BLE001
        pass
    return ctx


def _esperar(op):
    """Las llamadas de la Store son asíncronas (IAsyncOperation): aquí se espera."""
    import asyncio

    async def _f():
        return await op
    return asyncio.run(_f())


def _licencia_store() -> tuple[bool, str, float]:
    ctx = _contexto()
    lic = _esperar(ctx.get_app_license_async())
    tokens = {v: k for k, v in OFERTAS.items()}
    for _sid, al in (lic.add_on_licenses or {}).items():
        tok = getattr(al, "in_app_offer_token", "") or ""
        if tok in tokens and getattr(al, "is_active", False):
            caduca = 0.0
            try:
                caduca = al.expiration_date.timestamp()
            except Exception:  # noqa: BLE001
                pass
            return True, tokens[tok], caduca
    return False, "", 0.0


def _store_id(plan: str) -> str:
    """El id de la Store (9XXXXXXX) del complemento, buscando por su token."""
    ctx = _contexto()
    r = _esperar(ctx.get_associated_store_products_async(["Durable"]))
    for sid, prod in (r.products or {}).items():
        if getattr(prod, "in_app_offer_token", "") == OFERTAS.get(plan):
            return sid
    return ""


def comprar(plan: str) -> dict:
    """Abre la compra de Plus. Primero con la ventana de compra de la Store
    dentro de Miraru; si no se puede, la página del complemento en la app de la
    Store; y si no es la versión de la Store, la página de Miraru en la Store."""
    if plan not in OFERTAS:
        return {"ok": False, "motivo": "plan desconocido"}
    if not empaquetado():
        webbrowser.open(f"https://apps.microsoft.com/detail/{APP_STORE_ID}")
        return {"ok": True, "modo": "web"}
    sid = ""
    for por_token in (True, False):
        try:
            ctx = _contexto()
            if por_token:
                # Windows recientes: se compra directamente por el token de la oferta.
                if not hasattr(ctx, "request_purchase_by_in_app_offer_token_async"):
                    continue
                op = ctx.request_purchase_by_in_app_offer_token_async(OFERTAS[plan])
            else:
                sid = _store_id(plan)
                if not sid:
                    break
                op = ctx.request_purchase_async(sid)
            res = _esperar(op)
            # 0 = comprado, 1 = ya lo tenías: refrescar
            if int(getattr(res, "status", 9)) in (0, 1):
                return {"ok": True, "modo": "store", "estado": refrescar()}
            return {"ok": False, "modo": "store", "motivo": "cancelado"}
        except Exception as e:  # noqa: BLE001
            log.warning("Plus: compra dentro de la app (%s): %s", "token" if por_token else "id", e)
    try:
        os.startfile(f"ms-windows-store://pdp/?productid={sid or APP_STORE_ID}")  # type: ignore[attr-defined]
        return {"ok": True, "modo": "pdp"}
    except Exception:  # noqa: BLE001
        webbrowser.open(f"https://apps.microsoft.com/detail/{APP_STORE_ID}")
        return {"ok": True, "modo": "web"}
