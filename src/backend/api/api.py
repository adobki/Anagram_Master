#!/usr/bin/python3
""" Contains Anagram Master's API route controllers """
import load_env  # noqa: F401  (optional .env file; must come before anything reads the environment)
from api.controllers_auxiliary import error_handler
from api.routes import app_routes, api_routes, html_routes, general_routes
from flask import Flask
from os import environ
from werkzeug.exceptions import HTTPException
from werkzeug.middleware.proxy_fix import ProxyFix

app = Flask(__name__)
# Keep dict keys in insertion order: a game's `words` lists rounds in play order.
app.json.sort_keys = False
# Behind a reverse proxy (Render: 1) the player's address is in X-Forwarded-For; the rate limits and the
# tickets page's lock-out need it. Set am_trusted_proxies=0 when the app is reached directly.
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=int(environ.get('am_trusted_proxies', '1') or 0))


# General/shared routes
for route in general_routes:
    app.add_url_rule(**route)


# API/backend routes
for route in api_routes:
    app.add_url_rule(**route)


# Legacy (v1) web pages, under /v1
for route in html_routes:
    app.add_url_rule(**route)


# The web app, at / (registered last: it has a catch-all file route)
for route in app_routes:
    app.add_url_rule(**route)


# Error handlers
app.register_error_handler(HTTPException, f=error_handler)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(environ.get('PORT', 5555)), threaded=True)
