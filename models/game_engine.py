#!/usr/bin/python3
""" Contains Game engine class and word checker isAnagram function """
# NOTE: Highscores name length must be <= 15 when entered by user

from uuid import uuid4


# class Engine(Game):
class Game:
    """Class used to manage game engine data."""
    players = []
    scores = None
    words = {}
    # err_lvl = None
    last_err = None
    host_id = None
    round_limit = 20

    def __init__(self, words: dict = {}, scores: list = ['<score>, <name>']):
        """Initialises Engine."""
        self.words = words
        self.scores = scores
        # Load round word at start of game
        Game.words['used'].append(Game.words['words'].pop())

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
                'round_limit': Game.round_limit,
                'word': Game.words['used'][-1],
                'words': {}}
        Game.players.append(data)
        Game.err_lvl = None
        return data

    def print_scores(self):
        """Prints the stored player highscores."""
        if not Game.scores:
            return
        scores = ['\n' + ('- ' * 15)]
        scores += [('- ' * 3) + ' Anagram  Master  ' + ('- ' * 3)]
        scores += [('- ' * 3) + '    Highscores    ' + ('- ' * 3)]
        scores += ['|     PLAYER      |  SCORE  |']
        scores += [('  -   ' * 5)]
        for score in Game.scores:
            score = (score[0], score[1][:15]) if len(score[1]) > 15 else score
            scores += [f'| {score[1]:16s}|   {int(score[0]):5d} |']
        scores += [('- ' * 15)]
        scores = '\n'.join(str(item) for item in scores)
        # scores = '\n'.join(map(str, scores))
        print(scores.__str__())
        Game.err_lvl = None
        return scores

    # def status(self, verbose=False, leaderboard=False):
    def status(self, turn: int, skip: bool = False, word: str = None,
               verbose: bool = False):
        """Returns dictionary of Game statistics."""
        # Data validation
        if not isinstance(turn, int) or turn >= len(Game.players):
            print({'error': 'Invalid turn!'})
            return {'error': 'Invalid turn!'}

        # Clear previous error state
        if Game.players[turn].get('error'):
            Game.players[turn].pop('error')

        # Check if words limit reached
        root_word = Game.words['used'][-1][0]
        user_words = Game.players[turn]['words'].get(root_word)
        if user_words:
            valid = [word for word in user_words if word[1]]
            if len(valid) >= Game.round_limit:
                err_msg = 'ERROR: That\'s the last word for this round!'
                data = Game.players[turn]
                data['error'] = err_msg
                print({'error': err_msg})
                return data

        # Process skip button request
        if skip:
            if len(Game.words['words']):
                Game.words['used'].append(Game.words['words'].pop())
            else:
                print({'error': 'ERROR: That\'s the last word for the game!'})
                return {'error': 'ERROR: That\'s the last word for the game!'}

        # Set current word in each user's data
        for player in Game.players:
            player['word'] = Game.words['used'][-1]
        if skip:
            return Game.players[turn]

        # Process player's submitted word
        if word:
            # Check if given word is the root word for the current round
            if word.lower() == root_word.lower():
                err_msg = 'You can\'t use the given word!<br>'\
                          'Try forming a new word from it instead.'
                print({'error': f'ERROR: {err_msg}'})
                return {'error': f'ERROR: {err_msg}'}

            # Check if given word is valid
            word = (word.lower(), isAnagram(word, root_word))
            if root_word in Game.players[turn]['words'].keys():
                if word not in Game.players[turn]['words'][root_word]:
                    Game.players[turn]['words'][root_word].append(word)
                else:
                    print({'error': 'ERROR: Duplicate word! Try another.'})
                    return {'error': 'ERROR: Duplicate word! Try another.'}
            else:
                Game.players[turn]['words'][root_word] = [word]

            # Sort player's submitted words for current root word
            Game.players[turn]['words'][root_word].sort()

            # Return player's game statistics
            return Game.players[turn]

        stats = {'players': Game.players,
                 'players_count': len(Game.players),
                 'word': Game.words['words'][-1],
                 'words_count': len(Game.words['words']),
                 'used': Game.words['used'],
                 'used_count': len(Game.words['used']),
                 'leaderboard_count': len(Game.scores)}
        if Game.last_err:
            stats['LAST ACTION'] = "Failed!" if Game.err_lvl else "Passed!",
            stats['LAST ERROR'] = Game.last_err
        if verbose:
            stats['words'] = Game.words['words']
            stats['leaderboard'] = Game.scores
        Game.err_lvl = None
        return stats

    def reset(self, words: dict):
        """Resets the class to start a new game session."""
        self.words = words
        Game.words['used'].append(Game.words['words'].pop())
        Game.players, Game.change_round = [], 0
        Game.err_lvl = Game.last_err = Game.host_id = None

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


def isAnagram(word: str, root: str) -> bool:
    """Function checks if a user's word can be formed
    using only the letters from the given root word.

    :param word: Letters to be checked in root.
    :param root: Should contain all letters in word.
    :return: True if word can be formed from root,
             False otherwise.
    """

    if not isinstance(word, str) or not isinstance(root, str):
        return False

    word_idx = root_idx = 0
    word, root = sorted(word.lower()), sorted(root.lower())
    while word_idx < len(word) and root_idx < len(root):
        if word[word_idx] == root[root_idx]:
            word_idx += 1
        root_idx += 1
    return True if word_idx == len(word) else False
    # i, idx = len(word) - 1, len(root) - 1
    # while i >= 0 and idx >= 0:
    #     if word[i] == root[idx]:
    #         print(i, word[i], root[idx], idx, True)
    #         i -= 1
    #     else:
    #         print(i, word[i], root[idx], idx, False)
    #     idx -= 1
    # print('1 Success!') if i == -1 else print('1 Error!')


if __name__ == '__main__':
    word_list = ('developer', 'programming', 'javA', 'JAVA', 'JavaScript',
                 8748934, 'ChatGPT', 'API', 'youtube', 'youtube', 'youtube')
    w = 0
    worded = 'lOeEeRV'
    rooted = word_list[w]

    print(f'{worded}\n{rooted}\n')
    print('Success!') if isAnagram(worded, rooted) else print('Error!')

    # g = Game()
    # # s = Engine()
    # z = Game()
    # g.bro = 2
    # print(g.bro)
    # g.create_player()
    # print('g.players = ', g.players)
    # g.players = 4
    # print('\t\t\t\tg.players = ', g.players)
    # print('g.scores = ', g.scores)
    # g.words = 234
    # print('\t\t\t\tg.words = ', g.words)
    # g.words = [234]
    # print('\t\t\t\tg.words = ', g.words)
    # g.words = ['Beans', 'Dodo', 'Platinum']
    # print('\t\t\t\tg.words = ', g.words)
    # print(f'z.players = {z.players} | z.words = {z.words}')
    # g.scores = [(17, 'Bolter'), (1998, 'Fred'), (333, '1234567890123456789')]
    # g.scores = 12
    # print(g)
    # g.players = 22
    # g.print_scores()
    # print(g)
