#!/usr/bin/python3
""" Contains Game engine class and word checker isAnagram function """
from random import shuffle
from time import time
from uuid import uuid4


class Game:
    """Class used to manage game engine data."""
    players = []
    scores = None
    words = {}
    word_index = 0
    last_err = None
    host_id = None
    round_time = None
    time_limit = 120
    round_limit = 20

    def __init__(self, words: dict = {}, scores: list = ['<score>, <name>']):
        """Initialises Engine."""
        self.words = words
        self.scores = scores
        # Load round word at start of game
        shuffle(Game.words['words'])
        i = getWordIndex(Game.words['words'])
        Game.words['used'].append(Game.words['words'][i])
        Game.word_index = i + 1

    def __setattr__(self, name, value):
        """Performs data validation before setting class attributes"""
        if name == 'words':
            if isinstance(value, dict) and len(value) > 1:
                Game.words = value
                Game.err_lvl = None
            else:
                Game.err_lvl = -1
                Game.last_err = 'Invalid words! Valid format:[{<k>:<val>},...]'
                print(Game.last_err)
        elif name == 'scores':
            if isinstance(value, list):
                Game.scores = sorted(value, reverse=True)
                Game.err_lvl = None
            else:
                Game.err_lvl = -1
                Game.last_err = "Invalid scores! Valid format: " \
                                "[(int,str),(int,str),...]"
                print(Game.last_err)
        elif name == 'host_id':
            Game.host_id = value
            Game.err_lvl = None
        else:
            Game.err_lvl = -1
            print(f'Invalid attribute "{name}" = {value}!')

    def create_player(self, name):
        """Creates a new player object."""
        session_id = uuid4().__str__()
        if not Game.host_id:
            Game.host_id = session_id
        host_id = Game.host_id
        data = {'status': True,
                'Host ID': host_id,
                'Session ID': session_id,
                'Priority': len(Game.players),
                'User Name': name,
                'Score': 0,
                'time': Game.time_limit,
                'round_limit': Game.round_limit,
                'word': Game.words['used'][-1],
                'words': {}}
        Game.players.append(data)
        Game.err_lvl = None
        Game.round_time = time()
        return data

    def status(self, turn: int, skip: bool = False, word: str = None,
               verbose: bool = False):
        """Returns dictionary of Game statistics."""
        # Data validation
        if not isinstance(turn, int) or turn >= len(Game.players):
            print({'error': 'Invalid turn!'})
            return {'error': 'Invalid turn!'}

        # Clear previous error and skip states
        if Game.players[turn].get('error'):
            Game.players[turn].pop('error')
        if Game.players[turn].get('skipped'):
            Game.players[turn].pop('skipped')

        # Process round time
        Game.round_time = time() if not Game.round_time else Game.round_time
        current_time = Game.time_limit - int(time() - Game.round_time)
        Game.players[turn]['time'] = current_time if current_time > 0 else 0
        if current_time <= 0:
            skip = True

        # Process skip button request
        words = Game.words['words']
        i = Game.word_index
        if skip:
            if len(words[i:]) > 1:
                i = getWordIndex(words[i:]) + i
                Game.words['used'].append(words[i])
                Game.word_index = i + 1
                Game.players[turn]['skipped'] = True
                Game.round_time = time()
            else:
                print({'error': 'ERROR: That\'s the last word for the game!'})
                return {'error': 'ERROR: That\'s the last word for the game!'}

        # Set current word and time in each user's data
        if skip:
            for player in Game.players:
                player['word'] = Game.words['used'][-1]
                player['time'] = Game.time_limit
            return Game.players[turn]

        # Process player's submitted word
        root_word = Game.words['used'][-1]
        if word:
            word = word.lower()
            # Check if given word is the root word for the current round
            if word == root_word.lower():
                err_msg = 'You can\'t use the given word!<br>'\
                          'Try forming a new word from it instead.'
                print({'error': f'ERROR: {err_msg}'})
                return {'error': f'ERROR: {err_msg}'}

            # Check if given word is valid
            words = Game.words['words']
            valid = False
            if isAnagram(word, root_word) and word in words:
                valid = True
                # Update player's score
                bonus = 10 if len(word) == len(root_word) else 0
                score = 10 * len(word) / len(root_word) + bonus
                Game.players[turn]['Score'] += round(round(score, 1))
            else:
                # Penalise player for invalid input
                Game.players[turn]['Score'] -= 2
            word = (word, valid)
            if root_word in Game.players[turn]['words'].keys():
                if word not in Game.players[turn]['words'][root_word]:
                    Game.players[turn]['words'][root_word].append(word)
                    # Check if words limit reached
                    user_words = Game.players[turn]['words'].get(root_word)
                    if user_words:
                        valid = [word for word in user_words if word[1]]
                        if len(valid) >= Game.round_limit:
                            # Give bonus for reaching words limit, then skip
                            Game.players[turn]['Score'] += 50
                            self.status(turn, skip=True)
                else:
                    print({'error': 'ERROR: Duplicate word! Try another.'})
                    return {'error': 'ERROR: Duplicate word! Try another.'}
            else:
                Game.players[turn]['words'][root_word] = [word]

            # Sort player's submitted words for current root word
            Game.players[turn]['words'][root_word].sort()

        # Return player's game statistics
        return Game.players[turn]

    def reset(self, words: dict, scores: list):
        """Resets the class to start a new game session."""
        self.words = words
        self.scores = scores
        Game.players, Game.change_round = [], 0
        Game.err_lvl = Game.last_err = Game.host_id = None
        # Load round word at start of game
        shuffle(Game.words['words'])
        i = getWordIndex(Game.words['words'])
        Game.words['used'].append(Game.words['words'][i])
        Game.word_index = i + 1

    def __str__(self):
        """String representation of Game statistics for printing."""
        stats = '\n' + ('- ' * 36) + '\n'
        stats += ('- ' * 13) + ' Anagram  Master  ' + ('- ' * 14) + '\n'
        stats += ('- ' * 36) + '\n'
        stats += f'| PLAYERS     : {len(Game.players)}\n'
        if not Game.words:
            stats += '| WORDS      : 0\n'
        else:
            stats += f'| WORDS       : {len(Game.words)}'
            stats += f' [{Game.words[0]}, . . .,{Game.words[-1]}]\n'
        if not Game.scores:
            stats += '| HIGHSCORES:  : 0\n'
        else:
            stats += f'| HIGHSCORES  : {len(Game.scores)}'
            score = Game.scores[0] + Game.scores[-1]
            stats += f' [{score[1]}: {score[0]},' \
                     f' . . ., {score[3]}: {score[2]}]\n'
        stats += '|' + ('      -' * 7) + '\n'
        stats += f'| LAST ACTION : {"Failed!" if Game.err_lvl else "Passed!"}'
        stats += f'\n| LAST ERROR  : {Game.last_err}\n'
        stats += ('- ' * 36) + '\n'
        Game.err_lvl = None
        return stats

    def __getattr__(self, item):
        """Prevents error when unknown attribute is requested."""
        print(f'{item} is not a valid attribute of {self.__class__.__name__}')
        return None


