#!/usr/bin/python3
"""Contains helper functions for Anagram Master's controllers"""
from flask import jsonify, make_response, send_from_directory
from models import Cypher


def get_player_id(req) -> str | None:
    """Reads and decrypts player_id cookie from an HTTP request object"""
    try:
        player_id = req.cookies.get('session')
        if player_id:
            return Cypher.decrypt(player_id)
    except Exception:
        pass


def signed_response(payload, player_id: str):
    """HTTP response object with payload and encrypted player_id cookie"""
    try:
        resp = make_response(payload)
        week = 60 * 60 * 24 * 7
        resp.set_cookie(key='session', value=Cypher.encrypt(player_id),
                        max_age=week, path='/', httponly=True)
        return resp
    except Exception as err:
        return error_handler(500)


def delete_player_id(payload):
    """HTTP response object with payload and signal to remove encrypted
    player_id cookie from the player's device"""
    try:
        resp = make_response(payload)
        resp.delete_cookie(key='session', path='/', httponly=True)
        return resp
    except Exception as err:
        return error_handler(500)


def favicon():
    """Explicitly serves a favicon for routes that don't specify one"""
    return send_from_directory('static/media', 'logo_icon.png',
                               mimetype='image/x-icon')


def error_handler(e):
    """Sends generic messages for common server errors"""
    try:
        code = e if isinstance(e, int) else e.code
    except Exception:
        code = 501
    match code:
        case 400:
            return jsonify({'error': f'{code}: Bad Request'}), code
        case 401:
            return jsonify({'error': f'{code}: Unauthorised'}), code
        case 403:
            return jsonify({'error': f'{code}: Forbidden'}), code
        case 404:
            return jsonify({'error': f'{code}: Not Found'}), code
        case 405:
            return jsonify({'error': f'{code}: Method Not Allowed'}), code
        case 500:
            return jsonify({'error': f'{code}: Internal Server Error'}), code
        case _:
            return jsonify({'error': f'501: Not Implemented [{code}]'}), 501
