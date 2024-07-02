#!/usr/bin/python3
""" Contains Anagram Master's API route controllers """
from api.controllers_auxiliary import favicon
from api.controllers_frontend import about, home, gameplay, onboarding, \
                                     html_scores, redirect_internal
from api.controllers_backend import init, status, play, close, scores, api_status

# General/shared routes
general_routes = [
    # favicon: Serves a favicon.ico image for routes that don't specify one
    {'rule': '/favicon.ico', 'view_func': favicon},
]

# API/backend routes
api_routes = [
    # health route: Returns API health status
    {'rule': '/api/v1/', 'view_func': api_status, 'methods': ['GET'],
     'strict_slashes': False},
    {'rule': '/api/v1/health', 'view_func': api_status, 'methods': ['GET'],
     'strict_slashes': False},
    # init route: On-boards a new player
    {'rule': '/api/v1/init', 'view_func': init, 'methods': ['POST'],
     'strict_slashes': False},
    # status route: Returns gameplay info
    {'rule': '/api/v1/status', 'view_func': status, 'methods': ['GET'],
     'strict_slashes': False},
    # play route: Returns gameplay info or triggers player's actions
    {'rule': '/api/v1/play', 'view_func': play, 'methods': ['GET', 'POST'],
     'strict_slashes': False},
    # close route: Off-boards an active player
    {'rule': '/api/v1/close', 'view_func': close,
     'methods': ['POST', 'DELETE'], 'strict_slashes': False},
    # scores route: Returns highscores
    {'rule': '/api/v1/scores', 'view_func': scores, 'methods': ['GET'],
     'strict_slashes': False},
]

# HTML/frontend routes
html_routes = [
    # homepage route: Home/landing page
    {'rule': '/', 'view_func': home},
    {'rule': '/index', 'view_func': home},
    # onboarding route: Player onboarding form
    {'rule': '/onboarding', 'view_func': onboarding, 'strict_slashes': False},
    # gameplay route: Game screen/page
    {'rule': '/game', 'view_func': gameplay, 'strict_slashes': False},
    # scores route: Highscores page
    {'rule': '/scores', 'view_func': html_scores, 'strict_slashes': False},
    # about route: About/info page
    {'rule': '/about', 'view_func': about, 'strict_slashes': False},
    # redirect route: makes above HTML routes accessible with a *.htm extension
    {'rule': '/<page>.htm', 'view_func': redirect_internal},
]
