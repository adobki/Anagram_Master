#!/usr/bin/env bash
# Prepares local environment for Anagram Master API/server and hosts it

echo "1) Install API package dependencies"
pip install -r requirements.txt || pip3 install -r requirements.txt

echo "2) Run Anagram Master's WSGI server and host it on http://localhost:5555"
python -m am_wsgi_server || python3 -m am_wsgi_server
