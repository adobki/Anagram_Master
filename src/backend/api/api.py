#!/usr/bin/python3
""" Contains Anagram Master's API route controllers """
from api.controllers_auxiliary import error_handler
from api.routes import app_routes, api_routes, html_routes, general_routes
from flask import Flask
from werkzeug.exceptions import HTTPException

app = Flask(__name__)


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
    app.run(host='0.0.0.0', port=5555, threaded=True)
