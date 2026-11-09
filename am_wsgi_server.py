"""Compatibility shim: the server now lives in src/backend.

Keeps `python -m am_wsgi_server` working from the repo root (for example an
existing Render start command). New setups can run it from src/backend.
"""
import runpy
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / 'src' / 'backend'))
runpy.run_module('am_wsgi_server', run_name='__main__')
