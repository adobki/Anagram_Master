#!/usr/bin/python3
"""Serves the web app (the built front end in src/frontend/dist) at /"""
from os import environ
from pathlib import Path
from flask import send_from_directory

# The production build of src/frontend (`npm run build`). Override with the
# am_frontend_dist environment variable to serve a build from elsewhere.
DIST = Path(environ.get('am_frontend_dist') or
            Path(__file__).resolve().parents[2] / 'frontend' / 'dist')

# Fingerprinted files never change, so browsers may keep them for a year.
# Everything else (index.html, the service worker, the manifest) must be
# revalidated on every load, or players would be stuck on old versions.
YEAR = 60 * 60 * 24 * 365


def app_index():
    """The web app's single page"""
    if not (DIST / 'index.html').is_file():
        return ('The front end has not been built. Run `npm run build` in '
                'src/frontend, or play the classic version at /v1/', 503,
                {'Content-Type': 'text/plain; charset=utf-8'})
    return app_file('index.html')


def app_file(filename: str):
    """A file from the front-end build (scripts, styles, icons, service worker)"""
    immutable = filename.startswith('assets/')
    response = send_from_directory(DIST, filename,
                                   max_age=YEAR if immutable else 0)
    if immutable:
        response.headers['Cache-Control'] = f'public, max-age={YEAR}, immutable'
    else:
        response.headers['Cache-Control'] = 'no-cache'
    return response
