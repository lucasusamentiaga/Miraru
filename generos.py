"""Nombres de géneros en el idioma de la interfaz (v2.18.5).

Los géneros llegan en inglés de las fuentes de anime y manga («Comedy»,
«Slice of Life»…) y se guardan tal cual: así siguen funcionando los filtros y
las recomendaciones. Aquí solo se traducen para enseñarlos. Lo que no está en
la tabla (o ya viene traducido, como los de series y películas) se deja igual.
"""
from __future__ import annotations

from collections import Counter
from collections.abc import Iterable

import i18n

# inglés → (es, fr, de)
_G: dict[str, tuple[str, str, str]] = {
    "Action": ("Acción", "Action", "Action"),
    "Adventure": ("Aventura", "Aventure", "Abenteuer"),
    "Comedy": ("Comedia", "Comédie", "Komödie"),
    "Drama": ("Drama", "Drame", "Drama"),
    "Ecchi": ("Ecchi", "Ecchi", "Ecchi"),
    "Fantasy": ("Fantasía", "Fantasy", "Fantasy"),
    "Horror": ("Terror", "Horreur", "Horror"),
    "Mahou Shoujo": ("Chicas mágicas", "Magical girl", "Magical Girl"),
    "Mecha": ("Mecha", "Mecha", "Mecha"),
    "Music": ("Música", "Musique", "Musik"),
    "Mystery": ("Misterio", "Mystère", "Mystery"),
    "Psychological": ("Psicológico", "Psychologique", "Psycho"),
    "Romance": ("Romance", "Romance", "Romantik"),
    "Sci-Fi": ("Ciencia ficción", "Science-fiction", "Science-Fiction"),
    "Slice of Life": ("Recuentos de la vida", "Tranche de vie", "Slice of Life"),
    "Sports": ("Deportes", "Sport", "Sport"),
    "Supernatural": ("Sobrenatural", "Surnaturel", "Übernatürlich"),
    "Thriller": ("Suspense", "Thriller", "Thriller"),
    "Suspense": ("Suspense", "Suspense", "Spannung"),
    "Award Winning": ("Premiado", "Primé", "Preisgekrönt"),
    "Avant Garde": ("Vanguardia", "Avant-garde", "Avantgarde"),
    "Boys Love": ("Boys Love", "Boys Love", "Boys Love"),
    "Girls Love": ("Girls Love", "Girls Love", "Girls Love"),
    "Gourmet": ("Gastronomía", "Gastronomie", "Kulinarik"),
    "Shounen": ("Shōnen", "Shōnen", "Shōnen"),
    "Shoujo": ("Shōjo", "Shōjo", "Shōjo"),
    "Seinen": ("Seinen", "Seinen", "Seinen"),
    "Josei": ("Josei", "Josei", "Josei"),
    "Kids": ("Infantil", "Enfants", "Kinder"),
    "School": ("Escolar", "École", "Schule"),
    "Isekai": ("Isekai", "Isekai", "Isekai"),
    "Military": ("Militar", "Militaire", "Militär"),
    "Historical": ("Histórico", "Historique", "Historisch"),
    "Martial Arts": ("Artes marciales", "Arts martiaux", "Kampfkunst"),
    "Super Power": ("Superpoderes", "Super-pouvoirs", "Superkräfte"),
    "Harem": ("Harén", "Harem", "Harem"),
    "Reverse Harem": ("Harén inverso", "Harem inversé", "Reverse Harem"),
    "Space": ("Espacio", "Espace", "Weltraum"),
    "Vampire": ("Vampiros", "Vampires", "Vampire"),
    "Samurai": ("Samuráis", "Samouraïs", "Samurai"),
    "Parody": ("Parodia", "Parodie", "Parodie"),
    "Iyashikei": ("Iyashikei", "Iyashikei", "Iyashikei"),
    "Survival": ("Supervivencia", "Survie", "Überleben"),
    "Time Travel": ("Viajes en el tiempo", "Voyage dans le temps", "Zeitreise"),
    "Reincarnation": ("Reencarnación", "Réincarnation", "Wiedergeburt"),
    "Detective": ("Detectives", "Enquête", "Detektiv"),
    "Gore": ("Gore", "Gore", "Gore"),
    "Team Sports": ("Deportes de equipo", "Sports collectifs", "Mannschaftssport"),
    "Combat Sports": ("Deportes de combate", "Sports de combat", "Kampfsport"),
    "Racing": ("Carreras", "Course", "Rennsport"),
    "Workplace": ("Trabajo", "Travail", "Arbeitsplatz"),
    "Love Polygon": ("Triángulo amoroso", "Triangle amoureux", "Liebesdreieck"),
    "Idols (Female)": ("Idols", "Idols", "Idols"),
    "Idols (Male)": ("Idols", "Idols", "Idols"),
    "Performing Arts": ("Artes escénicas", "Arts du spectacle", "Darstellende Kunst"),
    "Visual Arts": ("Artes visuales", "Arts visuels", "Bildende Kunst"),
    "Adult Cast": ("Reparto adulto", "Personnages adultes", "Erwachsene Figuren"),
    "Anthropomorphic": ("Antropomórfico", "Anthropomorphe", "Anthropomorph"),
    "CGDCT": ("Chicas monas", "Filles mignonnes", "Niedliche Mädchen"),
    "Childcare": ("Crianza", "Garde d'enfants", "Kinderbetreuung"),
    "Delinquents": ("Delincuentes", "Délinquants", "Delinquenten"),
    "Educational": ("Educativo", "Éducatif", "Lehrreich"),
    "Gag Humor": ("Humor absurdo", "Humour gag", "Gag-Humor"),
    "High Stakes Game": ("Juegos a vida o muerte", "Jeux à enjeux", "Riskante Spiele"),
    "Magical Sex Shift": ("Cambio de sexo", "Changement de sexe", "Geschlechtertausch"),
    "Medical": ("Medicina", "Médical", "Medizin"),
    "Mythology": ("Mitología", "Mythologie", "Mythologie"),
    "Organized Crime": ("Crimen organizado", "Crime organisé", "Organisiertes Verbrechen"),
    "Otaku Culture": ("Cultura otaku", "Culture otaku", "Otaku-Kultur"),
    "Pets": ("Mascotas", "Animaux", "Haustiere"),
    "Romantic Subtext": ("Subtexto romántico", "Sous-texte romantique", "Romantischer Subtext"),
    "Showbiz": ("Farándula", "Showbiz", "Showbusiness"),
    "Strategy Game": ("Estrategia", "Stratégie", "Strategie"),
    "Video Game": ("Videojuegos", "Jeux vidéo", "Videospiele"),
    "Villainess": ("Villana", "Méchante", "Schurkin"),
    "Urban Fantasy": ("Fantasía urbana", "Fantasy urbaine", "Urban Fantasy"),
    "Crossdressing": ("Travestismo", "Travestissement", "Crossdressing"),
    "Dementia": ("Demencia", "Démence", "Wahnsinn"),
    "Police": ("Policíaco", "Policier", "Polizei"),
    "Demons": ("Demonios", "Démons", "Dämonen"),
    "Magic": ("Magia", "Magie", "Magie"),
    "Game": ("Juegos", "Jeux", "Spiele"),
    "Cars": ("Coches", "Voitures", "Autos"),
    # Series y películas (por si alguna llegó en inglés)
    "Animation": ("Animación", "Animation", "Animation"),
    "Crime": ("Crimen", "Crime", "Krimi"),
    "Documentary": ("Documental", "Documentaire", "Dokumentarfilm"),
    "Family": ("Familia", "Famille", "Familie"),
    "History": ("Historia", "Histoire", "Historie"),
    "Science Fiction": ("Ciencia ficción", "Science-fiction", "Science-Fiction"),
    "War": ("Bélica", "Guerre", "Kriegsfilm"),
    "Western": ("Western", "Western", "Western"),
}
_IDX = {"es": 0, "fr": 1, "de": 2}


def nombre(g: str, lang: str | None = None) -> str:
    g = (g or "").strip()
    lang = (lang or i18n.get_lang() or "es")[:2]
    t = _G.get(g)
    if not t or lang not in _IDX:
        return g
    return t[_IDX[lang]]


def contar(lista: Iterable[str], lang: str | None = None) -> Counter:
    """Cuenta géneros ya traducidos (si dos nombres acaban igual, se suman)."""
    c: Counter = Counter()
    for g in lista:
        if g and g.strip():
            c[nombre(g, lang)] += 1
    return c


def mapa(lang: str | None = None) -> dict[str, str]:
    """{inglés: traducido} para la interfaz (tarjetas de la lista)."""
    lang = (lang or i18n.get_lang() or "es")[:2]
    if lang not in _IDX:
        return {}
    return {k: v[_IDX[lang]] for k, v in _G.items() if v[_IDX[lang]] != k}
