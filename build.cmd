@ECHO off
REM Builds Anagram Master (API dependencies + web app) and hosts it.
cd /d "%~dp0"

echo 1) Install API package dependencies
pip install -r src\backend\requirements.txt || exit /b 1

echo 2) Build the web app into src\frontend\dist (needs Node.js 20.19+)
pushd src\frontend
call npm ci || exit /b 1
call npm run build || exit /b 1
popd

echo 3) Run Anagram Master's WSGI server on http://localhost:5555 (web app at /, classic version at /v1/)
cd src\backend
python -m am_wsgi_server
