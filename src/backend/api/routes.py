#!/usr/bin/python3
""" Contains Anagram Master's API route controllers """
from api.controllers_app import app_file, app_index
from api.controllers_auxiliary import favicon
from api.controllers_frontend import about, home, gameplay, onboarding, \
                                     html_scores, redirect_internal
from api.controllers_backend import init, status, resume, play, close, \
                                    scores, api_status
from api.controllers_feedback import feedback, tickets, ticket_detail, ticket_share, ticket_image, \
                                     own_ticket_json, own_ticket_image, \
                                     shared_ticket_json, shared_ticket_image

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
    # resume route: Sets the session cookie again for a saved game's token
    {'rule': '/api/v1/resume', 'view_func': resume, 'methods': ['POST'],
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
    # feedback route: Receives a feedback form (text and up to 6 images)
    {'rule': '/api/v1/feedback', 'view_func': feedback, 'methods': ['POST'],
     'strict_slashes': False},
    # ticket views for the web app's read-only screens (no login): a ticket
    # shared by the admin, found by its share code...
    {'rule': '/api/v1/feedback/shared/<code>', 'view_func': shared_ticket_json,
     'methods': ['GET']},
    {'rule': '/api/v1/feedback/shared/<code>/<int:n>',
     'view_func': shared_ticket_image, 'methods': ['GET']},
    # ...and a sender's own ticket, found by the token their device keeps
    {'rule': '/api/v1/feedback/<tid>', 'view_func': own_ticket_json,
     'methods': ['GET']},
    {'rule': '/api/v1/feedback/<tid>/<int:n>',
     'view_func': own_ticket_image, 'methods': ['GET']},
]

# Legacy (v1) web pages, kept under /v1. The new web app is served at /.
html_routes = [
    # homepage route: Home/landing page
    {'rule': '/v1/', 'view_func': home},
    {'rule': '/v1/index', 'view_func': home},
    # onboarding route: Player onboarding form
    {'rule': '/v1/onboarding', 'view_func': onboarding, 'strict_slashes': False,
     'methods': ['GET', 'POST']},
    # gameplay route: Game screen/page
    {'rule': '/v1/game', 'view_func': gameplay, 'strict_slashes': False,
     'methods': ['GET', 'POST']},
    # scores route: Highscores page
    {'rule': '/v1/scores', 'view_func': html_scores, 'strict_slashes': False},
    # about route: About/info page
    {'rule': '/v1/about', 'view_func': about, 'strict_slashes': False},
    # tickets routes: Private pages for feedback (they need a login stored in
    # MongoDB). Nobody else reads a ticket here: the web app shows them.
    {'rule': '/v1/tickets', 'view_func': tickets, 'strict_slashes': False},
    {'rule': '/v1/tickets/<ticket_id>', 'view_func': ticket_detail,
     'methods': ['GET', 'POST']},
    {'rule': '/v1/tickets/<ticket_id>/share', 'view_func': ticket_share,
     'methods': ['PUT', 'DELETE']},
    {'rule': '/v1/tickets/<ticket_id>/<int:n>', 'view_func': ticket_image},
    # redirect route: makes above HTML routes accessible with a *.htm extension
    {'rule': '/v1/<page>.htm', 'view_func': redirect_internal},
]

# The web app (src/frontend's production build). More specific rules above
# (/api/v1/..., /v1/..., /static/...) always win over the catch-all file route.
app_routes = [
    {'rule': '/', 'view_func': app_index},
    {'rule': '/<path:filename>', 'view_func': app_file},
]
