"""Production entry point: serves the Flask app (API, web app and classic pages) with waitress.

Run from this folder with `python -m server`. Listens on $PORT, default 5555.
"""

from api.api import app as am_api
from os import environ
from paste.translogger import TransLogger
from waitress import serve

log_format = (' %(REMOTE_ADDR)s %(REMOTE_USER)s [%(time)s]'
              ' %(REQUEST_METHOD)s "%(REQUEST_URI)s"'
              ' %(status)s %(bytes)s\n')

options = {'application':           am_api,
           'setup_console_handler': False,
           'logger_name':           'AnagramMaster',
           'format':                log_format}

if __name__ == "__main__":
    serve(TransLogger(**options), port=int(environ.get('PORT', 5555)), threads=4, ident='AnagramMaster')