def getWordIndex(words: list):
    """
    Returns the index of the first word in a given words list that meets the
    following requirements:

    * LENGTH: word must have between 9 and 16 characters

    * UNIQUE: index is unique to the current session (i.e. not in used list)

    :param words: Given words list.
    :return: Index of first word that meets requirements,
             0 otherwise.
    """
    i = 0
    for num, word in enumerate(words):
        if 8 < len(word) < 17:
            i = num
            break
    print(f'Tried {i} time(s). Current index is {Game.word_index + i} = '
          f'{words[i]}.')
    return i


def isAnagram(word: str, root: str) -> bool:
    """Function checks if a user's word can be formed using only
    the letters from the given root word, provided word != root.

    :param word: Letters to be checked in root.
    :param root: Should contain all letters in word.
    :return: True if word can be formed from root,
             False otherwise.
    """

    if not isinstance(word, str) or not isinstance(root, str):
        return False
    if word.lower() == root.lower():
        return False

    word_idx = root_idx = 0
    word, root = sorted(word.lower()), sorted(root.lower())
    while word_idx < len(word) and root_idx < len(root):
        if word[word_idx] == root[root_idx]:
            word_idx += 1
        root_idx += 1
    return True if word_idx == len(word) else False


if __name__ == '__main__':
    word_list = ('developer', 'programming', 'javA', 'JAVA', 'JavaScript',
                 8748934, 'ChatGPT', 'API', 'youtube', 'youtube', 'youtube')
    w = 0
    worded = 'lOeEeRV'
    rooted = word_list[w]

    print(f'{worded}\n{rooted}\n')
    print('Success!') if isAnagram(worded, rooted) else print('Error!')
