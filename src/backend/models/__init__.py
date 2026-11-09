#!/usr/bin/python3
""" Initializes the models package """
from .game_engine import Game
from .db_scores import DBScores
from .cypher import Cypher


def highscores(full: bool = False) -> list[tuple]:
    """Helper functon for getting highscores from the database"""
    limit = 0 if full else 20
    try:
        scores = DBScores().load(limit=limit)
    except Exception:
        scores = []
    return scores


print(f' highscores: {len(highscores(True))}\n\n')
