#!/usr/bin/python3
""" Contains Anagram Master's API route controllers """
from api.controllers_auxiliary import delete_player_id, get_player_id, \
                                      signed_response, error_handler
from flask import jsonify, request
from models import Game, highscores
from utils import health


def api_status():
    """Anagram Master API health status"""
    return jsonify(health())


def init():
    """Handles user on-boarding"""
    # Read JSON data passed with the request
    name = request.get_json(force=True, silent=True).get('name')
    if not name or len(name) < 3:
        return jsonify({'error': 'name must have >= 3 characters'}), 400

    # Truncate player name if it's too long (>15 characters)
    name = name[:15] if len(name) > 15 else name

    try:
        game = Game(name=name)
        return signed_response(jsonify(game.status), game.id)
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
                new = request.get_json(force=True, silent=True).get('new_word')
                word = request.get_json(force=True, silent=True).get('word')
            else:
                new, word = False, None
            # Process session based on given data
            if word and not new:
                session = game.play(word)
            else:
                if new:
                    game.new_round()
                session = game.status
            return signed_response(jsonify(session), player_id)
        except (SyntaxError, ValueError) as err:
            print({'error': err})
            return jsonify({'error': 'You have no active game'}), 401
        except Exception as err:
            print({'error': err})
            return error_handler(500)
    return jsonify({'error': 'You have no active game'}), 403


def close():
    """Handles user off-boarding"""
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
