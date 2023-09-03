#!/usr/bin/python3
""" Contains Anagram Master's API Flask app """
from flask import Flask, jsonify, redirect, render_template, request
from uuid import uuid4
import models

app = Flask(__name__)
isAnagram = models.isAnagram
game = models.newGame()
if not game:
    print("Error: Game engine initialisation failed!")
    quit(1)


@app.errorhandler(404)
def not_found(e):
    """ Function for handling 404 error """
    return jsonify({'error': 'Forbidden'}), 403


@app.route('/api/v1/init', methods=['GET'], strict_slashes=False)
def init(name):
    """ Anagram Master API init route. Triggers on-boarding events """
    # Truncate player if it's too long (>15 characters)
    name = name[:15] if len(name) > 15 else name

    # Check if players limit reached
    if len(game.players):
        err = 'ERROR: Maximum number of players reached!<br>' +\
              'Please wait for current game to end.'
        return jsonify({'error': err})
    return jsonify(game.create_player(name))


@app.route('/api/v1/status', methods=['GET', 'POST'], strict_slashes=False)
def status():
    """ Anagram Master API status route. This is the main/gameplay route """
    if request.method == 'GET':
        data = game.status(turn=0)
        return jsonify(data)
    else:
        is_skip = request.get_json().get('new_word')
        word = request.get_json().get('word')
        session_id = request.get_json().get('Session ID')
        session_ids_all = [player.get('Session ID') for player in game.players]
        if session_id and session_id in session_ids_all:
            turn = session_ids_all.index(session_id)
            if is_skip:
                data = game.status(turn=turn, skip=True)
                print('{0} Skip button used! {0}'.format('-\t' * 8))
            elif word:
                data = game.status(turn=turn, word=word)
            else:
                data = game.status()['players'][turn]
            return jsonify(data)
        print(f'{session_id} is invalid!')
        return jsonify({'error': 'Invalid Session ID'}), 403


@app.route('/api/v1/close', methods=['GET', 'POST'], strict_slashes=False)
def close():
    """ Anagram Master API close route. Triggers off-boarding events """
    # Print custom error if wrong request method is used
    if request.method == 'GET':
        return not_found(None)
    print(request.get_json())
    is_quit = request.get_json().get('quit')
    session_id = request.get_json().get('Session ID')
    session_ids_all = [player.get('Session ID') for player in game.players]
    if session_id and session_id in session_ids_all:
        if is_quit:
            # Update highscores if user has a high score
            turn = session_ids_all.index(session_id)
            score = game.players[turn].get('Score')
            name = game.players[turn].get('User Name')
            models.addScore(name, score)
            # Reset game state/data
            game.reset(models.getWords(), models.getScores())
            print('{0} Game Engine Reset!{0}'.format('\n' + '-\t' * 5 + '\n'))
            return jsonify({'score': (score, name)})
        print('{0}  Reset Failed! [#403]{0}'.format('\n' + '-\t' * 6 + '\n'))
        return jsonify({'error': 'Invalid quit command'}), 403
    print('{0}  Reset Failed! [#403]{0}'.format('\n' + '-\t' * 6 + '\n'))
    return jsonify({'error': 'Invalid Session ID'}), 403


@app.route('/', methods=['GET', 'POST'])
def home():
    """ Anagram Master Homepage """
    am_ret = render_template('index.htm', cache_id=uuid4().__str__())
    if request.method == 'GET':
        return am_ret
    print(f'HEADERS: {request.get_json()}')
    user_name = request.get_json().get('User Name')
    if user_name:
        return init(user_name).json
    # Else display the homepage instead
    return am_ret


@app.route('/onboarding', methods=['GET', 'POST'], strict_slashes=False)
def onboarding():
    """ Anagram Master Homepage """
    # Print custom error if wrong request method is used
    if request.method == 'GET':
        return not_found(None)
    return jsonify({"code": render_template('onboarding.htm')})


@app.route('/game', methods=['GET', 'POST'], strict_slashes=False)
def gameplay():
    """ Anagram Master gameplay route """
    # Print custom error if wrong request method is used
    if request.method == 'GET':
        return not_found(None)
    session_id = request.get_json().get('Session ID')
    session_ids_all = [player.get('Session ID') for player in game.players]
    if session_id and session_id in session_ids_all:
        return jsonify({"code": render_template('game.htm')})
    print(f'{session_id} is invalid!')
    return jsonify({'error': '401: Unauthorised!'})


@app.route('/scores', methods=['GET', 'POST'], strict_slashes=False)
def scores():
    """ Anagram Master Highscores page """
    # Return scores data if POST request method is used, else scores page
    if request.method == 'POST':
        return jsonify({'scores': game.scores})
    return render_template('scores.htm', cache_id=uuid4().__str__())


@app.route('/<page>.htm')
def redirect_internal(page):
    """ Redirects *.htm routes to corresponding route if available """
    if page == 'index':
        return redirect('/', code=302)
    if page == 'game':
        return redirect('/game', code=302)
    if page == 'scores' or page == 'game':
        return redirect(f'/{page}', code=302)
    return not_found(None)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5555, threaded=True, debug=True)
