#!/usr/bin/python3
""" Initializes the models package """
from .game_engine import Game, isAnagram


def getScores():
    """Loads list of high scores from storage."""
    scores = [(17, 'Bolter'), (1998, 'Fred'), (333, '1234567890123456789')]
    return scores


def getWords():
    """Loads words list from storage."""
    words = ['Dopamine', 'Beans', 'Lava', 'Dodo', 'Believe', 'Platinum', 'Awry']
    words = {'words': [[word.lower()] for word in words],
             'used': []}
    words['words'].append(['Live'.lower(),
                           'Happening currently as opposed to previously.'])
    words['words'].append(['BENEVOLENTLY'.lower(),
                           'Done in a manner that shows innate generosity.'])
    return words


def newGame():
    """Creates a new Game class instance for the API."""
    # game = Game(getWords(), getScores())
    # print(game.words)
    # return game
    words = getWords()
    if words:
        print("Game engine initialised!")
        return Game(words, getScores())
    print("Error: Failed to load words list!")
