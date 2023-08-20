#!/usr/bin/python3
""" Initializes the models package """

from .game_engine import Game, isAnagram

# Global Variables for the API
game = Game()
words = ['Dopamine', 'Beans', 'Lava', 'Dodo', 'Believe', 'Platinum', 'Awry']
game.words = {'words': [[word.lower()] for word in words],
              'used': []}

game.words['words'].append(['Live'.lower(),
                            'Happening currently as opposed to previously.'])

game.scores = [(17, 'Bolter'), (1998, 'Fred'), (333, '1234567890123456789')]
