#!/usr/bin/python3
""" Contains Anagram Master's API Flask app """
# NOTE: Highscores name length must be <= 15 when entered by user

from flask import Flask, jsonify, render_template
from models import game, isAnagram
import uuid

app = Flask(__name__)


@app.errorhandler(404)
def not_found(e):
    """ Function for handling 404 error """
    return jsonify({'error': 'Forbidden'}), 403


@app.route('/api/v1/init', methods=['GET'], strict_slashes=False)
@app.route('/api/v1/init/<string:name>', methods=['GET'])
def init(name='Brendan Cardigan', leaderboard=False):
    """ Anagram Master API init route. Triggers on-boarding events """
    if leaderboard:
        if leaderboard.lower() == 'scores':
            return jsonify(game.scores)
        else:
            return not_found(None)
    name = name[:15] if len(name) > 15 else name
    return jsonify(game.create_player(name))


# @app.route('/api/v1/status', methods=['POST'], strict_slashes=False)
@app.route('/api/v1/status', strict_slashes=False)
@app.route('/api/v1/status/<string:mode>', strict_slashes=False)
@app.route('/api/v1/status/<string:mode>/<string:word>', strict_slashes=False)
def status(mode=None, word=None):
    """ Anagram Master API status route. This is the main/gameplay route """
    if not mode:
        data = game.status()
    else:
        if mode.lower() == 'words':
            data = game.words
        elif mode.lower() == 'pla':
            players = len(game.players)
            if players:
                data = game.status(turn=players, word=word)
            else:
                data = game.status(True)
        elif mode.lower() == 'players':
            data = game.players
        elif mode.lower() == 'scores':
            data = game.scores
        else:
            data = game.status(verbose=True)
    return jsonify(data)


# @app.route('/api/v1/close', methods=['POST'], strict_slashes=False)
@app.route('/api/v1/close', strict_slashes=False)
def close():
    """ Anagram Master API close route. Triggers off-boarding events """
    return jsonify({'Implemented': False})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5555, threaded=True, debug=True)

    word_list = ('developer', 'programming', 'javA', 'JAVA', 'JavaScript',
                 8748934, 'ChatGPT', 'API', 'youtube', 'youtube', 'youtube')
    w = 0
    worded = 'lOeEeRV'
    rooted = word_list[w]

    print(f'{worded}\n{rooted}\n')
    print('Success!') if isAnagram(worded, rooted) else print('Error!')

    g = game
    # s = Engine()
    z = game
    g.bro = 2
    print(g.bro)
    g.create_player()
    print('g.players = ', g.players)
    g.players = 4
    print('\t\t\t\tg.players = ', g.players)
    print('g.scores = ', g.scores)
    g.words = 234
    print('\t\t\t\tg.words = ', g.words)
    g.words = [234]
    print('\t\t\t\tg.words = ', g.words)
    g.words = ['Beans', 'Dodo', 'Platinum']
    print('\t\t\t\tg.words = ', g.words)
    print(f'z.players = {z.players} | z.words = {z.words}')
    g.scores = [(17, 'Bolter'), (1998, 'Fred'), (333, '1234567890123456789')]
    g.scores = 12
    print(g)
    g.players = 22
    g.print_scores()
    print(g)
