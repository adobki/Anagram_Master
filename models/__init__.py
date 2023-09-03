#!/usr/bin/python3
""" Initializes the models package """
from .game_engine import Game, isAnagram
from .storage_engine import Storage

# Initialise storage engine to read/write from/to file system
fs = Storage()


def getScores():
    """Loads list of high scores from storage."""
    return fs.load('scores')


def addScore(name: str, score: int):
    """Saves list of high scores to storage."""
    # Data Validation
    if not isinstance(name, str) or not isinstance(score, int):
        err = {'error': 'ERROR: name must be a string, score must be an int'}
        print(err)
        return err
    if score < 1 or score > 9999:
        err = {'error': 'ERROR: Invalid score! Must be >= 1 and <=9999'}
        print(err)
        return err
    scores = fs.load('scores')
    score = (score, name)
    if score not in scores:
        scores.append(score)
        scores.sort(reverse=True)
        scores = scores[:20] if len(scores) > 20 else scores
        scores = fs.save('scores', scores)
    return scores


def getWords():
    """Loads words list from storage."""
    words = fs.load('words')
    # Convert to lowercase, remove trailing newline character, store in a dict
    words = {'words': [word.lower().strip() for word in words],
             'used': []}
    return words


def newGame():
    """Creates a new Game class instance for the API."""
    words = getWords()
    if words:
        print(f'Game engine initialised with {len(words["words"])} words!')
        return Game(words, getScores())
    print('Error: Failed to load words list!')
