#!/usr/bin/env bash
# Builds Anagram Master (API dependencies + web app) and hosts it.
set -e
cd "$(dirname "$0")"

echo "1) Install API package dependencies"
pip install -r backend/requirements.txt || pip3 install -r backend/requirements.txt

echo "2) Build the web app into src/frontend/dist (needs Node.js 20.19+)"
(cd frontend && npm ci && npm run build)

echo "3) Run Anagram Master's WSGI server on http://localhost:5555 (web app at /, classic version at /v1/)"
cd backend
python -m server || python3 -m server
