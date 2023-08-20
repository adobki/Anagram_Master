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
    change_round = 0

    def __init__(self, words: list = [], scores=['<score>, <name>']):
        """Initialises Engine."""
        Game.err_lvl = None
        # Game.players.append({'somthing': 'self.create_player()'})
        # self.create_player()

    def __setattr__(self, name, value):
        """Performs data validation before setting class attributes"""
        # self.__dict__[name] = value
        # if name == 'players':
        #     if isinstance(value, int) and 1 <= value <= 4:
        #         Game.players = value
        #         Game.err_lvl = None
        #     else:
        #         Game.err_lvl = -1
        #         Game.last_err = 'Invalid players! Valid format: 1, 2, 3, 4'
        #         print(Game.last_err)
        # elif name == 'words':
        if name == 'words':
            # if isinstance(value, list) and len(value) > 1 and \
            #         all(isinstance(word, str) for word in value):
            if isinstance(value, dict): # and len(value) > 1:
                Game.words = value
                Game.err_lvl = None
            else:
                Game.err_lvl = -1
                Game.last_err = 'Invalid words! Valid format: [{<k>:<val>},...]'
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
        session_id = uuid4()
        if not Game.host_id:
            Game.host_id = session_id
        host_id = Game.host_id
        data = {'status': True,
                'Host ID': host_id,
                'Session ID': session_id,
                'Priority': len(Game.players),
                'User Name': name,
                'Score': 0,
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
    def status(self, verbose: bool = False, turn: int = None, word: str = None):
        """Returns dictionary of Game statistics."""
        if not Game.change_round and len(Game.words['words']) > 1:
            Game.words['used'].append(Game.words['words'].pop())
            Game.change_round = 4 # Should be 2 to match original definition
        Game.change_round -= 1 # Fix this later to trigger on new game round event

        # if leaderboard:
        #     return Game.scores
        #

        if turn and int(turn) < len(Game.words['words']):
            turn -= 1 # Convert int to list index
            if word and len(Game.words['used']):
                round_word = Game.words['used'][-1][0]
                word = (word.lower(), isAnagram(word, round_word))
                if round_word in Game.players[turn]['words'].keys():
                    if word not in Game.players[turn]['words'][round_word]:
                        Game.players[turn]['words'][round_word].append(word)
                else:
                    Game.players[turn]['words'][round_word] = [word]
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
