"""Estadísticas avanzadas y «Mi año» premium (Miraru Plus, v2.18).

Todo sale de `ep_log` (cuándo marcaste cada episodio, en hora local). Se
descartan las marcas que no dicen nada de tus hábitos:
  - las de fecha corregida a mano (se guardan a las 12:00:00 en punto);
  - las masivas (más de 5 en el mismo minuto: importaciones, sincronizaciones,
    «marcar hasta aquí»).
"""
from __future__ import annotations

import datetime
from collections import Counter

import animeav1_sync
import database as db

MIN_POR_EP = 24
DIAS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]


def _marcas(year: int | None = None) -> list[datetime.datetime]:
    sql = ("SELECT fecha FROM ep_log WHERE fecha IS NOT NULL AND substr(fecha, 12) != '12:00:00' "
           "AND substr(fecha, 1, 16) IN (SELECT substr(fecha, 1, 16) FROM ep_log "
           "GROUP BY substr(fecha, 1, 16) HAVING COUNT(*) <= 5) AND " + db._SIN_MANGA)
    args: tuple = ()
    if year:
        sql += " AND strftime('%Y', fecha) = ?"
        args = (str(year),)
    out = []
    with db.get_conn() as conn:
        for r in conn.execute(sql, args):
            try:
                out.append(datetime.datetime.fromisoformat(str(r["fecha"])[:19]))
            except ValueError:
                pass
    return out


def _franja(h: int) -> str:
    if 6 <= h < 12:
        return "mañana"
    if 12 <= h < 20:
        return "tarde"
    if 20 <= h < 24:
        return "noche"
    return "madrugada"


def habitos(year: int | None = None) -> dict:
    """Hora del día y día de la semana en que ves anime."""
    m = _marcas(year)
    por_hora = [0] * 24
    por_dia = [0] * 7
    for f in m:
        por_hora[f.hour] += 1
        por_dia[f.weekday()] += 1
    franjas = Counter(_franja(f.hour) for f in m)
    hora_top = max(range(24), key=lambda i: por_hora[i]) if m else None
    dia_top = max(range(7), key=lambda i: por_dia[i]) if m else None
    # Sesiones: episodios seguidos con menos de 1 h entre uno y otro.
    sesiones, actual = [], 1
    orden = sorted(m)
    for a, b in zip(orden, orden[1:], strict=False):
        if (b - a).total_seconds() <= 3600:
            actual += 1
        else:
            sesiones.append(actual)
            actual = 1
    if m:
        sesiones.append(actual)
    return {"marcas": len(m), "por_hora": por_hora, "por_dia": por_dia,
            "hora_top": hora_top, "dia_top": dia_top,
            "dia_top_txt": DIAS[dia_top] if dia_top is not None else "",
            "franja_top": franjas.most_common(1)[0][0] if franjas else "",
            "maraton_max": max(sesiones) if sesiones else 0,
            "media_sesion": round(sum(sesiones) / len(sesiones), 1) if sesiones else 0}


def avanzadas() -> dict:
    animes = [a for a in db.listar_animes() if (a.get("tipo") or "anime") != "manga"]
    h = habitos()
    hoy = datetime.date.today()
    # Ritmo: episodios por semana en las últimas 8 semanas (con todas las marcas).
    with db.get_conn() as conn:
        rec = conn.execute(
            "SELECT COUNT(*) AS c FROM ep_log WHERE date(fecha) >= date('now','localtime','-56 days') AND "
            + db._SIN_MANGA).fetchone()["c"] or 0
        por_semana = [0] * 8
        for r in conn.execute(
                "SELECT date(fecha) AS d FROM ep_log WHERE date(fecha) >= date('now','localtime','-56 days') AND "
                + db._SIN_MANGA):
            try:
                dias = (hoy - datetime.date.fromisoformat(r["d"])).days
            except (TypeError, ValueError):
                continue
            if 0 <= dias < 56:
                por_semana[7 - dias // 7] += 1
    ritmo = round(rec / 8, 1)
    # Lo que te falta de lo que estás viendo.
    viendo, faltan = [], 0
    for a in animes:
        if a.get("estado_usuario") != "viendo":
            continue
        total = animeav1_sync._total_eps(a.get("capitulos"), a.get("estado_anime") or "")
        vistos = int(a.get("episodios_vistos") or 0)
        if total > vistos:
            faltan += total - vistos
            viendo.append({"nombre": a["nombre"], "faltan": total - vistos, "imagen": a.get("imagen") or "",
                           "semanas": round((total - vistos) / ritmo, 1) if ritmo else None})
    viendo.sort(key=lambda x: x["faltan"])
    est = Counter(a.get("estado_usuario") or "pendiente" for a in animes)
    empezados = est["completado"] + est["abandonado"]
    notas = [float(a["puntuacion"]) for a in animes if a.get("puntuacion")]
    # v2.18.1: este mes frente al anterior, y el género de lo que ves últimamente.
    with db.get_conn() as conn:
        mes = conn.execute("SELECT COUNT(*) AS c FROM ep_log WHERE strftime('%Y-%m', fecha) = "
                           "strftime('%Y-%m', 'now', 'localtime') AND " + db._SIN_MANGA).fetchone()["c"] or 0
        mes_ant = conn.execute("SELECT COUNT(*) AS c FROM ep_log WHERE strftime('%Y-%m', fecha) = "
                               "strftime('%Y-%m', 'now', 'localtime', 'start of month', '-1 month') AND "
                               + db._SIN_MANGA).fetchone()["c"] or 0
        recientes = [r["nombre"] for r in conn.execute(
            "SELECT nombre, COUNT(*) AS c FROM ep_log WHERE date(fecha) >= date('now','localtime','-30 days') AND "
            + db._SIN_MANGA + " GROUP BY nombre")]
    por_nombre = {a["nombre"]: a for a in animes}
    gen = Counter()
    for n in recientes:
        for g in (por_nombre.get(n, {}).get("genero") or "").split(","):
            if g.strip():
                gen[g.strip()] += 1
    return {**h,
            "mes_actual": mes, "mes_anterior": mes_ant,
            "genero_reciente": gen.most_common(1)[0][0] if gen else "",
            "ritmo_semanal": ritmo,
            "por_semana": por_semana,
            "faltan_episodios": faltan,
            "faltan_horas": round(faltan * MIN_POR_EP / 60, 1),
            "faltan_semanas": round(faltan / ritmo, 1) if ritmo else None,
            "casi_terminados": viendo[:5],
            "tasa_completado": round(100 * est["completado"] / empezados) if empezados else None,
            "abandonados": est["abandonado"],
            "nota_media": round(sum(notas) / len(notas), 2) if notas else None,
            "reparto_notas": [sum(1 for n in notas if lo <= n < lo + 1 or (lo == 9 and n == 10))
                              for lo in range(1, 10)],
            "pendientes": est["pendiente"]}


def wrapped_extra(year: int) -> dict:
    """Tarjetas extra de «Mi año en anime»."""
    h = habitos(year)
    return {"hora_top": h["hora_top"], "dia_top": h["dia_top"], "dia_top_txt": h["dia_top_txt"],
            "franja_top": h["franja_top"], "maraton_max": h["maraton_max"],
            "por_hora": h["por_hora"], "por_dia": h["por_dia"], "marcas": h["marcas"]}
