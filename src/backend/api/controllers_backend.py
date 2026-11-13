#!/usr/bin/python3
""" Contains Anagram Master's API route controllers """
from api.controllers_auxiliary import delete_player_id, get_player_id, \
                                      signed_response, error_handler
from flask import jsonify, request
from models import Cypher, Game, highscores
from utils import health


def api_status():
    """Anagram Master API health status"""
    return jsonify(health())


def init():
    """Handles user on-boarding"""
    # Read JSON data passed with the request
    data = request.get_json(force=True, silent=True)
    if not isinstance(data, dict):
        return jsonify({'error': 'Expected a JSON body'}), 400
    name = data.get('name')
    if not name or len(name) < 3:
        return jsonify({'error': 'name must have >= 3 characters'}), 400

    # Truncate player name if it's too long (>15 characters)
    name = name[:15] if len(name) > 15 else name

    try:
        game = Game(name=name)
        return signed_response(jsonify(game.status), game.id,
                               share_token=True)
    except (SyntaxError, ValueError) as err:
        print({'error': err})
        return jsonify({'error': 'Invalid name'}), 400
    except Exception as err:
        print({'error': err})
        return error_handler(500)


def status():
    """Returns last state of game session data"""
    # Get player_id from cookie
    player_id = get_player_id(request)
    if player_id:
        try:
            game = Game(_id=player_id)
            session = game.status
            if session.get('error'):
                return jsonify({'error': session['error']}), 401
            return signed_response(jsonify(session), player_id)
        except (SyntaxError, ValueError) as err:
            print({'error': err})
            return jsonify({'error': 'You have no saved game'}), 401
        except Exception as err:
            print({'error': err})
            return error_handler(500)
    return jsonify({'error': 'You have no saved game'}), 403


def resume():
    """Sets the cookie again for a saved game, from the token the app kept
    when the game was created (the X-Session header of /init). Returns the
    game's status, or 401 if the token is bad or the game is already over."""
    data = request.get_json(force=True, silent=True)
    token = data.get('token') if isinstance(data, dict) else None
    if not token or not isinstance(token, str):
        return jsonify({'error': 'Expected a token'}), 400
    try:
        player_id = Cypher.decrypt(token)
    except Exception:
        return jsonify({'error': 'You have no saved game'}), 401
    try:
        game = Game(_id=player_id)
        session = game.status
        if session.get('error') or not session.get('status'):
            return jsonify({'error': 'You have no saved game'}), 401
        return signed_response(jsonify(session), player_id)
    except (SyntaxError, ValueError) as err:
        print({'error': err})
        return jsonify({'error': 'You have no saved game'}), 401
    except Exception as err:
        print({'error': err})
        return error_handler(500)


def play():
    """Handles gameplay: word submission and new round requests"""
    # Get player_id from cookie
    player_id = get_player_id(request)
    if player_id:
        try:
            # Load game session for decrypted player_id
            game = Game(_id=player_id)
            # Read JSON data passed with the request
            if request.method == 'POST':
                data = request.get_json(force=True, silent=True)
                if not isinstance(data, dict):
                    return jsonify({'error': 'Expected a JSON body'}), 400
                new, word = data.get('new_word'), data.get('word')
                round_no = data.get('round')  # the round a skip is meant for
            else:
                new, word, round_no = False, None, None
            # Process session based on given data
            if word and not new:
                session = game.play(word)
            else:
                session = game.skip(round_no) if new else game.status
            return signed_response(jsonify(session), player_id)
        except (SyntaxError, ValueError) as err:
            print({'error': err})
            return jsonify({'error': 'You have no active game'}), 401
        except Exception as err:
            print({'error': err})
            return error_handler(500)
    return jsonify({'error': 'You have no active game'}), 403


def close_by_token(token):
    """Ends the game a token stands for (the value the app kept from /init's
    X-Session header) and returns its final status. The cookie is neither
    read nor changed, so the app can end a game other than the current one
    without losing the current one. 401 if the token is bad or that game is
    already over."""
    if not token or not isinstance(token, str):
        return jsonify({'error': 'Expected a token'}), 400
    try:
        player_id = Cypher.decrypt(token)
    except Exception:
        return jsonify({'error': 'You have no active game'}), 401
    try:
        game = Game(_id=player_id)
        if not game.active:
            return jsonify({'error': 'You have no active game'}), 401
        game.end()
        return jsonify(game.status)
    except (SyntaxError, ValueError) as err:
        print({'error': err})
        return jsonify({'error': 'You have no active game'}), 401
    except Exception as err:
        print({'error': err})
        return error_handler(500)


def close():
    """Handles user off-boarding. A JSON body with a `token` ends that game
    instead of the cookie's (see close_by_token)."""
    data = request.get_json(force=True, silent=True)
    if isinstance(data, dict) and 'token' in data:
        return close_by_token(data['token'])
    # Get player_id from cookie
    player_id = get_player_id(request)
    if player_id:
        try:
            game = Game(_id=player_id)
            game.end()
            return delete_player_id(jsonify(game.status))
        except (SyntaxError, ValueError) as err:
            print({'error': err})
            return jsonify({'error': 'You have no active game'}), 401
        except Exception as err:
            print({'error': err})
            return error_handler(500)
    return jsonify({'error': 'You have no active game'}), 403


def scores(full: bool = False):
    """Returns top 20 or all highscores"""
    return jsonify({'scores': highscores(full=full)})
