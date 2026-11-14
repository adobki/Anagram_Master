#!/usr/bin/python3
""" Contains Anagram Master's API route controllers """
import load_env  # noqa: F401  (optional .env file; must come before anything reads the environment)
from api.controllers_auxiliary import error_handler
from api.routes import app_routes, api_routes, html_routes, general_routes
from flask import Flask, request
from os import environ
from werkzeug.exceptions import HTTPException
from werkzeug.middleware.proxy_fix import ProxyFix
import logging

# The server's own messages (a ticket was submitted, the email's outcome, a failed admin login) go to the console.
log = logging.getLogger('AnagramMaster')
if not log.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter('%(asctime)s %(levelname)s %(message)s', '%Y-%m-%d %H:%M:%S'))
    log.addHandler(handler)
    log.setLevel(logging.INFO)
    log.propagate = False

# No request may carry a body of 10 MB or more, whatever the endpoint.
MAX_BODY = 10 * 1024 * 1024

app = Flask(__name__)
# Backstop for a body sent without a Content-Length (chunked): Flask answers 413 as soon as the body is read.
app.config['MAX_CONTENT_LENGTH'] = MAX_BODY - 1
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


@app.before_request
def guard_body_size():
    """Turns away an oversized request before any controller (or the body) is touched."""
    if (request.content_length or 0) >= MAX_BODY:
        return error_handler(413)


# Error handlers
app.register_error_handler(HTTPException, f=error_handler)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(environ.get('PORT', 5555)), threaded=True)
