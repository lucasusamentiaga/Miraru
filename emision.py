"""Animes en emisión: hasta dónde se puede ver hoy (v2.17.3).

AniList da el total PREVISTO de episodios (13) aunque solo hayan salido 7. Antes
Miraru usaba ese total para todo: «Ep 8 / 13» en «Continuar», el «+1» seguía
apareciendo con todo lo emitido ya visto, y se podía marcar como completado algo
que aún no ha terminado de emitirse.

Ahora cada anime guarda `eps_emitidos` (el último episodio que ha salido,
según `nextAiringEpisode` de AniList) y estas reglas valen para todo Miraru:

- tope de hoy = episodios emitidos (o el total si ya terminó);
- «al día» = has visto todo lo emitido;
- completado = solo si ya terminó de emitirse, o si has visto todos los
  episodios previstos (el último capítulo acaba de salir y AniList aún no ha
  cambiado el estado).

Si llega un episodio por encima de lo emitido (la extensión, el día del
estreno, con el dato de AniList de hace unas horas), se cree al usuario: sube
`eps_emitidos`, no se baja su progreso.
"""
from __future__ import annotations

import re

EN_EMISION = {"en emisión", "en emision", "releasing", "currently airing", "airing"}


def en_emision(a: dict) -> bool:
    return (a.get("estado_anime") or "").strip().lower() in EN_EMISION


def total(a: dict) -> int:
    """Total de episodios previstos; 0 si no se sabe («?», «7+», película)."""
    caps = str(a.get("capitulos") or "").strip()
    m = re.fullmatch(r"(\d+)(?:\.0+)?", caps)
    return int(m.group(1)) if m else 0


def emitidos(a: dict) -> int:
    """Episodios que ya han salido (0 = no se sabe). Solo tiene sentido en
    emisión: un anime terminado tiene todos emitidos."""
    if not en_emision(a):
        return 0
    try:
        e = int(a.get("eps_emitidos") or 0)
    except (TypeError, ValueError):
        e = 0
    if e > 0:
        # Si ya has visto más, es que ha salido (otro horario, otra web):
        # nunca «6/5 emitidos».
        try:
            return max(e, int(a.get("episodios_vistos") or 0))
        except (TypeError, ValueError):
            return e
    m = re.fullmatch(r"(\d+)\+", str(a.get("capitulos") or "").strip())
    return int(m.group(1)) if m else 0


def tope(a: dict) -> int:
    """Hasta qué episodio se puede ver hoy (0 = sin tope conocido)."""
    return emitidos(a) or total(a)


def puede_completar(a: dict, vistos: int | None = None) -> bool:
    if (a.get("tipo") or "anime") == "manga" or not en_emision(a):
        return True
    v = int(a.get("episodios_vistos") or 0) if vistos is None else int(vistos)
    t = total(a)
    return t > 0 and v >= t


def ajustar(actual: dict, campos: dict) -> dict:
    """Corrige un cambio que llega de fuera (AnimeAV1, AniList, Netflix…) para
    que cumpla las reglas sin dar error: nunca «completado» en emisión con
    episodios por salir; y si se ven más de los «emitidos», sube el dato."""
    campos = dict(campos)
    if (actual.get("tipo") or "anime") == "manga":
        return campos
    vistos = campos.get("episodios_vistos", actual.get("episodios_vistos"))
    try:
        vistos = int(vistos or 0)
    except (TypeError, ValueError):
        vistos = 0
    if campos.get("estado_usuario") == "completado" and not puede_completar(actual, vistos):
        campos["estado_usuario"] = "viendo"
    e = emitidos(actual)
    if e and vistos > e:
        campos["eps_emitidos"] = vistos
    return campos
