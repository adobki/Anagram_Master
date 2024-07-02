#!/usr/bin/python3
"""Contains Anagram Master's webpage route controllers"""
from api.controllers_auxiliary import delete_player_id, get_player_id, \
                                      signed_response, error_handler
from flask import jsonify, redirect, render_template, request
from json import dumps
from models import Game
from uuid import uuid4


def home():
    """Anagram Master homepage"""
    # Get player_id from cookie
    player_id = get_player_id(request)
    if player_id:
        try:
            game = Game(_id=player_id)
            session = game.status
            if not session.get('error'):
                payload = dumps({'action': 'Resume Last Game', **session})
                return render_template(
                    'index.htm', cache_id=uuid4().__str__(),
                    status=f'<p id="active" hidden>{payload}</p>')
        except Exception as err:
            print(err)
            pass
    return delete_player_id(render_template('index.htm',
                                            cache_id=uuid4().__str__()))


def onboarding():
    """Anagram Master onboarding page/new game form"""
    return jsonify({"code": render_template('onboarding.htm')})


def gameplay():
    """Anagram Master gameplay page/game screen"""
    # Get player_id from cookie
    player_id = get_player_id(request)
    if player_id:
        try:
            game = Game(_id=player_id)
            session = game.status
            if not session.get('error'):
                return signed_response(
                    jsonify({"code": render_template('game.htm')}), player_id)
            return jsonify({'error': session.get('error')}), 400
        except (SyntaxError, ValueError) as err:
            print({'error': err})
            return error_handler(401)
        except Exception as err:
            print({'error': err})
            return error_handler(500)
        except Exception:
            pass
    return error_handler(401)


# def scores():  # Renamed to html_* for Flask error of conflict with backend's
def html_scores():
    """Anagram Master highscores page"""
    return render_template('scores.htm',
                           cache_id=uuid4().__str__())


def about():
    """Anagram Master about page"""
    return render_template('about.htm',
                           cache_id=uuid4().__str__())


def redirect_internal(page: str):
    """Redirects *.htm routes to corresponding route if available"""
    if page == 'index':
        return redirect('/', code=302)
    if page == 'about' or page == 'scores' or page == 'game':
        return redirect(f'/{page}', code=302)
    return error_handler(404)
